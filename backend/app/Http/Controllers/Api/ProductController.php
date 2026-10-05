<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    /**
     * GET /api/products?ensemble[]=garcon&cat[]=chemise&niveau[]=lycee&sort=prix
     * Produits visibles (collection active, non archivés).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'ensemble' => ['array'], 'ensemble.*' => ['in:garcon,fille'],
            'cat' => ['array'], 'cat.*' => ['in:chemise,pantalon,jupe'],
            'niveau' => ['array'], 'niveau.*' => ['in:college,lycee'],
            'sort' => ['nullable', 'in:populaires,prix,nouveautes'],
        ]);

        $query = Product::query()->visible();

        if (! empty($filters['ensemble'])) {
            $query->whereIn('ensemble', $filters['ensemble']);
        }
        if (! empty($filters['cat'])) {
            $query->whereIn('cat', $filters['cat']);
        }
        if (! empty($filters['niveau'])) {
            // Au moins un des niveaux demandés (colonne JSON)
            $query->where(function ($q) use ($filters) {
                foreach ($filters['niveau'] as $n) {
                    $q->orWhereJsonContains('niveaux', $n);
                }
            });
        }

        match ($filters['sort'] ?? 'populaires') {
            'prix' => $query->orderBy('price')->orderBy('id'),
            'nouveautes' => $query->latest()->orderByDesc('id'),
            default => $query->orderByDesc('order_count')->orderBy('id'),
        };

        return ProductResource::collection($query->get());
    }

    /** GET /api/products/{idOrSlug} */
    public function show(string $idOrSlug): ProductResource
    {
        $product = Product::query()->visible()
            ->where(fn ($q) => ctype_digit($idOrSlug) ? $q->whereKey((int) $idOrSlug) : $q->where('slug', $idOrSlug))
            ->firstOrFail();

        return new ProductResource($product);
    }
}
