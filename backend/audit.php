<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require __DIR__.'/config/bootstrap.php';
$rows = Database::connect()->query('SELECT created_at,request_id,user_id,ip_address,action,http_status
    FROM security_audit ORDER BY id DESC LIMIT 50');
foreach ($rows as $row) {
    echo json_encode($row, JSON_THROW_ON_ERROR).PHP_EOL;
}
