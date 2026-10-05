<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $reference
 * @property OrderStatus $status
 * @property int $total
 * @property int $deposit
 * @property int $balance
 * @property bool $balance_paid
 */
#[Fillable([
    'reference', 'user_id', 'status', 'total', 'deposit', 'balance', 'balance_paid',
    'payment_method', 'payment_phone', 'delivery_city', 'delivery_address', 'delivered_at',
])]
class Order extends Model
{
    use HasFactory;

    protected $attributes = [
        'status' => 'en_attente',
        'balance_paid' => false,
        'delivered_at' => null,
    ];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'payment_method' => PaymentMethod::class,
            'total' => 'integer',
            'deposit' => 'integer',
            'balance' => 'integer',
            'balance_paid' => 'boolean',
            'delivered_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** Référence lisible unique : KLA-2026-7F3K9Q (sans 0/O/1/I pour éviter les confusions) */
    public static function generateReference(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        do {
            $code = '';
            for ($i = 0; $i < 6; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $ref = 'KLA-'.now()->year.'-'.$code;
        } while (static::query()->where('reference', $ref)->exists());

        return $ref;
    }

    /**
     * Change le statut en appliquant les règles métier :
     * « livre » = solde encaissé ; tout autre statut remet ces champs à zéro.
     */
    public function transitionTo(OrderStatus $status): void
    {
        $this->status = $status;
        $this->balance_paid = $status === OrderStatus::Livre;
        $this->delivered_at = $status === OrderStatus::Livre ? now() : null;
        $this->save();
    }

    public function scopeReference($q, string $ref)
    {
        return $q->where('reference', Str::upper($ref));
    }
}
