<?php

namespace App\Models;

use App\Support\Media;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['collection_id', 'path', 'position'])]
class CarouselImage extends Model
{
    protected function casts(): array
    {
        return ['position' => 'integer'];
    }

    public function collection(): BelongsTo
    {
        return $this->belongsTo(Collection::class);
    }

    public function url(): ?string
    {
        return Media::url($this->path);
    }
}
