<?php

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Order */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'status' => $this->status->value,
            'total' => $this->total,
            'deposit' => $this->deposit,
            'balance' => $this->balance,
            'balance_paid' => (bool) $this->balance_paid,
            'payment_method' => $this->payment_method->value,
            'payment_phone' => $this->payment_phone,
            'delivery_city' => $this->delivery_city,
            'delivery_address' => $this->delivery_address,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($i) => [
                'product_id' => $i->product_id,
                'product_name' => $i->product_name,
                'product_image_url' => $i->relationLoaded('product') ? $i->product?->imageUrl() : null,
                'size' => $i->size,
                'niveau' => $i->niveau->value,
                'qty' => $i->qty,
                'unit_price' => $i->unit_price,
                'line_total' => $i->line_total,
            ])->values()),
            'customer' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'full_name' => $this->user->full_name,
                'username' => $this->user->username,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
        ];
    }
}
