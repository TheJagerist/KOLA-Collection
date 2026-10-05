<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/** TODO (Manu) — Textes du hero de l'accueil. Spécification : docs/API.md §6. */
class HomepageController extends Controller
{
    /**
     * PUT /api/admin/homepage { hero_eyebrow, hero_title*, hero_lede, cta_primary_label }
     * - 409 si aucune collection active (Collection::active() === null)
     * - HomepageContent::updateOrCreate(['collection_id' => ...], $data)
     * - retour : HomepageContentResource
     */
    public function update(Request $request)
    {
        $this->todo("mise à jour du contenu d'accueil");
    }
}
