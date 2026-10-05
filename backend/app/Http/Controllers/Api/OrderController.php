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
        $orders = $request->user()->orders()->with('items.product')->latest()->latest('id')->get();

        return OrderResource::collection($orders);
    }

    /** POST /api/orders */
    public function store(StoreOrderRequest $request, OrderService $service): JsonResponse
    {
        $order = $service->place($request->user(), $request->validated());

        return (new OrderResource($order))->response()->setStatusCode(201);
    }

    /** GET /api/orders/{reference} — la sienne, ou n'importe laquelle pour un admin */
    public function show(Request $request, string $reference): OrderResource
    {
        $user = $request->user();
        $order = Order::query()->reference($reference)
            ->when(! $user->is_admin, fn ($q) => $q->where('user_id', $user->id))
            ->with('items.product', 'user')
            ->firstOrFail();

        return new OrderResource($order);
    }
}
