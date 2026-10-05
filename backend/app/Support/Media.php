<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Gestion des fichiers publics (disque « public » → /storage/...).
 * Les URL renvoyées sont relatives (/storage/xxx) : le front et l'API sont servis sur la même origine.
 */
class Media
{
    public const DISK = 'public';

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
     * Enregistre un fichier envoyé et renvoie son chemin relatif au disque.
     * TODO (Manu) : redimensionner (≤ 1600 px) et convertir en WebP avant stockage.
     */
    public static function store(UploadedFile $file, string $folder): string
    {
        return $file->store($folder, self::DISK);
    }

    public static function delete(?string $path): void
    {
        if ($path && ! Str::startsWith($path, ['http://', 'https://', '/'])) {
            Storage::disk(self::DISK)->delete($path);
        }
    }
}
