<?php

/** Réglages propres à Kōlā Collection */
return [
    // E-mails de l'équipe prévenus à chaque nouvelle commande (séparés par des virgules)
    'notify_emails' => env('KOLA_NOTIFY_EMAILS', ''),

    // Seuil d'alerte « stock bas » (par taille)
    'low_stock' => (int) env('KOLA_LOW_STOCK', 3),

    // Paiement Mobile Money en ligne : null (désactivé) | fake (simulateur, dev) | cinetpay
    'payments' => [
        'driver' => env('KOLA_PAYMENT_DRIVER') ?: null,
        'cinetpay' => [
            'site_id' => env('CINETPAY_SITE_ID'),
            'api_key' => env('CINETPAY_API_KEY'),
            'secret_key' => env('CINETPAY_SECRET_KEY'), // vérification de la signature x-token (facultatif)
            'base_url' => env('CINETPAY_BASE_URL', 'https://api-checkout.cinetpay.com/v2'),
        ],
    ],
];
