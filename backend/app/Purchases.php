<?php
declare(strict_types=1);
final class Purchases {
    public function __construct(private PDO $db) {}
    public function cart(): array {
        $_SESSION['cart']??=[]; $_SESSION['key']??=bin2hex(random_bytes(16));
        $rows=[];
        foreach ($_SESSION['cart'] as $id=>$entry) {
            $p=sql($this->db,'SELECT p.id,p.name,p.pack_size,COALESCE(ph.photo_key,p.image) image,p.stock,u.name vendor,p.vendor_id FROM products p JOIN users u ON u.id=p.vendor_id LEFT JOIN product_photos ph ON ph.product_id=p.id AND ph.position=1 WHERE p.id=? AND NOT EXISTS (SELECT 1 FROM retired_products r WHERE r.product_id=p.id)',[$id])->fetch();
            if ($p) {
                $rows[]=$p+$entry;
            } else {
                unset($_SESSION['cart'][$id]);
                $_SESSION['key'] = bin2hex(random_bytes(16));
            }
        }
        return ['items'=>$rows,'key'=>$_SESSION['key']];
    }
    public function update(array $body): array {
        $id=integer($body['id']??null,1,PHP_INT_MAX,'product');
        if (array_key_exists('delta',$body)) {
            if (array_key_exists('quantity',$body)) reject(422,'Send one quantity adjustment.');
            $delta=integer($body['delta'],-9999,9999,'pack adjustment');
            $qty=integer(($_SESSION['cart'][$id]['quantity']??0)+$delta,0,9999,'total pack quantity');
        } else {
            $qty=integer($body['quantity']??null,0,9999,'quantity');
        }
        if ($qty===0) unset($_SESSION['cart'][$id]);
        else {
            $p=sql($this->db,'SELECT price,stock,pack_size FROM products p WHERE id=? AND NOT EXISTS (SELECT 1 FROM retired_products r WHERE r.product_id=p.id)',[$id])->fetch();
            if (!$p) reject(404,'Product unavailable.');
            if ($qty>$p['stock']) reject(409,'Only '.$p['stock'].' packs are available.');
            $_SESSION['cart'][$id]=['quantity'=>$qty,'price'=>$_SESSION['cart'][$id]['price']??$p['price'],'quoted_pack'=>$_SESSION['cart'][$id]['quoted_pack']??$p['pack_size']];
        }
        $_SESSION['key']=bin2hex(random_bytes(16));
        return $this->cart();
    }
    public function checkout(int $buyer,array $body): int {
        $key=$body['key']??'';
        if (!is_string($key)||!preg_match('/^[a-f0-9]{32}$/D',$key)) reject(422,'Invalid checkout reference.');
        $known=sql($this->db,'SELECT id FROM orders WHERE buyer_id=? AND request_key=?',[$buyer,$key])->fetchColumn();
        if ($known) return (int)$known;
        if ($key!==($_SESSION['key']??null)||empty($_SESSION['cart'])) reject(409,'Review your current cart before placing the order.');
        $cart=$_SESSION['cart']; ksort($cart,SORT_NUMERIC);
        $this->db->beginTransaction();
        try {
            $lines=[]; $changed=false;
            foreach ($cart as $id=>$entry) {
                $p=sql($this->db,'SELECT * FROM products WHERE id=? FOR UPDATE',[$id])->fetch();
                if (!$p || sql($this->db, 'SELECT product_id FROM retired_products WHERE product_id=? FOR UPDATE', [$id])->fetch()) {
                    reject(409,'An item is unavailable. Review the cart.');
                }
                if ($entry['price']!==$p['price'] || (int)$entry['quoted_pack']!==(int)$p['pack_size']) {
                    $_SESSION['cart'][$id]['price']=$p['price']; $_SESSION['cart'][$id]['quoted_pack']=$p['pack_size']; $changed=true;
                }
                if ($entry['quantity']>$p['stock']) reject(409,$p['name'].' has only '.$p['stock'].' packs available. Update the cart.');
                $lines[]=$p+['quantity'=>$entry['quantity']];
            }
            if ($changed) { $_SESSION['key']=bin2hex(random_bytes(16)); reject(409,'A pack price or pack size changed. Review the updated cart before confirming.'); }
            sql($this->db,'INSERT INTO orders(buyer_id,request_key) VALUES(?,?)',[$buyer,$key]);
            $order=(int)$this->db->lastInsertId(); $groups=[];
            foreach ($lines as $p) {
                $vendor=$p['vendor_id'];
                if (!isset($groups[$vendor])) {
                    sql($this->db,'INSERT INTO vendor_orders(order_id,vendor_id) VALUES(?,?)',[$order,$vendor]);
                    $groups[$vendor]=(int)$this->db->lastInsertId();
                    Notifications::record($this->db, $vendor, $groups[$vendor], 'new_order');
                }
                sql($this->db,'INSERT INTO order_lines(vendor_order_id,product_id,title,pack_size,unit_price,quantity) VALUES(?,?,?,?,?,?)',[$groups[$vendor],$p['id'],$p['name'],$p['pack_size'],$p['price'],$p['quantity']]);
                sql($this->db,'UPDATE products SET stock=stock-?,version=version+1 WHERE id=?',[$p['quantity'],$p['id']]);
            }
            $this->db->commit();
            $_SESSION['cart']=[]; unset($_SESSION['key']);
            return $order;
        } catch(Throwable $e) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $e; }
    }
    public function rate(int $buyer, array $body): int {
        $line = integer($body['line_id'] ?? null, 1, PHP_INT_MAX, 'order item');
        $stars = integer($body['stars'] ?? null, 1, 5, 'star rating');
        $item = sql($this->db, 'SELECT l.product_id, v.status FROM order_lines l
            JOIN vendor_orders v ON v.id=l.vendor_order_id
            JOIN orders o ON o.id=v.order_id WHERE l.id=? AND o.buyer_id=?', [$line,$buyer])->fetch();
        if (!$item) reject(404,'This purchase item is unavailable.');
        if ($item['status'] !== 'fulfilled') reject(409,'You can rate this item once the order is complete.');
        sql($this->db, 'INSERT INTO reviews(product_id,buyer_id,stars) VALUES(?,?,?)
            ON DUPLICATE KEY UPDATE stars=?', [$item['product_id'],$buyer,$stars,$stars]);
        return $stars;
    }
    public function history(array $user): array {
        $owner=$user['role']==='buyer'?'o.buyer_id':'v.vendor_id';
        $rating = $user['role']==='buyer'
            ? ',l.id line_id,l.product_id,(SELECT stars FROM reviews WHERE product_id=l.product_id AND buyer_id=o.buyer_id) stars'
            : '';
        return sql($this->db,"SELECT o.id order_id,o.created_at,v.id group_id,v.status,v.fulfilled_at,b.name buyer,s.name vendor,l.title,l.unit_price,l.pack_size,l.quantity $rating FROM orders o JOIN vendor_orders v ON v.order_id=o.id JOIN users b ON b.id=o.buyer_id JOIN users s ON s.id=v.vendor_id JOIN order_lines l ON l.vendor_order_id=v.id WHERE $owner=? ORDER BY o.id DESC,v.id,l.id",[$user['id']])->fetchAll();
    }
    public function advance(int $vendor,array $body): void {
        $id=integer($body['id']??null,1,PHP_INT_MAX,'order'); $next=$body['status']??'';
        $from=match($next){'processing'=>'received','fulfilled'=>'processing',default=>reject(422,'Choose a valid order status.')};
        $this->db->beginTransaction();
        try {
            $q=sql($this->db,"UPDATE vendor_orders SET status=?,fulfilled_at=IF(?='fulfilled',NOW(),NULL) WHERE id=? AND vendor_id=? AND status=?",[$next,$next,$id,$vendor,$from]);
            if (!$q->rowCount()) {
                if (!sql($this->db,'SELECT id FROM vendor_orders WHERE id=? AND vendor_id=?',[$id,$vendor])->fetch()) reject(403,'This order is outside your workspace.');
                reject(409,'The order status has changed. Refresh the order.');
            }
            $buyer = (int)sql($this->db, 'SELECT o.buyer_id FROM vendor_orders v JOIN orders o ON o.id=v.order_id WHERE v.id=?', [$id])->fetchColumn();
            Notifications::record($this->db, $buyer, $id, $next);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }
    public function sales(int $vendor,string $period): array {
        $monthly=$period==='month'; $fmt=$monthly?'%Y-%m':'%Y-%m-%d';
        $start=new DateTimeImmutable($monthly?'first day of this month':'today');
        $start=$start->modify($monthly?'-5 months':'-6 days');
        $rows=sql($this->db,"SELECT DATE_FORMAT(v.fulfilled_at,?) bucket,SUM(l.unit_price*l.quantity) amount FROM vendor_orders v JOIN order_lines l ON l.vendor_order_id=v.id WHERE v.vendor_id=? AND v.status='fulfilled' AND v.fulfilled_at>=? GROUP BY bucket",[$fmt,$vendor,$start->format('Y-m-d')])->fetchAll();
        $values=array_column($rows,'amount','bucket'); $result=[];
        for($i=0;$i<($monthly?6:7);$i++){
            $d=$start->modify("+$i ".($monthly?'months':'days')); $k=$d->format($monthly?'Y-m':'Y-m-d');
            $result[]=['date'=>$k,'label'=>$d->format($monthly?'M Y':'M j'),'amount'=>(float)($values[$k]??0)];
        }
        return $result;
    }
}
