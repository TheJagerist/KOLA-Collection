<?php

namespace App\Enums;

enum Niveau: string
{
    case College = 'college';
    case Lycee = 'lycee';

    public function label(): string
    {
        return match ($this) {
            self::College => 'Collège',
            self::Lycee => 'Lycée',
        };
    }
}
