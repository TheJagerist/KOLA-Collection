<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Product */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'collection_id' => $this->collection_id,
            'slug' => $this->slug,
            'name' => $this->name,
            'ensemble' => $this->ensemble->value,
            'cat' => $this->cat->value,
            'sizes' => $this->sizes ?? [],
            'niveaux' => $this->niveaux ?? [],
            'price' => $this->price,
            'description' => $this->description,
            'construction' => $this->construction ?? [],
            'badge' => $this->badge,
            'image_url' => $this->imageUrl(),
            'sketch_url' => $this->sketchUrl(),
            'order_count' => $this->order_count,
            'is_archived' => (bool) $this->is_archived,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
