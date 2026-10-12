<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * Réglages de la boutique modifiables par le gérant (Admin → Paramètres).
 * Valeurs par défaut ci-dessous, fusionnées avec ce qui est enregistré en base.
 */
class Settings
{
    public const DEFAULTS = [
        'payment' => [
            // Numéros qui reçoivent les acomptes (dépôt / transfert Mobile Money)
            'mtn' => ['number' => '', 'name' => '', 'ussd' => '', 'fee_percent' => 0],
            'airtel' => ['number' => '', 'name' => '', 'ussd' => '', 'fee_percent' => 0],
            // Texte libre affiché au client (frais, horaires de vérification…)
            'note' => 'Les frais de transfert sont à votre charge : envoyez le montant exact de l’acompte. Nous vérifions la réception et validons votre commande rapidement.',
        ],
        'whatsapp' => [
            // Numéro WhatsApp de la boutique (bouton « Nous écrire »)
            'shop_number' => '',
            // Alertes automatiques de l'équipe (nouvelle commande, paiement déclaré) via CallMeBot
            'alerts' => [], // [{ "phone": "242064455563", "apikey": "123456", "name": "Gérant" }]
        ],
    ];

    public static function get(string $key): array
    {
        return Cache::rememberForever("settings:{$key}", function () use ($key) {
            $stored = Setting::query()->find($key)?->value ?? [];

            return array_replace_recursive(self::DEFAULTS[$key] ?? [], $stored);
        });
    }

    public static function put(string $key, array $value): array
    {
        Setting::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget("settings:{$key}");

        return self::get($key);
    }
}
