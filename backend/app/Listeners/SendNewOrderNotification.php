<?php

namespace App\Listeners;

use App\Events\OrderPlaced;
use App\Notifications\NewOrderNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Throwable;

/**
 * Prévient l'équipe Kōlā qu'une commande est arrivée.
 * Découvert automatiquement par Laravel (type de $event dans handle()).
 */
class SendNewOrderNotification
{
    public function handle(OrderPlaced $event): void
    {
        $recipients = config('kola.notify_emails', []);

        if ($recipients === []) {
            Log::warning('KOLA_NOTIFY_EMAIL est vide : aucune notification pour la commande '.$event->order->reference);

            return;
        }

        // La commande est déjà enregistrée : un souci de notification ne doit JAMAIS faire échouer la requête du client.
        try {
            Notification::route('mail', $recipients)->notify(new NewOrderNotification($event->order));
        } catch (Throwable $e) {
            report($e);
        }
    }
}
