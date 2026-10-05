<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['collection_id', 'hero_eyebrow', 'hero_title', 'hero_lede', 'cta_primary_label'])]
class HomepageContent extends Model
{
    public function collection(): BelongsTo
    {
        return $this->belongsTo(Collection::class);
    }
}
