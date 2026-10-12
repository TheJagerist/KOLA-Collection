<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Une commande vient d'être enregistrée.
 *
 * ShouldDispatchAfterCommit : si l'événement est lancé à l'intérieur d'une transaction
 * (c'est le cas dans OrderService::place()), il n'est réellement diffusé qu'APRÈS le commit.
 * En cas de rollback il n'est jamais diffusé : pas de notification pour une commande qui n'existe pas.
 */
class OrderPlaced implements ShouldDispatchAfterCommit
{
    use Dispatchable, SerializesModels;

    public function __construct(public Order $order) {}
}
