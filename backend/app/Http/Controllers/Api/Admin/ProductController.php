<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\Category;
use App\Enums\Ensemble;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Collection;
use App\Models\Product;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index()
    {
        $active = Collection::active();

        if (! $active) {
            return ProductResource::collection(collect());
        }

        $products = $active->products()->orderBy('order_count', 'desc')->get();

        return ProductResource::collection($products);
    }

    public function store(Request $request)
    {
        $active = Collection::active();

        if (! $active) {
            return response()->json(['message' => 'Aucune collection active.'], 409);
        }

        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'price'         => ['required', 'integer', 'min:0'],
            'ensemble'      => ['required', Rule::enum(Ensemble::class)],
            'cat'           => ['required', Rule::enum(Category::class)],
            'sizes'         => ['nullable', 'array'],
            'sizes.*'       => ['string'],
            'niveaux'       => ['nullable', 'array'],
            'niveaux.*'     => ['string'],
            'description'   => ['nullable', 'string'],
            'construction'  => ['nullable', 'array'],
            'construction.*'=> ['string'],
            'badge'         => ['nullable', 'string', 'max:100'],
            'image'         => ['nullable', 'image', 'max:10240'],
            'sketch'        => ['nullable', 'image', 'max:10240'],
        ]);

        $slug = $this->uniqueSlug($data['name']);

        $product = Product::create([
            'collection_id' => $active->id,
            'slug'          => $slug,
            'name'          => $data['name'],
            'price'         => $data['price'],
            'ensemble'      => $data['ensemble'],
            'cat'           => $data['cat'],
            'sizes'         => $data['sizes'] ?? [],
            'niveaux'       => $data['niveaux'] ?? [],
            'description'   => $data['description'] ?? null,
            'construction'  => $data['construction'] ?? [],
            'badge'         => $data['badge'] ?? null,
            'image_path'    => $request->hasFile('image')
                ? Media::store($request->file('image'), 'products')
                : null,
            'sketch_path'   => $request->hasFile('sketch')
                ? Media::store($request->file('sketch'), 'products/sketches')
                : null,
        ]);

        return new ProductResource($product);
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'name'          => ['sometimes', 'string', 'max:255'],
            'price'         => ['sometimes', 'integer', 'min:0'],
            'ensemble'      => ['sometimes', Rule::enum(Ensemble::class)],
            'cat'           => ['sometimes', Rule::enum(Category::class)],
            'sizes'         => ['sometimes', 'array'],
            'sizes.*'       => ['string'],
            'niveaux'       => ['sometimes', 'array'],
            'niveaux.*'     => ['string'],
            'description'   => ['sometimes', 'nullable', 'string'],
            'construction'  => ['sometimes', 'array'],
            'construction.*'=> ['string'],
            'badge'         => ['sometimes', 'nullable', 'string', 'max:100'],
            'image'         => ['sometimes', 'image', 'max:10240'],
            'sketch'        => ['sometimes', 'image', 'max:10240'],
        ]);

        if ($request->hasFile('image')) {
            Media::delete($product->image_path);
            $data['image_path'] = Media::store($request->file('image'), 'products');
            unset($data['image']);
        }

        if ($request->hasFile('sketch')) {
            Media::delete($product->sketch_path);
            $data['sketch_path'] = Media::store($request->file('sketch'), 'products/sketches');
            unset($data['sketch']);
        }

        $product->update($data);

        return new ProductResource($product->fresh());
    }

    public function destroy(Product $product)
    {
        if ($product->orderItems()->exists()) {
            $product->update(['is_archived' => true]);

            return response()->json(['archived' => true]);
        }

        Media::delete($product->image_path);
        Media::delete($product->sketch_path);
        $product->delete();

        return response()->json(['archived' => false]);
    }

    public function restore(Product $product)
    {
        $product->update(['is_archived' => false]);

        return new ProductResource($product->fresh());
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;

        while (Product::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}