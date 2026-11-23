<?php
declare(strict_types=1);

final class Notifications {
    public static function record(PDO $db, int $user, int $group, string $event): void {
        sql($db, 'INSERT INTO account_notifications(user_id,vendor_order_id,event_type) VALUES(?,?,?)', [$user,$group,$event]);
    }

    public static function stockCrossing(PDO $db, array $product, int $stock, int $threshold): void {
        if ($product['stock'] > $product['low_threshold'] && $stock <= $threshold) {
            sql($db, "INSERT INTO account_notifications(user_id,product_id,event_type) VALUES(?,?,'low_stock')",
                [$product['vendor_id'],$product['id']]);
        }
    }

    public static function latestID(PDO $db, int $id): int {
        return (int)sql($db, 'SELECT MAX(id) FROM account_notifications WHERE user_id=?', [$id])->fetchColumn();
    }

    public static function unread(PDO $db, int $id): int {
        return (int)sql($db, 'SELECT COUNT(*) FROM account_notifications WHERE user_id=? AND read_at IS NULL', [$id])->fetchColumn();
    }

    public static function recent(PDO $db, int $id, ?int $before, bool $onlyUnread): array {
        $where = 'WHERE n.user_id=?';
        $args = [$id];
        if ($onlyUnread) $where .= ' AND n.read_at IS NULL';
        if ($before !== null) {
            $where .= ' AND n.id<?';
            $args[] = $before;
        }
        return sql($db, "SELECT n.id,n.event_type,n.created_at,n.read_at,v.order_id,b.name buyer,s.name vendor,p.name product
            FROM account_notifications n LEFT JOIN vendor_orders v ON v.id=n.vendor_order_id
            LEFT JOIN orders o ON o.id=v.order_id LEFT JOIN users b ON b.id=o.buyer_id
            LEFT JOIN users s ON s.id=v.vendor_id LEFT JOIN products p ON p.id=n.product_id
            $where ORDER BY n.id DESC LIMIT 51", $args)->fetchAll();
    }

    public static function delete(PDO $db, int $user, array $body): void {
        if (($body['all'] ?? false) === true) {
            sql($db, 'DELETE FROM account_notifications WHERE user_id=?', [$user]);
            return;
        }
        $id = integer($body['id'] ?? null, 1, PHP_INT_MAX, 'notification reference');
        sql($db, 'DELETE FROM account_notifications WHERE user_id=? AND id=?', [$user,$id]);
    }

    public static function markRead(PDO $db, int $id, array $body): void {
        $through = integer($body['through'] ?? null, 1, PHP_INT_MAX, 'notification reference');
        sql($db, 'UPDATE account_notifications SET read_at=NOW() WHERE user_id=? AND id<=? AND read_at IS NULL', [$id,$through]);
    }
}
