<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;
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
    'reference', 'user_id', 'status', 'subtotal', 'discount', 'promo_code', 'promo_label', 'source', 'created_by',
    'total', 'deposit', 'balance', 'balance_paid',
    'payment_method', 'payment_phone', 'delivery_city', 'delivery_address', 'delivered_at',
    'courier_id', 'delivery_date', 'delivery_slot', 'deposit_paid_at',
])]
class Order extends Model
{
    use HasFactory;

    protected $attributes = [
        'status' => 'en_attente',
        'balance_paid' => false,
        'delivered_at' => null,
        'subtotal' => 0,
        'discount' => 0,
        'promo_code' => null,
        'promo_label' => null,
        'source' => 'web',
        'created_by' => null,
        'courier_id' => null,
        'delivery_date' => null,
        'delivery_slot' => null,
        'deposit_paid_at' => null,
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
            'subtotal' => 'integer',
            'discount' => 'integer',
            'delivery_date' => 'date',
            'deposit_paid_at' => 'datetime',
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

    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class)->latest('created_at')->latest('id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function courier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'courier_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Ajoute une ligne à l'historique (auteur = utilisateur connecté par défaut) */
    public function log(string $type, ?string $body = null, ?string $from = null, ?string $to = null, ?int $userId = null): OrderEvent
    {
        return $this->events()->create([
            'user_id' => $userId ?? auth()->id(),
            'type' => $type,
            'from_status' => $from,
            'to_status' => $to,
            'body' => $body,
            'created_at' => now(),
        ]);
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
    public function transitionTo(OrderStatus $status, ?string $note = null): void
    {
        $from = $this->status;
        if ($from === $status) {
            return;
        }

        DB::transaction(function () use ($from, $status, $note) {
            $this->status = $status;
            $this->balance_paid = $status === OrderStatus::Livre;
            $this->delivered_at = $status === OrderStatus::Livre ? now() : null;
            // Acompte considéré comme reçu dès qu'on sort de « en attente » (hors annulation)
            if ($from === OrderStatus::EnAttente && $status !== OrderStatus::Annulee && ! $this->deposit_paid_at) {
                $this->deposit_paid_at = now();
            }
            if ($status === OrderStatus::EnAttente) {
                $this->deposit_paid_at = null;
            }
            $this->save();

            // Stock : une annulation rend les articles, une réactivation les reprend
            if ($status === OrderStatus::Annulee) {
                app(StockService::class)->release($this);
            } elseif ($from === OrderStatus::Annulee) {
                app(StockService::class)->reserve($this, strict: false);
            }

            $this->log('status', $note, $from->value, $status->value);
        });
    }

    public function scopeReference($q, string $ref)
    {
        return $q->where('reference', Str::upper($ref));
    }
}
