<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Historique d'une commande (statut, note interne, paiement, livraison) */
#[Fillable(['order_id', 'user_id', 'type', 'from_status', 'to_status', 'body', 'created_at'])]
class OrderEvent extends Model
{
    public const UPDATED_AT = null;

    protected $attributes = ['user_id' => null, 'from_status' => null, 'to_status' => null, 'body' => null];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
