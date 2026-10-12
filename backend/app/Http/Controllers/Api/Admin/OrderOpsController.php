<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\DeliveryCity;
use App\Enums\Niveau;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\StaffRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Opérations sur les commandes côté équipe (en plus de Admin\OrderController de Manu) :
 * saisie manuelle, historique et notes internes, livraison (livreur + créneau).
 */
class OrderOpsController extends Controller
{
    /** POST /api/admin/orders — commande prise par téléphone ou en boutique */
    public function store(Request $request, OrderService $orders): JsonResponse
    {
        $request->merge([
            'payment_phone' => preg_replace('/\D/', '', (string) $request->input('payment_phone')),
            'customer' => $request->filled('customer.phone')
                ? array_merge((array) $request->input('customer'), ['phone' => preg_replace('/^242/', '', preg_replace('/\D/', '', (string) $request->input('customer.phone')))])
                : $request->input('customer'),
        ]);

        $data = $request->validate([
            'customer_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('is_admin', false)],
            'customer' => ['required_without:customer_id', 'nullable', 'array'],
            'customer.full_name' => ['required_without:customer_id', 'nullable', 'string', 'max:120'],
            'customer.phone' => ['required_without:customer_id', 'nullable', 'regex:/^0\d{8}$/'],
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.size' => ['required', 'string', 'max:10'],
            'items.*.niveau' => ['required', Rule::enum(Niveau::class)],
            'items.*.qty' => ['required', 'integer', 'between:1,50'],
            'payment_method' => ['required', Rule::enum(PaymentMethod::class)],
            'payment_phone' => ['required', 'regex:/^0\d{8}$/'],
            'delivery_city' => ['required', Rule::enum(DeliveryCity::class)],
            'delivery_address' => ['required', 'string', 'min:3', 'max:255'],
            'promo_code' => ['nullable', 'string', 'max:40'],
            'deposit_received' => ['nullable', 'boolean'],
        ], [
            'customer.full_name.required_without' => 'Indiquez le nom du client.',
            'customer.phone.required_without' => 'Indiquez le téléphone du client.',
            'customer.phone.regex' => 'Téléphone invalide : 9 chiffres, ex. 06 123 45 67.',
            'payment_phone.regex' => 'Numéro Mobile Money invalide : 9 chiffres.',
            'items.required' => 'Ajoutez au moins un article.',
        ]);

        // Client existant, retrouvé par téléphone, ou créé (compte sans mot de passe)
        $customer = isset($data['customer_id'])
            ? User::query()->findOrFail($data['customer_id'])
            : (User::query()->where('is_admin', false)->where('phone', $data['customer']['phone'])->first()
                ?? User::query()->create(['full_name' => trim($data['customer']['full_name']), 'phone' => $data['customer']['phone'], 'role' => 'parent']));

        $order = $orders->place($customer, $data, ['source' => 'manuel', 'created_by' => $request->user()->id]);

        if (! empty($data['deposit_received'])) {
            $order->transitionTo(OrderStatus::Validee, 'Acompte reçu à la prise de commande');
        }

        return (new OrderResource($order->fresh()->load(['items.product', 'user', 'courier'])))->response()->setStatusCode(201);
    }

    /** GET /api/admin/orders/{order}/events — historique complet */
    public function events(Order $order): JsonResponse
    {
        $events = $order->events()->with('user:id,full_name,is_admin')->get()->map(fn ($e) => [
            'id' => $e->id,
            'type' => $e->type,
            'from_status' => $e->from_status,
            'to_status' => $e->to_status,
            'body' => $e->body,
            'created_at' => $e->created_at?->toIso8601String(),
            'user' => $e->user ? ['id' => $e->user->id, 'full_name' => $e->user->full_name, 'is_staff' => (bool) $e->user->is_admin] : null,
        ]);

        return response()->json(['data' => $events]);
    }

    /** POST /api/admin/orders/{order}/notes { body } — note interne (jamais visible par le client) */
    public function addNote(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(['body' => ['required', 'string', 'max:1000']], ['body.required' => 'La note est vide.']);
        $e = $order->log('note', trim($data['body']));

        return response()->json(['data' => [
            'id' => $e->id, 'type' => 'note', 'from_status' => null, 'to_status' => null, 'body' => $e->body,
            'created_at' => $e->created_at?->toIso8601String(),
            'user' => ['id' => $request->user()->id, 'full_name' => $request->user()->full_name, 'is_staff' => true],
        ]], 201);
    }

    /** PATCH /api/admin/orders/{order}/delivery { courier_id, delivery_date, delivery_slot } */
    public function delivery(Request $request, Order $order): OrderResource
    {
        $data = $request->validate([
            'courier_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('is_admin', true)],
            'delivery_date' => ['nullable', 'date'],
            'delivery_slot' => ['nullable', 'string', 'max:60'],
        ]);

        $order->fill($data)->save();
        $courier = $order->courier()->first();
        $parts = array_filter([
            $courier ? "Livreur : {$courier->full_name}" : 'Livreur retiré',
            $order->delivery_date ? 'le '.$order->delivery_date->locale('fr')->isoFormat('dddd D MMMM') : null,
            $order->delivery_slot,
        ]);
        $order->log('delivery', implode(' · ', $parts));

        return new OrderResource($order->load(['items.product', 'user', 'courier']));
    }

    /** GET /api/admin/couriers — membres de l'équipe à qui confier une livraison */
    public function couriers(): JsonResponse
    {
        $staff = User::query()->where('is_admin', true)->orderBy('full_name')->get()
            ->filter(fn (User $u) => $u->hasStaffRole(StaffRole::Livreur, StaffRole::Gerant))
            ->map(fn (User $u) => ['id' => $u->id, 'full_name' => $u->full_name, 'phone' => $u->phone, 'staff_role' => $u->staffRole()?->value])
            ->values();

        return response()->json(['data' => $staff]);
    }
}
