<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\HomepageContentResource;
use App\Models\Collection;
use App\Models\HomepageContent;
use Illuminate\Http\Request;

class HomepageController extends Controller
{
    public function update(Request $request)
    {
        $active = Collection::active();

        if (! $active) {
            return response()->json([
                'message' => 'Aucune collection active. Activez une collection avant de modifier le contenu.',
            ], 409);
        }

        $data = $request->validate([
            'hero_eyebrow'      => ['nullable', 'string', 'max:255'],
            'hero_title'        => ['required', 'string', 'max:255'],
            'hero_lede'         => ['nullable', 'string'],
            'cta_primary_label' => ['nullable', 'string', 'max:100'],
        ]);

        $content = HomepageContent::updateOrCreate(
            ['collection_id' => $active->id],
            $data
        );

        return new HomepageContentResource($content);
    }
}