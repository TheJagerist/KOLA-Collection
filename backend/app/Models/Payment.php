<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Paiement Mobile Money en ligne (acompte ou solde) */
#[Fillable(['order_id', 'provider', 'kind', 'amount', 'status', 'transaction_id', 'provider_ref', 'payload', 'paid_at'])]
class Payment extends Model
{
    protected $attributes = ['kind' => 'deposit', 'status' => 'pending', 'provider_ref' => null, 'payload' => null, 'paid_at' => null];

    protected function casts(): array
    {
        return ['amount' => 'integer', 'payload' => 'array', 'paid_at' => 'datetime'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
