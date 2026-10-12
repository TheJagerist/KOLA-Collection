<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

#[Fillable(['slug', 'name', 'is_active'])]
class Collection extends Model
{
    use HasFactory;

    protected $attributes = ['is_active' => false];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** La collection actuellement visible sur le site (ou null) */
    public static function active(): ?self
    {
        return static::query()->where('is_active', true)->first();
    }

    public function scopeIsActive(Builder $q): Builder
    {
        return $q->where('is_active', true);
    }

    /** Active cette collection et désactive les autres, de façon atomique */
    public function activate(): void
    {
        DB::transaction(function () {
            static::query()->where('id', '!=', $this->id)->update(['is_active' => false]);
            $this->forceFill(['is_active' => true])->save();
        });
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function homepage(): HasOne
    {
        return $this->hasOne(HomepageContent::class);
    }

    public function carouselImages(): HasMany
    {
        return $this->hasMany(CarouselImage::class)->orderBy('position');
    }
}
