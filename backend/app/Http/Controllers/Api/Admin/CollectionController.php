<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CollectionResource;
use App\Models\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CollectionController extends Controller
{
    public function index()
    {
        $collections = Collection::query()->oldest()->get();

        return CollectionResource::collection($collections);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $slug = Str::slug($data['name']);

        $request->validate([
            'name' => [
                \Illuminate\Validation\Rule::unique('collections', 'slug')->where(
                    fn ($q) => $q->where('slug', $slug)
                ),
            ],
        ]);

        $collection = Collection::create([
            'name' => $data['name'],
            'slug' => $slug,
            'is_active' => false,
        ]);

        return new CollectionResource($collection);
    }

    public function activate(Collection $collection)
    {
        $collection->activate();

        return new CollectionResource($collection->fresh());
    }
}