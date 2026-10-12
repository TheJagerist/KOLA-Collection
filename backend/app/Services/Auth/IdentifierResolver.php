<?php

namespace App\Services\Auth;

use App\Models\User;

/**
 * Retrouve un compte à partir de ce que la personne a tapé :
 * nom d'utilisateur, adresse e-mail ou numéro de téléphone (06 123 45 67, +242 06…).
 */
class IdentifierResolver
{
    /** @return array{type: 'email'|'phone'|'username', value: string} */
    public static function parse(string $raw): array
    {
        $raw = trim($raw);
        if (str_contains($raw, '@')) {
            return ['type' => 'email', 'value' => mb_strtolower($raw)];
        }
        $digits = preg_replace('/\D/', '', $raw);
        if ($digits !== '' && strlen($digits) >= 8 && preg_match('/^[\d\s().+-]+$/', $raw)) {
            $digits = preg_replace('/^(00)?242/', '', $digits);
            if (strlen($digits) === 8) {
                $digits = '0'.$digits; // « 6 123 45 67 » saisi sans le 0
            }

            return ['type' => 'phone', 'value' => $digits];
        }

        return ['type' => 'username', 'value' => mb_strtolower($raw)];
    }

    public static function find(string $raw): ?User
    {
        ['type' => $type, 'value' => $value] = self::parse($raw);

        return match ($type) {
            'email' => User::query()->whereRaw('lower(email) = ?', [$value])->first(),
            // Plusieurs comptes peuvent partager un numéro (famille) : on prend le plus récemment utilisé
            'phone' => User::query()->where('phone', $value)->orderByDesc('updated_at')->first(),
            default => User::query()->where('username', $value)->first(),
        };
    }
}
