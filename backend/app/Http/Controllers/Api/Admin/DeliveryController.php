<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Enums\StaffRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** Tournée du livreur : ses commandes à livrer, et la confirmation de remise */
class DeliveryController extends Controller
{
    /** GET /api/admin/deliveries — livreur : les siennes ; gérant / préparateur : toutes (?courier=ID pour filtrer) */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $onlyMine = $user->hasStaffRole(StaffRole::Livreur);

        $orders = Order::query()
            ->with(['items.product', 'user', 'courier'])
            ->where(fn ($q) => $q->whereIn('status', [OrderStatus::Validee->value, OrderStatus::Transit->value])
                ->orWhere(fn ($q) => $q->where('status', OrderStatus::Livre->value)->where('delivered_at', '>=', now()->startOfDay())))
            ->when($onlyMine, fn ($q) => $q->where('courier_id', $user->id))
            ->when(! $onlyMine && $request->filled('courier'), fn ($q) => $q->where('courier_id', $request->integer('courier')))
            ->orderByRaw('delivery_date is null, delivery_date')
            ->oldest()
            ->get();

        return OrderResource::collection($orders);
    }

    /** POST /api/admin/deliveries/{order}/start — départ en livraison */
    public function start(Request $request, Order $order): OrderResource
    {
        $this->authorizeCourier($request, $order);
        abort_unless($order->status === OrderStatus::Validee, 422, 'Seule une commande validée peut partir en livraison.');
        $order->transitionTo(OrderStatus::Transit, 'Départ en livraison');

        return new OrderResource($order->load(['items.product', 'user', 'courier']));
    }

    /** POST /api/admin/deliveries/{order}/delivered { note } — remise au client, solde encaissé */
    public function delivered(Request $request, Order $order): OrderResource
    {
        $this->authorizeCourier($request, $order);
        $data = $request->validate(['note' => ['nullable', 'string', 'max:500']]);
        abort_unless(in_array($order->status, [OrderStatus::Validee, OrderStatus::Transit], true), 422, 'Cette commande ne peut pas être marquée livrée.');
        $order->transitionTo(OrderStatus::Livre, $data['note'] ?? 'Remise au client, solde encaissé');

        return new OrderResource($order->load(['items.product', 'user', 'courier']));
    }

    private function authorizeCourier(Request $request, Order $order): void
    {
        $user = $request->user();
        if ($user->hasStaffRole(StaffRole::Livreur) && $order->courier_id !== $user->id) {
            abort(403, 'Cette livraison est confiée à un autre livreur.');
        }
    }
}
