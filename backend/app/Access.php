<?php
declare(strict_types=1);
final class Access {
    public static function start(): void {
        ini_set('session.use_strict_mode','1');
        $sessions=ROOT.'/.runtime/sessions';
        if (!is_dir($sessions) && !mkdir($sessions,0700,true) && !is_dir($sessions)) throw new RuntimeException('Cannot create the session directory.');
        session_save_path($sessions);
        session_name('forma_session');
        session_set_cookie_params(['path'=>'/','httponly'=>true,'secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off','samesite'=>'Lax']);
        session_start();
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    }
    public static function role(string $role): array {
        $user=$_SESSION['user']??null;
        if (!$user) reject(401,'Sign in to continue.');
        if ($user['role']!==$role) reject(403,'This workspace belongs to another role.');
        return $user;
    }
    public static function csrf(): void {
        if (!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??'')) reject(403,'Refresh this page and try again.');
    }
    public static function login(PDO $db,array $body): array {
        $email=$body['email']??''; $password=$body['password']??'';
        if (!is_string($email)||!filter_var($email,FILTER_VALIDATE_EMAIL)||!is_string($password)||strlen($password)>128) reject(422,'Enter a valid email and password.');
        $user=sql($db,'SELECT id,name,email,role,password_hash FROM users WHERE email=?',[$email])->fetch();
        if (!$user || !password_verify($password,$user['password_hash'])) reject(401,'The email or password is incorrect.');
        unset($user['password_hash']);
        $cart=empty($_SESSION['user']) && $user['role']==='buyer' ? ($_SESSION['cart']??[]) : [];
        session_regenerate_id(true);
        $_SESSION=['user'=>$user,'csrf'=>bin2hex(random_bytes(32)),'cart'=>$cart];
        return $user;
    }
}
