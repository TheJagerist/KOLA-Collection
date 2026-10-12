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

    // SMS (codes de connexion) : log (dev : écrit dans les logs) | africastalking
    'sms' => [
        'driver' => env('KOLA_SMS_DRIVER', 'log'),
        'africastalking' => [
            'username' => env('AT_USERNAME'),
            'api_key' => env('AT_API_KEY'),
            'sender_id' => env('AT_SENDER_ID'),
        ],
    ],

    // Connexion par empreinte / Face ID (WebAuthn). rp_id = domaine du site, sans https:// ni port.
    'webauthn' => [
        'rp_id' => env('KOLA_WEBAUTHN_RP_ID') ?: (parse_url((string) env('FRONTEND_URL', 'http://localhost'), PHP_URL_HOST) ?: 'localhost'),
        'rp_name' => 'Kōlā Collection',
    ],

    // Alertes WhatsApp de l'équipe : callmebot (destinataires dans Admin → Paramètres) | log (tests)
    'whatsapp_alerts' => env('KOLA_WHATSAPP_ALERTS', 'callmebot'),
];
