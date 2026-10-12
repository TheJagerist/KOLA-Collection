<?php

namespace App\Http\Resources;

use App\Models\HomepageContent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin HomepageContent */
class HomepageContentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'hero_eyebrow' => $this->hero_eyebrow,
            'hero_title' => $this->hero_title,
            'hero_lede' => $this->hero_lede,
            'cta_primary_label' => $this->cta_primary_label,
        ];
    }
}
