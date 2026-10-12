<?php

namespace App\Services\WhatsApp;

use App\Support\Settings;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Alertes WhatsApp automatiques pour l'équipe (nouvelle commande, paiement déclaré…).
 *
 * Fonctionne avec CallMeBot (gratuit, pour ses propres numéros) : chaque membre de l'équipe
 * active une fois le service depuis son WhatsApp et obtient une « apikey » à saisir dans
 * Admin → Paramètres. Sans destinataire configuré, le message est écrit dans les logs.
 * Une panne d'envoi ne bloque jamais une commande.
 */
class WhatsAppAlerts
{
    public static function send(string $message): void
    {
        $recipients = array_filter(Settings::get('whatsapp')['alerts'] ?? [], fn ($r) => ! empty($r['phone']) && ! empty($r['apikey']));
        if (! $recipients || config('kola.whatsapp_alerts') === 'log') {
            Log::info('[WhatsApp équipe] '.$message);

            return;
        }

        foreach ($recipients as $r) {
            try {
                Http::timeout(10)->get('https://api.callmebot.com/whatsapp.php', [
                    'phone' => '+'.preg_replace('/\D/', '', (string) $r['phone']),
                    'text' => $message,
                    'apikey' => $r['apikey'],
                ]);
            } catch (\Throwable $e) {
                Log::warning('Alerte WhatsApp non envoyée : '.$e->getMessage());
            }
        }
    }
}
