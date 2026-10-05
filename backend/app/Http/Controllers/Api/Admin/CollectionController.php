<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * TODO (Manu) — Collections. Spécification : docs/API.md §6.
 * Brique prête : Collection::activate() (transaction + index unique « une seule active »).
 */
class CollectionController extends Controller
{
    /** GET /api/admin/collections — toutes, triées par created_at → CollectionResource::collection */
    public function index()
    {
        $this->todo('liste des collections');
    }

    /** POST /api/admin/collections { name } — slug = Str::slug(name), unique ; is_active = false ; 201 */
    public function store(Request $request)
    {
        $this->todo('création de collection');
    }

    /** POST /api/admin/collections/{collection}/activate — $collection->activate() → CollectionResource */
    public function activate(int $collection)
    {
        $this->todo('activation de collection');
    }
}
