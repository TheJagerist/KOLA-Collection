<?php

namespace App\Models;

use App\Enums\Category;
use App\Enums\Ensemble;
use App\Support\Media;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $slug
 * @property string $name
 * @property Ensemble $ensemble
 * @property Category $cat
 * @property array<int,string> $sizes
 * @property array<int,string> $niveaux
 * @property int $price
 * @property bool $is_archived
 */
#[Fillable([
    'collection_id', 'slug', 'name', 'ensemble', 'cat', 'sizes', 'stock', 'niveaux', 'price',
    'description', 'construction', 'badge', 'image_path', 'sketch_path', 'is_archived',
])]
class Product extends Model
{
    use HasFactory;

    protected $attributes = [
        'description' => null,
        'stock' => null,
        'construction' => null,
        'badge' => null,
        'image_path' => null,
        'sketch_path' => null,
        'order_count' => 0,
        'is_archived' => false,
    ];

    protected function casts(): array
    {
        return [
            'ensemble' => Ensemble::class,
            'cat' => Category::class,
            'sizes' => 'array',
            'stock' => 'array',
            'niveaux' => 'array',
            'construction' => 'array',
            'price' => 'integer',
            'order_count' => 'integer',
            'is_archived' => 'boolean',
        ];
    }

    /** Produits visibles sur la vitrine : collection active, non archivés */
    public function scopeVisible(Builder $q): Builder
    {
        return $q->where('is_archived', false)
            ->whereHas('collection', fn (Builder $c) => $c->where('is_active', true));
    }

    /** Le stock est-il suivi pour cet article ? (NULL = non suivi, vente illimitée) */
    public function tracksStock(): bool
    {
        return is_array($this->stock);
    }

    /** Quantité disponible pour une taille (null = illimité) */
    public function available(string $size): ?int
    {
        return $this->tracksStock() ? max(0, (int) ($this->stock[$size] ?? 0)) : null;
    }

    /** Ajoute (delta > 0) ou retire (delta < 0) du stock d'une taille ; ne descend jamais sous 0 */
    public function adjustStock(string $size, int $delta): void
    {
        if (! $this->tracksStock()) {
            return;
        }
        $stock = $this->stock;
        $stock[$size] = max(0, (int) ($stock[$size] ?? 0) + $delta);
        $this->stock = $stock;
        $this->save();
    }

    public function collection(): BelongsTo
    {
        return $this->belongsTo(Collection::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function imageUrl(): ?string
    {
        return Media::url($this->image_path);
    }

    public function sketchUrl(): ?string
    {
        return Media::url($this->sketch_path);
    }
}
