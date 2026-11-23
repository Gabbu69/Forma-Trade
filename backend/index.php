<?php
declare(strict_types=1);
require __DIR__.'/config/bootstrap.php';
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH)??'/';
if (str_starts_with($path,'/static/')) {
    $root=realpath(ROOT.'/static');
    $file=realpath(ROOT.rawurldecode($path));
    $types=['js'=>'text/javascript','css'=>'text/css','webp'=>'image/webp','svg'=>'image/svg+xml','woff2'=>'font/woff2'];
    $type=$file?$types[pathinfo($file,PATHINFO_EXTENSION)]??null:null;
    if (!$file||!str_starts_with($file,$root.DIRECTORY_SEPARATOR)||!$type||!is_file($file)) { http_response_code(404); exit; }
    header("Content-Type: $type"); header('X-Content-Type-Options: nosniff'); readfile($file); exit;
}
require __DIR__.'/app/Access.php';
require __DIR__.'/app/Catalog.php';
require __DIR__.'/app/ProductPhotos.php';
require __DIR__.'/app/Purchases.php';
require __DIR__.'/app/Reorders.php';
if (preg_match('#^/media/products/([0-9a-f]{32})$#D', $path, $photo)) {
    if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'], true)) { http_response_code(405); exit; }
    $bytes = sql(Database::connect(), 'SELECT image_bytes FROM product_photos WHERE photo_key=?', [$photo[1]])->fetchColumn();
    if ($bytes === false) { http_response_code(404); exit; }
    header('Content-Type: image/webp');
    header('X-Content-Type-Options: nosniff');
    header('Content-Length: '.strlen($bytes));
    header('Cache-Control: no-cache');
    if ($_SERVER['REQUEST_METHOD'] === 'GET') echo $bytes;
    exit;
}
Access::start();
header('X-Forma-Application: marketplace');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: same-origin');
$api=str_starts_with($path,'/api/');
function jsonOut(mixed $data): never { header('Content-Type: application/json; charset=utf-8'); echo json_encode($data,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE); exit; }
try {
    $db=Database::connect(); $catalog=new Catalog($db); $purchases=new Purchases($db);
    if ($api) {
        $method=$_SERVER['REQUEST_METHOD']; $body=[];
        $routes=['/api/catalog'=>['GET',null],'/api/login'=>['POST',null],'/api/logout'=>['POST',null],
            '/api/cart'=>['GET,POST','shopping'],'/api/checkout'=>['POST','buyer'],'/api/orders'=>['GET','buyer'],'/api/orders/rating'=>['POST','buyer'],
            '/api/vendor/products'=>['GET,POST,DELETE','vendor'],'/api/vendor/orders'=>['GET,POST','vendor'],'/api/vendor/sales'=>['GET','vendor'],'/api/vendor/sales/export'=>['GET','vendor']];
        $reorderRoute = preg_match('#^/api/orders/([1-9][0-9]{0,9})/reorder$#D', $path, $match);
        if ($reorderRoute) $routes[$path] = ['GET,POST','buyer'];
        [$methods,$role]=$routes[$path]??reject(404,'Endpoint unavailable.');
        if (!in_array($method,explode(',',$methods),true)) reject(405,'Unsupported request method.');
        if ($role==='shopping' && isset($_SESSION['user'])) Access::role('buyer');
        elseif (in_array($role,['buyer','vendor'],true)) Access::role($role);
        if ($method !== 'GET') Access::csrf();
        $multipart = $method === 'POST' && $path === '/api/vendor/products'
            && str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data;');
        if ($multipart) {
            if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 7 * 1024 * 1024 || (!$_POST && !$_FILES)) {
                reject(413,'The upload is too large. Use up to three photos at 2 MB each.');
            }
            $body = $_POST;
        } elseif ($method !== 'GET') {
            $input=file_get_contents('php://input',false,null,0,32769);
            if (strlen($input)>32768) reject(413,'Request too large.');
            $body=json_decode($input,true);
            if (!is_array($body)) reject(422,'Send a JSON object.');
        }
        $user=$_SESSION['user']??null;
        if ($reorderRoute) {
            $reorders = new Reorders($db);
            $order = (int)$match[1];
            if ($method === 'GET') jsonOut($reorders->preview($user['id'], $order));
            $result = $reorders->confirm($user['id'], $order, $body);
            if (isset($result['error'])) http_response_code(409);
            jsonOut($result);
        }
        switch ($path) {
            case '/api/catalog': jsonOut($catalog->products($_GET));
            case '/api/login': jsonOut(Access::login($db,$body));
            case '/api/logout': $_SESSION=[]; session_destroy(); jsonOut(['ok'=>true]);
            case '/api/cart': jsonOut($method==='POST'?$purchases->update($body):$purchases->cart());
            case '/api/checkout': jsonOut(['order_id'=>$purchases->checkout($user['id'],$body)]);
            case '/api/orders/rating': jsonOut(['stars'=>$purchases->rate($user['id'],$body)]);
            case '/api/orders': jsonOut($purchases->history($user));
            case '/api/vendor/products':
                if ($method === 'POST') {
                    $photos = $multipart ? ProductPhotos::uploads($_FILES['photos'] ?? null) : [];
                    jsonOut(['id'=>$catalog->save($user['id'], $body, $photos)]);
                }
                if ($method === 'DELETE') {
                    $catalog->delete($user['id'], $body);
                    jsonOut(['ok'=>true]);
                }
                jsonOut($catalog->products([], $user['id']));
            case '/api/vendor/orders': if ($method==='POST') $purchases->advance($user['id'],$body); jsonOut($purchases->history($user));
            case '/api/vendor/sales':
            case '/api/vendor/sales/export':
                $period=$_GET['period']??'day';
                if (!in_array($period,['day','month'],true)) reject(422,'Choose the daily or monthly sales period.');
                $rows=$purchases->sales($user['id'],$period);
                if ($path==='/api/vendor/sales') jsonOut($rows);
                header('Content-Type: text/csv; charset=utf-8');
                header('Content-Disposition: attachment; filename="forma-sales-'.$period.'.csv"');
                $output=fopen('php://output','w');
                fputcsv($output,['period','sales_php'],',','"','');
                foreach ($rows as $row) fputcsv($output,[$row['date'],number_format($row['amount'],2,'.','')],',','"','');
                fclose($output);
                exit;
        }
    }
    if ($_SERVER['REQUEST_METHOD']!=='GET') reject(405,'Unsupported request method.');
    $page=match($path){'/'=>'catalog','/cart'=>'cart','/orders'=>'orders','/vendor'=>'vendor','/login'=>'login',default=>reject(404,'Page unavailable.')};
    $user=$_SESSION['user']??null;
    if ($page==='catalog' && ($user['role']??'')==='vendor') { header('Location: /vendor');exit; }
    if ($page==='vendor') Access::role('vendor');
    if ($page==='orders'||($page==='cart'&&$user)) Access::role('buyer');
    $categories=sql($db,'SELECT id,name FROM categories ORDER BY id')->fetchAll();
    $vendors=sql($db,"SELECT id,name FROM users WHERE role='vendor' ORDER BY name")->fetchAll();
    $count=array_sum(array_column($_SESSION['cart']??[],'quantity'));
    require ROOT.'/templates/layout.php';
} catch(Throwable $e) {
    $status=$e instanceof Problem?$e->status:500;
    if ($status===500) error_log($e->getMessage());
    $message=$status===500?'The workspace could not complete this request. Please try again.':$e->getMessage();
    if (!$api&&$status===401) { header('Location: /login?next='.urlencode($path));exit; }
    http_response_code($status);
    if ($api) jsonOut(['error'=>$message]);
    $page='error'; $user=$_SESSION['user']??null; $count=array_sum(array_column($_SESSION['cart']??[],'quantity'));
    require ROOT.'/templates/layout.php';
}
