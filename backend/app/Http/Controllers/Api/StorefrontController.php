<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CarouselImageResource;
use App\Http\Resources\CollectionResource;
use App\Http\Resources\HomepageContentResource;
use App\Models\Collection;
use Illuminate\Http\JsonResponse;

class StorefrontController extends Controller
{
    /** GET /api/storefront — contenu de la collection active pour la page d'accueil */
    public function __invoke(): JsonResponse
    {
        $collection = Collection::active()?->load(['homepage', 'carouselImages']);

        return response()->json([
            'collection' => $collection ? new CollectionResource($collection) : null,
            'homepage' => $collection?->homepage ? new HomepageContentResource($collection->homepage) : null,
            'carousel' => $collection ? CarouselImageResource::collection($collection->carouselImages) : [],
        ]);
    }
}
