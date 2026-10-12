<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Collection;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Stock par taille */
class StockController extends Controller
{
    /** PUT /api/admin/products/{product}/stock { stock: {"12": 4, ...} | null } — null = ne plus suivre le stock */
    public function update(Request $request, Product $product): ProductResource
    {
        $data = $request->validate([
            'stock' => ['present', 'nullable', 'array'],
            'stock.*' => ['integer', 'min:0', 'max:100000'],
        ], ['stock.*.integer' => 'Le stock doit être un nombre entier.', 'stock.*.min' => 'Le stock ne peut pas être négatif.']);

        $stock = null;
        if (is_array($data['stock'])) {
            // On ne garde que les tailles de l'article
            $stock = [];
            foreach ($product->sizes as $size) {
                $stock[$size] = (int) ($data['stock'][$size] ?? 0);
            }
        }
        $product->forceFill(['stock' => $stock])->save();

        return new ProductResource($product->fresh());
    }

    /** GET /api/admin/stock/low — tailles au stock bas ou épuisées (collection active) */
    public function low(): JsonResponse
    {
        $threshold = (int) config('kola.low_stock', 3);
        $rows = [];
        $collection = Collection::active();
        $products = $collection ? $collection->products()->where('is_archived', false)->whereNotNull('stock')->get() : collect();
        foreach ($products as $p) {
            foreach ($p->sizes as $size) {
                $qty = $p->available($size);
                if ($qty !== null && $qty <= $threshold) {
                    $rows[] = ['product_id' => $p->id, 'name' => $p->name, 'image_url' => $p->imageUrl(), 'size' => $size, 'qty' => $qty];
                }
            }
        }
        usort($rows, fn ($a, $b) => $a['qty'] <=> $b['qty']);

        return response()->json(['data' => $rows, 'threshold' => $threshold]);
    }
}
