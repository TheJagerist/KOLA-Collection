<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * TODO (Manu) — CRUD produits de la collection active. Spécification : docs/API.md §6.
 * Le front envoie du multipart : name, price, ensemble, cat, sizes[], niveaux[], description,
 * construction[], badge, image (fichier), sketch (fichier). Mise à jour en POST + _method=PUT.
 * Briques prêtes : Media::store('products' | 'sketches'), ProductResource, contrainte FK restrict sur order_items.
 */
class ProductController extends Controller
{
    /** GET /api/admin/products — tous les produits de la collection active, archivés compris */
    public function index()
    {
        $this->todo('liste des produits (admin)');
    }

    /** POST /api/admin/products — slug unique généré depuis le nom ; 201 + ProductResource */
    public function store(Request $request)
    {
        $this->todo("création d'un produit");
    }

    /** PUT /api/admin/products/{product} — mise à jour partielle ; remplacer les images si fournies (supprimer l'ancien fichier) */
    public function update(Request $request, int $product)
    {
        $this->todo("modification d'un produit");
    }

    /**
     * DELETE /api/admin/products/{product}
     * - si le produit a des order_items → is_archived = true, retour { archived: true }
     * - sinon suppression réelle (+ fichiers), retour { archived: false }
     */
    public function destroy(int $product)
    {
        $this->todo("suppression d'un produit");
    }

    /** POST /api/admin/products/{product}/restore — is_archived = false → ProductResource */
    public function restore(int $product)
    {
        $this->todo("réactivation d'un produit");
    }
}
