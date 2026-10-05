<?php

namespace App\Http\Controllers;

abstract class Controller
{
    /**
     * Marque un endpoint prévu mais pas encore développé (HTTP 501).
     * À supprimer au fur et à mesure que les TODO sont traités.
     */
    protected function todo(string $what): never
    {
        abort(501, "Pas encore implémenté : {$what}. Voir README-MANU.md à la racine du dépôt.");
    }
}
