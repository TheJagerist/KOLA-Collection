<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrderController extends Controller
{
    /** GET /api/orders — commandes de l'utilisateur connecté */
    public function index(Request $request): AnonymousResourceCollection
    {
        $orders = $request->user()->orders()->with('items.product', 'courier')->latest()->latest('id')->get();

        return OrderResource::collection($orders);
    }

    /** POST /api/orders */
    public function store(StoreOrderRequest $request, OrderService $service): JsonResponse
    {
        $order = $service->place($request->user(), $request->validated());

        return (new OrderResource($order))->response()->setStatusCode(201);
    }

    /**
     * POST /api/orders/quote — aperçu des montants (remise famille, code promo, stock) avant de commander.
     * Mêmes règles que la commande réelle : rien n'est calculé côté navigateur.
     */
    public function quote(Request $request, OrderService $service): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.size' => ['required', 'string', 'max:10'],
            'items.*.niveau' => ['required', 'string'],
            'items.*.qty' => ['required', 'integer', 'between:1,20'],
            'promo_code' => ['nullable', 'string', 'max:40'],
        ]);

        $q = $service->quote($data['items'], $data['promo_code'] ?? null);
        // Le stock est vérifié aussi ici pour prévenir avant le paiement
        app(\App\Services\StockService::class)->check($q['lines'], $q['products']);

        return response()->json(['data' => [
            'subtotal' => $q['subtotal'],
            'discount' => $q['discount'],
            'total' => $q['total'],
            'deposit' => $q['deposit'],
            'balance' => $q['balance'],
            'items_count' => $q['items_count'],
            'promo' => $q['promo'] ? ['code' => $q['promo']->code, 'label' => $q['promo']->label] : null,
        ]]);
    }

    /** GET /api/orders/{reference} — la sienne, ou n'importe laquelle pour un admin */
    public function show(Request $request, string $reference): OrderResource
    {
        $user = $request->user();
        $order = Order::query()->reference($reference)
            ->when(! $user->is_admin, fn ($q) => $q->where('user_id', $user->id))
            ->with('items.product', 'user', 'courier')
            ->firstOrFail();

        return new OrderResource($order);
    }
}
