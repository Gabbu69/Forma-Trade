<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') exit;
require __DIR__.'/bootstrap.php';
$env=parse_ini_file(ROOT.'/.env',false,INI_SCANNER_RAW);
$admin=file_get_contents(ROOT.'/.runtime/db-admin');
$db=new PDO('mysql:host=127.0.0.1;port=33317;charset=utf8mb4','root',$admin,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
if (($env['DB_NAME']??'')!=='forma_supply'||$env['DB_USER']!=='forma_app') throw new RuntimeException('Use the generated configuration with the private demo instance.');
$db->exec('CREATE DATABASE IF NOT EXISTS forma_supply CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$q=$db->prepare("CREATE USER IF NOT EXISTS 'forma_app'@'127.0.0.1' IDENTIFIED BY ?"); $q->execute([$env['DB_PASSWORD']]);
$db->exec("GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,REFERENCES,INDEX ON forma_supply.* TO 'forma_app'@'127.0.0.1'");
