<?php
declare(strict_types=1);

final class SecurityMonitor {
    private const LIMITS = [
        'account.sign_in' => [8, 600, true],
        'account.register' => [10, 600, false],
        'account.password_reset' => [5, 600, true],
        'account.password_change' => [5, 600, true],
        'account.recovery_code' => [5, 600, true],
    ];

    private ?array $reservation = null;
    private ?int $actor;
    private readonly string $ip;
    private readonly string $requestId;

    private function __construct(private PDO $db, private string $action) {
        $this->actor = $_SESSION['user']['id'] ?? null;
        $this->ip = filter_var($_SERVER['REMOTE_ADDR'] ?? '', FILTER_VALIDATE_IP) ?: 'unknown';
        $this->requestId = bin2hex(random_bytes(12));
        header('X-Request-ID: '.$this->requestId);
    }

    public static function watch(PDO $db, string $method, string $path): ?self {
        $action = match ($method.' '.$path) {
            'POST /api/login' => 'account.sign_in',
            'POST /api/logout' => 'account.sign_out',
            'POST /api/register' => 'account.register',
            'POST /api/reset-password' => 'account.password_reset',
            'POST /api/account/password' => 'account.password_change',
            'POST /api/account/recovery' => 'account.recovery_code',
            'POST /api/vendor/products' => 'vendor.inventory_save',
            'DELETE /api/vendor/products' => 'vendor.inventory_delete',
            'POST /api/vendor/orders' => 'vendor.fulfillment',
            default => null,
        };
        if ($action === null) return null;
        $monitor = new self($db, $action);
        register_shutdown_function($monitor->finish(...));
        return $monitor;
    }

    public function identify(int $actor): void {
        $this->actor = $actor;
    }

    public function limit(): void {
        if (!isset(self::LIMITS[$this->action])) return;
        [$limit,$window,$releaseOnSuccess] = self::LIMITS[$this->action];
        $now = time();
        $start = $now - $now % $window;
        $expires = $start + $window;
        $subject = match ($this->action) {
            'account.password_change', 'account.recovery_code' => 'user:'.$this->actor,
            default => 'ip:'.$this->ip,
        };
        $key = [$this->action,$subject,$start];

        if (random_int(1,100) === 1) {
            sql($this->db, 'DELETE FROM api_rate_windows WHERE expires_at<=? LIMIT 500', [$now]);
        }
        $this->db->beginTransaction();
        try {
            sql($this->db, 'INSERT INTO api_rate_windows(action,subject,window_start,expires_at,attempts)
                VALUES(?,?,?,?,1) ON DUPLICATE KEY UPDATE attempts=LEAST(attempts+1,?)', [...$key,$expires,$limit+1]);
            $attempts = (int)sql($this->db, 'SELECT attempts FROM api_rate_windows
                WHERE action=? AND subject=? AND window_start=?', $key)->fetchColumn();
            $this->db->commit();
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }

        if ($attempts > $limit) {
            $seconds = max(1, $expires - time());
            header('Retry-After: '.$seconds);
            $minutes = (int)ceil($seconds / 60);
            reject(429, 'Too many attempts. Try again in '.$minutes.($minutes === 1 ? ' minute.' : ' minutes.'));
        }
        if ($releaseOnSuccess) $this->reservation = $key;
    }

    private function finish(): void {
        $status = http_response_code() ?: 200;
        $actor = $this->actor ?? ($_SESSION['user']['id'] ?? null);
        try {
            if ($this->reservation && $status < 400) {
                sql($this->db, 'UPDATE api_rate_windows SET attempts=GREATEST(0,attempts-1)
                    WHERE action=? AND subject=? AND window_start=?', $this->reservation);
            }
            sql($this->db, 'INSERT INTO security_audit(request_id,user_id,ip_address,action,http_status)
                VALUES(?,?,?,?,?)', [$this->requestId,$actor,$this->ip,$this->action,$status]);
            if (random_int(1,100) === 1) {
                $this->db->exec('DELETE FROM security_audit WHERE created_at < NOW() - INTERVAL 30 DAY LIMIT 500');
            }
        } catch (Throwable) {
            error_log('Security monitor write failed for request '.$this->requestId);
        }
    }
}
