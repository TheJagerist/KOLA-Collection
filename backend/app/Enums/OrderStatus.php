<?php

namespace App\Enums;

/**
 * Cycle de vie d'une commande :
 * en_attente (acompte non reçu) → validee (acompte reçu) → transit (en livraison) → livre (solde encaissé)
 * annulee possible à tout moment.
 */
enum OrderStatus: string
{
    case EnAttente = 'en_attente';
    case Validee = 'validee';
    case Transit = 'transit';
    case Livre = 'livre';
    case Annulee = 'annulee';

    public function label(): string
    {
        return match ($this) {
            self::EnAttente => 'En attente de paiement',
            self::Validee => 'Validée',
            self::Transit => 'En livraison',
            self::Livre => 'Livrée',
            self::Annulee => 'Annulée',
        };
    }
}
