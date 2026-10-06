<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    /**
     * GET /api/admin/orders?status=en_attente
     * Toutes les commandes, les plus récentes d'abord. Filtre optionnel par statut.
     */
    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::enum(OrderStatus::class)],
        ]);

        $orders = Order::query()
            ->with(['items.product', 'user'])
            ->when(
                isset($data['status']),
                fn ($q) => $q->where('status', $data['status'])
            )
            ->latest()
            ->get();

        return OrderResource::collection($orders);
    }

    /**
     * PATCH /api/admin/orders/{order}  { "status": "livre" }
     * La logique métier (solde encaissé, date de livraison) est dans Order::transitionTo().
     */
    public function update(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(OrderStatus::class)],
        ]);

        $order->transitionTo(OrderStatus::from($data['status']));

        return new OrderResource($order->load(['items.product', 'user']));
    }
}