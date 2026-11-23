<?php
declare(strict_types=1);

final class Account {
    private static function displayName(mixed $name): string {
        if (!is_string($name)) reject(422, 'Enter a display name.');
        $name = trim($name);
        if (!preg_match('/\A(?=.*\S)[^\p{Cc}]{1,100}\z/us', $name)) {
            reject(422, 'Enter a display name between 1 and 100 characters.');
        }

        return $name;
    }

    public static function register(PDO $db, array $body): array {
        if (isset($_SESSION['user'])) reject(409, 'Sign out before creating another account.');
        $name = self::displayName($body['name'] ?? null);
        $email = $body['email'] ?? null;
        if (!is_string($email) || strlen($email) > 160 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            reject(422, 'Enter a valid email address.');
        }
        $role = $body['role'] ?? 'buyer';
        if (!in_array($role, ['buyer','vendor'], true)) reject(422, 'Choose Buyer or Vendor.');
        $password = self::newPassword($body);
        try {
            sql($db, 'INSERT INTO users(email,password_hash,name,role) VALUES(?,?,?,?)',
                [$email,password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),$name,$role]);
        } catch (PDOException $error) {
            if (($error->errorInfo[1] ?? null) === 1062) reject(409, 'An account already uses that email. Try signing in.');
            throw $error;
        }
        return Access::login($db, ['email'=>$email,'password'=>$password]);
    }

    public static function rename(PDO $db, int $id, array $body): array {
        $name = self::displayName($body['name'] ?? null);
        sql($db, 'UPDATE users SET name=? WHERE id=?', [$name, $id]);
        return ['name' => $name];
    }

    public static function savePhoto(PDO $db, int $id, ?array $file): string {
        if (!is_array($file['error'] ?? null) || count($file['error']) !== 1) {
            reject(422, 'Choose one profile photo.');
        }
        $photo = ProductPhotos::uploads($file, 320)[0] ?? reject(422, 'Choose one profile photo.');
        $key = bin2hex(random_bytes(16));
        sql($db, 'INSERT INTO account_photos(user_id,photo_key,image_bytes) VALUES(?,?,?)
            ON DUPLICATE KEY UPDATE photo_key=?,image_bytes=?', [$id,$key,$photo,$key,$photo]);
        return '/media/account/photo/'.$key;
    }

    public static function activity(PDO $db, array $user): array {
        $id = $user['id'];
        if ($user['role'] === 'vendor') {
            return [
                'Active listings' => sql($db, 'SELECT COUNT(*) FROM products p WHERE p.vendor_id=?
                    AND NOT EXISTS (SELECT 1 FROM retired_products r WHERE r.product_id=p.id)', [$id])->fetchColumn(),
                'Open supplier orders' => sql($db, "SELECT COUNT(*) FROM vendor_orders WHERE vendor_id=? AND status<>'fulfilled'", [$id])->fetchColumn(),
            ];
        }
        return [
            'Purchase orders' => sql($db, 'SELECT COUNT(*) FROM orders WHERE buyer_id=?', [$id])->fetchColumn(),
            'Completed shipments' => sql($db, "SELECT COUNT(*) FROM vendor_orders v JOIN orders o ON o.id=v.order_id
                WHERE o.buyer_id=? AND v.status='fulfilled'", [$id])->fetchColumn(),
        ];
    }

    public static function changePassword(PDO $db, int $id, array $body): void {
        $current = $body['current_password'] ?? null;
        if (!is_string($current) || $current === '' || strlen($current) > 128 || str_contains($current, "\0")) {
            reject(422, 'Enter your current password.');
        }
        $password = self::newPassword($body);
        $hash = sql($db, 'SELECT password_hash FROM users WHERE id=?', [$id])->fetchColumn();
        if (!$hash || !password_verify($current, $hash)) reject(422, 'The current password is incorrect.');
        if (password_verify($password, $hash)) reject(422, 'Choose a different password.');
        $updated = sql(
            $db,
            'UPDATE users SET password_hash=? WHERE id=? AND BINARY password_hash=?',
            [password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]), $id, $hash],
        );
        if (!$updated->rowCount()) reject(409, 'Your password changed. Enter your current password and try again.');
    }

    public static function issueRecoveryCode(PDO $db, int $id, array $body): string {
        $current = $body['current_password'] ?? null;
        $hash = sql($db, 'SELECT password_hash FROM users WHERE id=?', [$id])->fetchColumn();
        if (!is_string($current) || strlen($current) > 128 || !$hash || !password_verify($current, $hash)) {
            reject(422, 'The current password is incorrect.');
        }
        $code = bin2hex(random_bytes(16));
        $digest = hash('sha256', $code);
        sql($db, 'INSERT INTO account_recovery(user_id,code_hash) VALUES(?,?) ON DUPLICATE KEY UPDATE code_hash=?',
            [$id,$digest,$digest]);
        return $code;
    }

    public static function recover(PDO $db, array $body): int {
        $email = $body['email'] ?? null;
        $code = $body['code'] ?? null;
        if (!is_string($email) || strlen($email) > 160 || !filter_var($email, FILTER_VALIDATE_EMAIL)
            || !is_string($code) || !preg_match('/^[a-f0-9]{32}$/iD', trim($code))) {
            reject(422, 'Enter your email and a valid recovery code.');
        }
        $password = self::newPassword($body);
        $digest = hash('sha256', strtolower(trim($code)));
        $id = sql($db, 'SELECT u.id FROM users u JOIN account_recovery r ON r.user_id=u.id WHERE u.email=? AND r.code_hash=?',
            [$email,$digest])->fetchColumn();
        if (!$id) reject(422, 'The email or recovery code is incorrect.');
        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $db->beginTransaction();
        try {
            $used = sql($db, 'DELETE FROM account_recovery WHERE user_id=? AND code_hash=?', [$id,$digest]);
            if (!$used->rowCount()) reject(422, 'The email or recovery code is incorrect.');
            sql($db, 'UPDATE users SET password_hash=? WHERE id=?', [$hash,$id]);
            $db->commit();
        } catch (Throwable $error) {
            $db->rollBack();
            throw $error;
        }
        return (int)$id;
    }

    private static function newPassword(array $body): string {
        $password = $body['new_password'] ?? null;
        if (!is_string($password) || strlen($password) > 72 || str_contains($password, "\0")
            || !preg_match('/\A.{12,}\z/su', $password)) {
            reject(422, 'Use at least 12 characters and at most 72 bytes for your new password.');
        }
        if ($password !== ($body['confirm_password'] ?? null)) {
            reject(422, 'The new passwords do not match.');
        }

        return $password;
    }
}
