<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Code promo (code renseigné) ou remise automatique (code NULL, ex. « remise famille dès 3 articles »).
 * type = percent (value = %) | amount (value = FCFA).
 */
#[Fillable(['code', 'label', 'type', 'value', 'min_items', 'min_total', 'is_active', 'starts_at', 'ends_at', 'max_uses'])]
class PromoCode extends Model
{
    protected $attributes = ['code' => null, 'min_items' => 0, 'min_total' => 0, 'is_active' => true, 'starts_at' => null, 'ends_at' => null, 'max_uses' => null, 'uses' => 0];

    protected function casts(): array
    {
        return [
            'value' => 'integer',
            'min_items' => 'integer',
            'min_total' => 'integer',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'max_uses' => 'integer',
            'uses' => 'integer',
        ];
    }

    /** Actives et dans leur période de validité, quota non atteint */
    public function scopeUsable(Builder $q): Builder
    {
        return $q->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
            ->where(fn ($q) => $q->whereNull('max_uses')->orWhereColumn('uses', '<', 'max_uses'));
    }

    public function isAutomatic(): bool
    {
        return $this->code === null;
    }

    /** Remise en FCFA pour un panier donné (0 si conditions non remplies) */
    public function discountFor(int $subtotal, int $itemCount): int
    {
        if ($itemCount < $this->min_items || $subtotal < $this->min_total) {
            return 0;
        }
        $d = $this->type === 'percent' ? (int) round($subtotal * $this->value / 100) : $this->value;

        return min($d, $subtotal);
    }
}
