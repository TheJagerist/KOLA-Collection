<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * TODO (Manu) — Images du carrousel de la collection active. Spécification : docs/API.md §6.
 * Briques prêtes : App\Support\Media::store()/delete(), CarouselImageResource.
 */
class CarouselController extends Controller
{
    /** GET /api/admin/carousel — images de la collection active, triées par position */
    public function index()
    {
        $this->todo('liste du carrousel');
    }

    /**
     * POST /api/admin/carousel (multipart images[]) — validation 'images.*' => image|max:10240
     * Ajout en fin de liste (position = max + 1). Retour : la liste complète.
     */
    public function store(Request $request)
    {
        $this->todo("ajout d'images au carrousel");
    }

    /** DELETE /api/admin/carousel/{image} — supprimer aussi le fichier (Media::delete) ; 204 */
    public function destroy(int $image)
    {
        $this->todo("suppression d'une image du carrousel");
    }

    /** POST /api/admin/carousel/reorder { ids: [3,1,2] } — position = index + 1 ; retour : la liste */
    public function reorder(Request $request)
    {
        $this->todo('réorganisation du carrousel');
    }
}
