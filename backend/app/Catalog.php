<?php
declare(strict_types=1);
final class Catalog {
    const IMAGES=['keyboard','lamp','mat','stand','mouse','tray'];
    public function __construct(private PDO $db) {}
    public function products(array $filters, ?int $owner=null): array {
        $where=[]; $args=[];
        if ($owner!==null) { $where[]='p.vendor_id=?'; $args[]=$owner; }
        $q=$filters['q']??'';
        if (!is_string($q)||mb_strlen($q)>100) reject(422,'Keep the search under 100 characters.');
        if ($q!=='') { $where[]="(p.name LIKE ? OR u.name LIKE ?)"; array_push($args,"%$q%","%$q%"); }
        foreach (['category'=>'p.category_id','vendor'=>'p.vendor_id','min'=>'p.price >=','max'=>'p.price <=','rating'=>'COALESCE(r.rating,0) >='] as $key=>$column) {
            $v=$filters[$key]??'';
            if ($v==='') continue;
            if (!is_scalar($v)||!is_numeric($v)||(float)$v<0 || (float)$v>99999999) reject(422,'Choose a valid filter value.');
            $where[]=$column.(in_array($key,['category','vendor'],true)?' = ?':' ?'); $args[]=$v;
        }
        if (($filters['stock']??'')==='1') $where[]='p.stock>0';
        $sort=match($filters['sort']??'') {'price'=>'p.price,p.id','high'=>'p.price DESC,p.id','name'=>'p.name,p.id',default=>'p.id'};
        $query="SELECT p.*,u.name vendor,c.name category,r.rating FROM products p JOIN users u ON u.id=p.vendor_id JOIN categories c ON c.id=p.category_id LEFT JOIN (SELECT product_id,ROUND(AVG(stars),1) rating FROM reviews GROUP BY product_id) r ON r.product_id=p.id";
        return sql($this->db,$query.($where?' WHERE '.implode(' AND ',$where):'')." ORDER BY $sort",$args)->fetchAll();
    }
    public function save(int $owner,array $b): int {
        $name=$b['name']??'';
        if (!is_string($name)||trim($name)===''||mb_strlen($name)>100) reject(422,'Enter a product name up to 100 characters.');
        $cat=integer($b['category_id']??null,1,10000,'category');
        if (!sql($this->db,'SELECT id FROM categories WHERE id=?',[$cat])->fetch()) reject(422,'Choose an existing category.');
        $img=$b['image']??''; if (!in_array($img,self::IMAGES,true)) reject(422,'Choose a catalog photo.');
        $args=[trim($name),$cat,$img,integer($b['pack_size']??null,1,9999,'pack size'),moneyValue($b['price']??null),integer($b['stock']??null,0,999999,'stock count'),integer($b['low_threshold']??null,0,999999,'alert threshold')];
        if (!isset($b['id'])) {
            sql($this->db,'INSERT INTO products(name,category_id,image,pack_size,price,stock,low_threshold,vendor_id) VALUES(?,?,?,?,?,?,?,?)',[...$args,$owner]);
            return (int)$this->db->lastInsertId();
        }
        $id=integer($b['id'],1,PHP_INT_MAX,'product');
        $version=integer($b['version']??null,1,PHP_INT_MAX,'version');
        $result=sql($this->db,'UPDATE products SET name=?,category_id=?,image=?,pack_size=?,price=?,stock=?,low_threshold=?,version=version+1 WHERE id=? AND vendor_id=? AND version=?',[...$args,$id,$owner,$version]);
        if (!$result->rowCount()) {
            if (!sql($this->db,'SELECT id FROM products WHERE id=? AND vendor_id=?',[$id,$owner])->fetch()) reject(403,'This product is outside your catalog.');
            reject(409,'Inventory changed. Reopen this product to see its latest stock.');
        }
        return $id;
    }
}
