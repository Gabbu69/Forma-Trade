<?php
declare(strict_types=1);

final class ProductPhotos {
    public static function uploads(?array $files, int $maxSide = 1200): array {
        if (!$files) return [];
        if (!is_array($files['error'] ?? null) || count($files['error']) > 3) reject(422,'Choose up to three product photos.');

        $photos = [];
        foreach ($files['error'] as $index=>$error) {
            if ($error === UPLOAD_ERR_NO_FILE) continue;
            if (in_array($error, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) reject(413,'Each photo must be 2 MB or smaller.');
            if ($error !== UPLOAD_ERR_OK) reject(422,'The photo upload did not finish. Choose the files again.');
            $path = $files['tmp_name'][$index] ?? '';
            $size = $files['size'][$index] ?? 0;
            if ($size > 2 * 1024 * 1024) reject(413,'Each photo must be 2 MB or smaller.');
            if (!is_string($path) || !is_uploaded_file($path)) reject(422,'Choose a valid photo.');
            $info = @getimagesize($path);
            if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)
                || $info[0] < 1 || $info[1] < 1 || $info[0] * $info[1] > 16_000_000) {
                reject(422,'Use a JPEG, PNG, or WebP photo up to 16 megapixels.');
            }
            if (!function_exists('imagewebp')) reject(503,'The server needs the PHP GD extension with WebP support to accept photos.');
            $image = @imagecreatefromstring(file_get_contents($path));
            if (!$image) reject(422,'The photo could not be read.');
            $scale = min(1, $maxSide / max($info[0], $info[1]));
            if ($scale < 1) $image = imagescale($image, max(1, (int)round($info[0] * $scale)), max(1, (int)round($info[1] * $scale)));
            if (!$image) throw new RuntimeException('Could not resize product photo.');
            if (!imageistruecolor($image)) imagepalettetotruecolor($image);
            ob_start();
            $success = imagewebp($image, null, 85);
            $bytes = ob_get_clean();
            if (!$success || substr($bytes, 8, 4) !== 'WEBP') throw new RuntimeException('Could not encode product photo.');
            $photos[] = $bytes;
        }
        return $photos;
    }
}
