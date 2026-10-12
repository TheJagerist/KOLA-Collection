<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\OrderItem;
use App\Models\User;
use App\Support\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Fiches clients : historique, tailles habituelles, note interne */
class CustomerController extends Controller
{
    /** GET /api/admin/customers */
    public function index(): JsonResponse
    {
        $cancelled = OrderStatus::Annulee->value;
        $pending = OrderStatus::EnAttente->value;
        $customers = User::query()
            ->where('is_admin', false)
            ->withCount('orders')
            ->withSum(['orders as total_spent' => fn ($q) => $q->where('status', '!=', $cancelled)], 'total')
            ->withCount(['orders as pending_count' => fn ($q) => $q->where('status', $pending)])
            ->withMax('orders as last_order_at', 'created_at')
            ->with(['orders' => fn ($q) => $q->latest()->select('id', 'user_id', 'delivery_city', 'created_at')])
            ->orderByDesc('last_order_at')
            ->get();

        return response()->json(['data' => $customers->map(fn (User $u) => $this->present($u))]);
    }

    /** GET /api/admin/customers/{user} — fiche détaillée */
    public function show(User $user): JsonResponse
    {
        abort_if($user->is_admin, 404);
        $orders = $user->orders()->with(['items.product', 'user', 'courier'])->latest()->get();
        $user->setAttribute('orders_count', $orders->count());
        $user->setAttribute('total_spent', $orders->where('status', '!=', OrderStatus::Annulee)->sum('total'));
        $user->setAttribute('pending_count', $orders->where('status', OrderStatus::EnAttente)->count());
        $user->setAttribute('last_order_at', $orders->first()?->created_at);
        $user->setRelation('orders', $orders);

        // Tailles habituelles : par type de vêtement, la taille la plus commandée
        $sizes = OrderItem::query()
            ->whereIn('order_id', $orders->where('status', '!=', OrderStatus::Annulee)->pluck('id'))
            ->with('product:id,cat,ensemble')
            ->get()
            ->groupBy(fn ($i) => ($i->product?->cat?->value ?? 'article').'|'.$i->size)
            ->map(fn ($g, $k) => ['cat' => explode('|', $k)[0], 'size' => explode('|', $k)[1], 'qty' => $g->sum('qty')])
            ->sortByDesc('qty')
            ->values();

        return response()->json(['data' => $this->present($user) + [
            'usual_sizes' => $sizes,
            'orders' => OrderResource::collection($orders),
        ]]);
    }

    /** PATCH /api/admin/customers/{user} { admin_note } */
    public function update(Request $request, User $user): JsonResponse
    {
        abort_if($user->is_admin, 404);
        $data = $request->validate(['admin_note' => ['nullable', 'string', 'max:2000']]);
        $user->forceFill(['admin_note' => $data['admin_note'] ?? null])->save();

        return response()->json(['data' => ['id' => $user->id, 'admin_note' => $user->admin_note]]);
    }

    private function present(User $u): array
    {
        $last = $u->getAttribute('last_order_at');

        return [
            'id' => $u->id,
            'full_name' => $u->full_name,
            'username' => $u->username,
            'email' => $u->email,
            'phone' => $u->phone,
            'avatar_url' => Media::url($u->avatar_path),
            'city' => $u->default_city ?? ($u->relationLoaded('orders') ? $u->orders->first()?->delivery_city : null),
            'admin_note' => $u->admin_note,
            'has_account' => $u->username !== null || $u->password !== null || $u->google_id !== null,
            'orders_count' => (int) $u->getAttribute('orders_count'),
            'total_spent' => (int) $u->getAttribute('total_spent'),
            'pending_count' => (int) $u->getAttribute('pending_count'),
            'last_order_at' => $last ? \Illuminate\Support\Carbon::parse($last)->toIso8601String() : null,
            'created_at' => $u->created_at?->toIso8601String(),
        ];
    }
}
