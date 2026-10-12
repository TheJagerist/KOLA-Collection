<?php

namespace App\Enums;

/**
 * Rôles de l'équipe (comptes is_admin) :
 * - gerant      : accès complet (catalogue, promos, équipe, vitrine…)
 * - preparateur : commandes (préparation, statuts, notes, commandes manuelles)
 * - livreur     : uniquement ses livraisons
 */
enum StaffRole: string
{
    case Gerant = 'gerant';
    case Preparateur = 'preparateur';
    case Livreur = 'livreur';

    public function label(): string
    {
        return match ($this) {
            self::Gerant => 'Gérant',
            self::Preparateur => 'Préparateur',
            self::Livreur => 'Livreur',
        };
    }
}
