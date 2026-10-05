<?php

namespace App\Enums;

enum Ensemble: string
{
    case Garcon = 'garcon';
    case Fille = 'fille';

    public function label(): string
    {
        return match ($this) {
            self::Garcon => 'Garçon',
            self::Fille => 'Fille',
        };
    }
}
