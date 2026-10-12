<?php

namespace App\Listeners;

use App\Events\OrderPlaced;
use App\Notifications\NewOrderNotification;
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
