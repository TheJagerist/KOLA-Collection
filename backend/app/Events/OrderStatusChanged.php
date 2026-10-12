<?php

namespace App\Events;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Foundation\Events\Dispatchable;

/** Le statut d'une commande vient de changer (paiement reçu, départ en livraison, livrée…) */
class OrderStatusChanged
{
    use Dispatchable;

    public function __construct(public Order $order, public OrderStatus $from, public OrderStatus $to) {}
}
