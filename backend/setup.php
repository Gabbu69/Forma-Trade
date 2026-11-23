<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit;
require __DIR__.'/config/bootstrap.php';
$db=Database::connect();
$db->exec(file_get_contents(__DIR__.'/config/schema.sql'));
if ((int)$db->query("SELECT GET_LOCK(CONCAT(DATABASE(), ':setup'), 20)")->fetchColumn()!==1) throw new RuntimeException('Another setup is running.');
$db->beginTransaction();
try {
    if (!(int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn()) {
        foreach ([['north','North Retail','buyer'],['bay','Bay Retail','buyer'],['form','Form Studio','vendor'],['field','Field Objects','vendor']] as $index=>[$login,$name,$role])
            sql($db,'INSERT INTO users(id,email,password_hash,name,role) VALUES(?,?,?,?,?)',[$index+1,$login.'@forma.test',password_hash('FormaDemo24!',PASSWORD_BCRYPT),$name,$role]);
        $db->exec(file_get_contents(ROOT.'/database_seed.sql'));
    }
    $db->commit();
} catch(Throwable $e) { $db->rollBack(); throw $e; }
echo "Database connection and demo catalog verified.\n";
