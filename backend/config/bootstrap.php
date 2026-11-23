<?php
declare(strict_types=1);
const ROOT = __DIR__ . '/../..';
date_default_timezone_set('Asia/Manila');
final class Database {
    public static function connect(): PDO {
        $env = parse_ini_file(getenv('FORMA_ENV_FILE') ?: ROOT.'/.env', false, INI_SCANNER_RAW);
        if (!$env) throw new RuntimeException('Run the local setup first.');
        $db = new PDO("mysql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_NAME']};charset=utf8mb4",
            $env['DB_USER'], $env['DB_PASSWORD'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES=>false, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
        $db->exec("SET time_zone = '+08:00'");
        return $db;
    }
}
final class Problem extends RuntimeException {
    public function __construct(public readonly int $status, string $message) { parent::__construct($message); }
}
function reject(int $status, string $message): never { throw new Problem($status, $message); }
function sql(PDO $db, string $statement, array $params=[]): PDOStatement {
    $query=$db->prepare($statement); $query->execute($params); return $query;
}
function integer(mixed $value, int $min, int $max, string $label): int {
    if (!is_scalar($value) || filter_var($value,FILTER_VALIDATE_INT)===false || (int)$value<$min || (int)$value>$max)
        reject(422,"Enter a valid $label ($min–$max).");
    return (int)$value;
}
function moneyValue(mixed $value): string {
    if (!is_scalar($value) || !preg_match('/^\d{1,8}(\.\d{1,2})?$/D',(string)$value) || (float)$value<=0) reject(422,'Enter a positive pack price with up to two decimal places.');
    return number_format((float)$value,2,'.','');
}
function h(mixed $value): string { return htmlspecialchars((string)$value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8'); }
