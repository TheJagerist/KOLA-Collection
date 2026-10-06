<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CarouselImageResource;
use App\Models\CarouselImage;
use App\Models\Collection;
use App\Support\Media;
use Illuminate\Http\Request;

class CarouselController extends Controller
{
    public function index()
    {
        $active = Collection::active();

        if (! $active) {
            return CarouselImageResource::collection(collect());
        }

        return CarouselImageResource::collection(
            $active->carouselImages
        );
    }

    public function store(Request $request)
    {
        $active = Collection::active();

        if (! $active) {
            return response()->json([
                'message' => 'Aucune collection active.',
            ], 409);
        }

        $request->validate([
            'images'   => ['required', 'array', 'min:1'],
            'images.*' => ['image', 'max:10240'],
        ]);

        $maxPosition = $active->carouselImages()->max('position') ?? 0;

        foreach ($request->file('images') as $file) {
            $path = Media::store($file, 'carousel');
            CarouselImage::create([
                'collection_id' => $active->id,
                'path'          => $path,
                'position'      => ++$maxPosition,
            ]);
        }

        return CarouselImageResource::collection(
            $active->carouselImages()->get()
        );
    }

    public function destroy(CarouselImage $image)
    {
        Media::delete($image->path);
        $image->delete();

        return response()->noContent();
    }

    public function reorder(Request $request)
    {
        $active = Collection::active();

        $data = $request->validate([
            'ids'   => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);

        foreach ($data['ids'] as $position => $id) {
            CarouselImage::where('id', $id)
                ->where('collection_id', $active?->id)
                ->update(['position' => $position + 1]);
        }

        return CarouselImageResource::collection(
            $active?->carouselImages()->get() ?? collect()
        );
    }
}