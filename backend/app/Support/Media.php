<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

/**
 * Gestion des fichiers publics (disque « public » → /storage/...).
 * Les URL renvoyées sont relatives (/storage/xxx) : le front et l'API sont servis sur la même origine.
 */
class Media
{
    public const DISK = 'public';

    /** Côté le plus long autorisé après redimensionnement, en pixels. */
    private const MAX_DIMENSION = 1600;

    /** Qualité d'encodage WebP (0-100). */
    private const WEBP_QUALITY = 82;

    public static function url(?string $path): ?string
    {
        if (! $path) {
            return null;
        }
        if (Str::startsWith($path, ['http://', 'https://', '/'])) {
            return $path;
        }

        return '/storage/'.ltrim($path, '/');
    }

    /**
     * Enregistre un fichier image envoyé : redimensionne (≤ 1600 px, sans upscale)
     * et convertit en WebP, puis renvoie le chemin relatif au disque.
     */
    public static function store(UploadedFile $file, string $folder): string
    {
        $manager = ImageManager::usingDriver(Driver::class);

        $image = $manager->decodeSplFileInfo($file);

        // Redimensionne uniquement si l'image dépasse la taille max, en conservant le ratio.
        if ($image->width() > self::MAX_DIMENSION || $image->height() > self::MAX_DIMENSION) {
            $image->scaleDown(width: self::MAX_DIMENSION, height: self::MAX_DIMENSION);
        }

        $encoded = $image->encode(new WebpEncoder(quality: self::WEBP_QUALITY));

        $path = trim($folder, '/').'/'.(string) Str::uuid().'.webp';

        Storage::disk(self::DISK)->put($path, (string) $encoded);

        return $path;
    }

    public static function delete(?string $path): void
    {
        if ($path && ! Str::startsWith($path, ['http://', 'https://', '/'])) {
            Storage::disk(self::DISK)->delete($path);
        }
    }
}
