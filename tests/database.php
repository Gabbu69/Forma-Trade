<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') exit;
require __DIR__.'/../backend/config/bootstrap.php';
[$script,$action,$name]=$argv;
if (!preg_match('/^forma_qa_[0-9a-f]{12}$/D',$name)) throw new RuntimeException('Invalid test database name.');
$admin=new PDO('mysql:host=127.0.0.1;port=33317;charset=utf8mb4','root',file_get_contents(ROOT.'/.runtime/db-admin'),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
if ($action==='create') {
    $admin->exec("CREATE DATABASE `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $admin->exec("GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,REFERENCES,INDEX ON `$name`.* TO 'forma_app'@'127.0.0.1'");
} elseif ($action==='remove') {
    $admin->exec("REVOKE ALL PRIVILEGES ON `$name`.* FROM 'forma_app'@'127.0.0.1'");
    $admin->exec("DROP DATABASE `$name`");
}
