<?php

namespace App\Listeners;

use App\Events\OrderPlaced;
use App\Notifications\NewOrderNotification;
use App\Services\WhatsApp\WhatsAppAlerts;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Prévient l'équipe par e-mail (adresses dans KOLA_NOTIFY_EMAILS, séparées par des virgules).
 * En développement, MAIL_MAILER=log : l'e-mail est écrit dans storage/logs/laravel.log.
 * L'admin est aussi prévenu en direct dans le tableau de bord (son + notification du navigateur).
 */
class NotifyTeamOfNewOrder
{
    public function handle(OrderPlaced $event): void
    {
        $o = $event->order->loadMissing('items', 'user');
        $fcfa = fn (int $n) => number_format($n, 0, ',', ' ').' FCFA';
        WhatsAppAlerts::send(implode("\n", array_filter([
            "🛍️ Nouvelle commande {$o->reference}".($o->source === 'manuel' ? ' (saisie équipe)' : ''),
            "Client : {$o->user->full_name} · +242 {$o->payment_phone}",
            ...$o->items->map(fn ($i) => "• {$i->qty} × {$i->product_name} — T. {$i->size}")->all(),
            "Total : {$fcfa($o->total)} · acompte {$fcfa($o->deposit)}",
            "Livraison : {$o->delivery_city} — {$o->delivery_address}",
            rtrim((string) config('app.frontend_url'), '/')."/admin/commandes?q={$o->reference}",
        ])));

        $emails = array_filter(array_map('trim', explode(',', (string) config('kola.notify_emails'))));
        if (! $emails) {
            return;
        }

        try {
            Notification::route('mail', $emails)->notify(new NewOrderNotification($event->order));
        } catch (\Throwable $e) {
            // Une panne d'e-mail ne doit jamais bloquer une commande
            Log::warning('Notification nouvelle commande non envoyée : '.$e->getMessage());
        }
    }
}
