<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CollectionResource;
use App\Models\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

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

        // Le nom donne le slug : on vérifie l'unicité sur le slug (sinon erreur SQL 500)
        validator(['slug' => $slug], ['slug' => [Rule::unique('collections', 'slug')]], [
            'slug.unique' => 'Une collection porte déjà ce nom.',
        ])->validate();

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
