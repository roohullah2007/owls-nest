<?php

declare(strict_types=1);

namespace App\Services\Sites;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * GD-based optimizer for site image uploads: fixes EXIF orientation,
 * downscales anything larger than $maxDim and re-encodes (progressive JPEG /
 * PNG with alpha / WebP). Falls back to storing the original untouched when
 * GD is unavailable, the type isn't raster (gif/svg/avif), or optimizing
 * wouldn't shrink the file.
 */
class ImageOptimizer
{
    public static function storeOptimized(UploadedFile $file, string $dir, int $maxDim = 2560, int $quality = 82): string
    {
        $mime = (string) $file->getMimeType();

        if (! function_exists('imagecreatefromstring')
            || ! in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            return $file->store($dir, 'public');
        }

        $raw = (string) file_get_contents((string) $file->getRealPath());
        $src = @imagecreatefromstring($raw);
        if ($src === false) {
            return $file->store($dir, 'public');
        }

        // Honor EXIF orientation (phone JPEGs) before any resizing.
        if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
            $exif = @exif_read_data('data://image/jpeg;base64,'.base64_encode($raw));
            $rotated = match ((int) ($exif['Orientation'] ?? 1)) {
                3 => imagerotate($src, 180, 0),
                6 => imagerotate($src, -90, 0),
                8 => imagerotate($src, 90, 0),
                default => null,
            };
            if ($rotated instanceof \GdImage) {
                imagedestroy($src);
                $src = $rotated;
            }
        }

        $w = imagesx($src);
        $h = imagesy($src);
        $scale = min(1.0, $maxDim / max($w, $h, 1));

        if ($scale < 1.0) {
            $resized = imagescale($src, (int) round($w * $scale), (int) round($h * $scale), IMG_BICUBIC);
            if ($resized !== false) {
                imagedestroy($src);
                $src = $resized;
            }
        }

        $ext = match ($mime) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'jpg',
        };

        ob_start();
        if ($ext === 'png') {
            imagesavealpha($src, true);
            imagepng($src, null, 6);
        } elseif ($ext === 'webp') {
            imagesavealpha($src, true);
            imagewebp($src, null, $quality);
        } else {
            imageinterlace($src, true);
            imagejpeg($src, null, $quality);
        }
        $encoded = (string) ob_get_clean();
        imagedestroy($src);

        // Re-encoding a small file can grow it — keep the original then.
        if ($encoded === '' || ($scale >= 1.0 && strlen($encoded) >= strlen($raw))) {
            return $file->store($dir, 'public');
        }

        $path = trim($dir, '/').'/'.Str::random(40).'.'.$ext;
        Storage::disk('public')->put($path, $encoded);

        return $path;
    }
}
