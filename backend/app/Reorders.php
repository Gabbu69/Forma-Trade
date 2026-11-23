<?php
declare(strict_types=1);

final class Reorders {
    public function __construct(private PDO $db) {}

    private function lines(int $buyer, int $order): array {
        $rows = sql($this->db, '
            SELECT l.id line_id, l.product_id, v.vendor_id, u.name vendor,
                   l.title previous_name, l.quantity previous_quantity,
                   l.unit_price previous_price, l.pack_size previous_pack,
                   p.name, p.price, p.pack_size, p.stock
            FROM orders o
            JOIN vendor_orders v ON v.order_id = o.id
            JOIN users u ON u.id = v.vendor_id
            JOIN order_lines l ON l.vendor_order_id = v.id
            LEFT JOIN products p ON p.id = l.product_id AND p.vendor_id = v.vendor_id
              AND NOT EXISTS (SELECT 1 FROM retired_products r WHERE r.product_id = p.id)
            WHERE o.id = ? AND o.buyer_id = ?
            ORDER BY v.id, l.id', [$order, $buyer])->fetchAll();
        if (!$rows) reject(404, 'This purchase order is unavailable.');
        foreach ($rows as &$line) {
            $entry = $_SESSION['cart'][$line['product_id']] ?? [];
            $line['cart_quantity'] = $entry['quantity'] ?? 0;
            $line['cart_price'] = $entry['price'] ?? null;
            $line['cart_pack'] = $entry['quoted_pack'] ?? null;
            $line['maximum'] = max(0, min(9999, (int)$line['stock']) - $line['cart_quantity']);
        }
        return $rows;
    }

    private function terms(array $line): array {
        return array_intersect_key($line, array_flip(['price','pack_size','stock','cart_quantity','cart_price','cart_pack']));
    }

    private function review(int $order, array $lines, ?array $selection = null, array $changes = []): array {
        $token = bin2hex(random_bytes(16));
        $snapshot = [];
        foreach ($lines as &$line) {
            $id = $line['line_id'];
            $snapshot[$id] = $this->terms($line);
            $requested = $selection === null ? $line['previous_quantity'] : ($selection[$id] ?? 0);
            $line['suggested'] = min($requested, $line['maximum']);
            $line['changes'] = $changes[$id] ?? [];
        }
        // Evicted tokens expire closed, so an old retry cannot add packs twice.
        $reviews = $_SESSION['reorders'] ?? [];
        $reviews[$token] = ['order'=>$order, 'terms'=>$snapshot];
        $_SESSION['reorders'] = array_slice($reviews, -32, null, true);
        return ['order_id'=>$order, 'token'=>$token, 'lines'=>$lines];
    }

    public function preview(int $buyer, int $order): array {
        return $this->review($order, $this->lines($buyer, $order));
    }

    public function confirm(int $buyer, int $order, array $body): array {
        $lines = $this->lines($buyer, $order);
        $byId = array_column($lines, null, 'line_id');
        $items = $body['items'] ?? null;
        $token = $body['token'] ?? null;
        if (!is_string($token) || !preg_match('/^[a-f0-9]{32}$/D', $token)) reject(422, 'Invalid review reference.');
        if (!is_array($items) || !array_is_list($items) || !$items) reject(422, 'Select at least one pack.');
        $selection = [];
        foreach ($items as $item) {
            if (!is_array($item) || !is_int($item['line_id'] ?? null) || !is_int($item['quantity'] ?? null)) reject(422, 'Select whole packs from this order.');
            $id = $item['line_id'];
            if (!isset($byId[$id]) || isset($selection[$id])) reject(422, 'Select each original order line only once.');
            $selection[$id] = integer($item['quantity'], 1, 9999, 'pack quantity');
        }
        ksort($selection, SORT_NUMERIC);
        $saved = $_SESSION['reorders'][$token] ?? [];
        if (($saved['order'] ?? null) !== $order) reject(409, 'This review expired. Close it and choose Buy Again to see current terms.');
        if (isset($saved['confirmed'])) {
            if ($saved['confirmed'] !== $selection) reject(409, 'This review was already confirmed. Open your cart to see the added packs.');
            return ['added'=>array_sum($selection)];
        }

        $changes = [];
        $cart = $_SESSION['cart'] ?? [];
        foreach ($selection as $id=>$quantity) {
            $line = $byId[$id];
            $old = $saved['terms'][$id] ?? [];
            foreach ($this->terms($line) as $field=>$value) {
                if (($old[$field] ?? null) !== $value) $changes[$id][] = $field;
            }
            if ($quantity > $line['maximum']) $changes[$id][] = 'maximum';
            $cart[$line['product_id']] = [
                'quantity'=>$line['cart_quantity'] + $quantity,
                'price'=>$line['price'], 'quoted_pack'=>$line['pack_size']
            ];
        }
        if ($changes) {
            unset($_SESSION['reorders'][$token]);
            return ['error'=>'Availability or pack terms changed. Review the highlighted items and confirm again.',
                    'review'=>$this->review($order, $lines, $selection, $changes)];
        }
        // The session lock serializes the batch and its retry receipt with other cart writes.
        $checkoutKey = bin2hex(random_bytes(16));
        $_SESSION['cart'] = $cart;
        $_SESSION['key'] = $checkoutKey;
        $_SESSION['reorders'][$token] = ['order'=>$order, 'confirmed'=>$selection];
        return ['added'=>array_sum($selection)];
    }
}
