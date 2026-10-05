<?php

namespace App\Http\Resources;

use App\Models\CarouselImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CarouselImage */
class CarouselImageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'image_url' => $this->url(),
            'position' => $this->position,
        ];
    }
}
