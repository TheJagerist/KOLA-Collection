<?php

namespace App\Listeners;

use App\Enums\OrderStatus;
use App\Events\OrderStatusChanged;
use App\Notifications\OrderStatusNotification;
use Throwable;

/** Prévient le client dont la commande vient de changer de statut. Découvert automatiquement par Laravel. */
class NotifyCustomerOfStatusChange
{
    public function handle(OrderStatusChanged $event): void
    {
        // Un retour à « en attente » (correction d'une erreur côté admin) ne mérite pas de message au client.
        if ($event->to === OrderStatus::EnAttente) {
            return;
        }

        // Le statut est déjà enregistré : un souci de notification ne doit jamais faire échouer la requête de l'admin.
        try {
            // loadMissing et non un accès direct : le mode strict d'Eloquent interdit le chargement paresseux.
            $user = $event->order->loadMissing('user')->user;

            $user?->notify(new OrderStatusNotification($event->order, $event->to));
        } catch (Throwable $e) {
            report($e);
        }
    }
}
