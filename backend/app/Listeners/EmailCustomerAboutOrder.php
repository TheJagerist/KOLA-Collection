<?php

namespace App\Listeners;

use App\Enums\OrderStatus;
use App\Events\OrderPlaced;
use App\Events\OrderStatusChanged;
use App\Notifications\OrderUpdateForCustomer;
use Illuminate\Support\Facades\Log;

/** Tient le client informé par e-mail (s'il a renseigné une adresse et n'a pas désactivé les e-mails) */
class EmailCustomerAboutOrder
{
    public function handlePlaced(OrderPlaced $event): void
    {
        $this->send($event->order, 'placed');
    }

    public function handleStatus(OrderStatusChanged $event): void
    {
        // Un retour en « en attente » (correction de l'équipe) ne mérite pas d'e-mail
        if ($event->to !== OrderStatus::EnAttente) {
            $this->send($event->order, $event->to->value);
        }
    }

    private function send($order, string $what): void
    {
        $user = $order->loadMissing('user')->user;
        if (! $user?->wantsEmails()) {
            return;
        }
        try {
            $user->notify(new OrderUpdateForCustomer($order, $what));
        } catch (\Throwable $e) {
            Log::warning("E-mail client non envoyé ({$order->reference}) : ".$e->getMessage());
        }
    }
}
