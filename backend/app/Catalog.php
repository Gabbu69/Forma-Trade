<?php
declare(strict_types=1);
final class Catalog {
    const IMAGES=['keyboard','lamp','mat','stand','mouse','tray',
        'riser','pen-cup','organizer','bookends','hub','webcam','keypad','speakers','light-bar','clamp','portable','led-strip'];
    public function __construct(private PDO $db) {}
    public function products(array $filters, ?int $owner=null): array {
        $where=['NOT EXISTS (SELECT 1 FROM retired_products r WHERE r.product_id=p.id)']; $args=[];
        if ($owner!==null) { $where[]='p.vendor_id=?'; $args[]=$owner; }
        $q=$filters['q']??'';
        if (!is_string($q)||mb_strlen($q)>100) reject(422,'Keep the search under 100 characters.');
        if ($q!=='') { $where[]="(p.name LIKE ? OR u.name LIKE ?)"; array_push($args,"%$q%","%$q%"); }
        foreach (['category'=>'p.category_id','vendor'=>'p.vendor_id','min'=>'p.price >=','max'=>'p.price <=','rating'=>'COALESCE(r.rating,0) >='] as $key=>$column) {
            $v=$filters[$key]??'';
            if ($v==='') continue;
            if ($key === 'rating' && (!is_numeric($v) || (float)$v < 0 || (float)$v > 5)) {
                reject(422, 'Minimum rating must be between 0 and 5 stars.');
            }
            if (!is_scalar($v)||!is_numeric($v)||(float)$v<0 || (float)$v>99999999) reject(422,'Choose a valid filter value.');
            $where[]=$column.(in_array($key,['category','vendor'],true)?' = ?':' ?'); $args[]=$v;
        }
        $min = $filters['min'] ?? '';
        $max = $filters['max'] ?? '';
        if ($min !== '' && $max !== '' && (float)$min > (float)$max) {
            reject(422, 'Minimum price must be at or below maximum price.');
        }
        if (($filters['stock']??'')==='1') $where[]='p.stock>0';
        $sort=match($filters['sort']??'') {'price'=>'p.price,p.id','high'=>'p.price DESC,p.id','name'=>'p.name,p.id',default=>'p.id'};
        $query="SELECT p.*,u.name vendor,c.name category,r.rating, (SELECT GROUP_CONCAT(photo_key ORDER BY position) FROM product_photos WHERE product_id=p.id) photo_keys FROM products p JOIN users u ON u.id=p.vendor_id JOIN categories c ON c.id=p.category_id LEFT JOIN (SELECT product_id,ROUND(AVG(stars),1) rating FROM reviews GROUP BY product_id) r ON r.product_id=p.id";
        $products = sql($this->db,$query.($where?' WHERE '.implode(' AND ',$where):'')." ORDER BY $sort",$args)->fetchAll();
        foreach ($products as &$product) {
            $cover = $product['image'];
            $photoKeys = $product['photo_keys'];
            unset($product['photo_keys']);
            $product['uploaded_photos'] = $photoKeys !== null;
            $product['images'] = $photoKeys === null ? [$cover, $cover.'-detail', $cover.'-workspace'] : explode(',', $photoKeys);
            $product['image'] = $product['images'][0];
        }
        return $products;
    }

    private function lockOwnedProduct(int $id, int $owner, int $version): array {
        $product = sql($this->db, 'SELECT * FROM products WHERE id=? AND vendor_id=? FOR UPDATE', [$id,$owner])->fetch();
        if (!$product) reject(403,'This product is outside your catalog.');
        if (sql($this->db, 'SELECT product_id FROM retired_products WHERE product_id=? FOR UPDATE', [$id])->fetch()) {
            reject(404,'This product has already been deleted.');
        }
        if ((int)$product['version'] !== $version) reject(409,'Inventory changed. Reopen this product to see its latest stock.');
        return $product;
    }

    public function delete(int $owner, array $body): void {
        $id = integer($body['id']??null,1,PHP_INT_MAX,'product');
        $version = integer($body['version']??null,1,PHP_INT_MAX,'version');
        $this->db->beginTransaction();
        try {
            $this->lockOwnedProduct($id, $owner, $version);
            sql($this->db, 'INSERT INTO retired_products(product_id) VALUES(?)', [$id]);
            sql($this->db, 'DELETE FROM product_photos WHERE product_id=?', [$id]);
            $this->db->commit();
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function save(int $owner, array $b, array $photos = []): int {
        $name = $b['name']??'';
        if (!is_string($name) || trim($name)==='' || mb_strlen($name)>100) reject(422,'Enter a product name up to 100 characters.');
        $category = integer($b['category_id']??null,1,10000,'category');
        if (!sql($this->db,'SELECT id FROM categories WHERE id=?',[$category])->fetch()) reject(422,'Choose an existing category.');
        $values = [
            trim($name), $category,
            integer($b['pack_size']??null,1,9999,'pack size'),
            moneyValue($b['price']??null),
            integer($b['stock']??null,0,999999,'stock count'),
            integer($b['low_threshold']??null,0,999999,'alert threshold'),
        ];

        $this->db->beginTransaction();
        try {
            $existing = null;
            if (isset($b['id'])) {
                $id = integer($b['id'],1,PHP_INT_MAX,'product');
                $version = integer($b['version']??null,1,PHP_INT_MAX,'version');
                $existing = $this->lockOwnedProduct($id, $owner, $version);
            }
            $cover = $photos ? '' : ($b['image'] ?? $existing['image'] ?? '');
            if (!$photos && !in_array($cover, self::IMAGES, true)) {
                // An edit may round-trip its current uploaded cover through the JSON API.
                $uploaded = $existing ? sql($this->db, 'SELECT photo_key FROM product_photos WHERE product_id=? AND position=1', [$id])->fetchColumn() : false;
                if (!$uploaded || ($cover !== '' && $cover !== $uploaded)) reject(422,'Upload a product photo.');
                $cover = '';
            }
            if ($existing) {
                sql($this->db, 'UPDATE products SET name=?,category_id=?,pack_size=?,price=?,stock=?,low_threshold=?,image=?,version=version+1 WHERE id=?', [...$values,$cover,$id]);
                Notifications::stockCrossing($this->db, $existing, $values[4], $values[5]);
                if ($photos || $cover !== '') sql($this->db, 'DELETE FROM product_photos WHERE product_id=?', [$id]);
            } else {
                sql($this->db, 'INSERT INTO products(name,category_id,pack_size,price,stock,low_threshold,image,vendor_id) VALUES(?,?,?,?,?,?,?,?)', [...$values,$cover,$owner]);
                $id = (int)$this->db->lastInsertId();
            }
            foreach ($photos as $position=>$image) {
                sql($this->db, 'INSERT INTO product_photos(photo_key,product_id,position,image_bytes) VALUES(?,?,?,?)',
                    [bin2hex(random_bytes(16)),$id,$position+1,$image]);
            }
            $this->db->commit();
            return $id;
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }
}
