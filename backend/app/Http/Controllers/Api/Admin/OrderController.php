<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * TODO (Manu) — Gestion des commandes côté admin. Spécification : docs/API.md §6.
 * Briques déjà prêtes : Order::transitionTo(), OrderResource (avec 'customer' si la relation user est chargée).
 */
class OrderController extends Controller
{
    /**
     * GET /api/admin/orders?status=en_attente
     * - toutes les commandes, les plus récentes d'abord, avec ->with('items.product', 'user')
     * - filtre optionnel ?status= (valider avec Rule::enum(OrderStatus::class))
     * - retour : OrderResource::collection(...)
     */
    public function index(Request $request)
    {
        $this->todo('liste des commandes (admin)');
    }

    /**
     * PATCH /api/admin/orders/{order}  { "status": "livre" }
     * - valider le statut (Rule::enum(OrderStatus::class))
     * - $order->transitionTo(OrderStatus::from(...))   ← gère balance_paid / delivered_at
     * - retour : new OrderResource($order->load('items.product', 'user'))
     */
    public function update(Request $request, int $order)
    {
        $this->todo('changement de statut (admin)');
    }
}
