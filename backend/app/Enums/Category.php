<?php

namespace App\Enums;

enum Category: string
{
    case Chemise = 'chemise';
    case Pantalon = 'pantalon';
    case Jupe = 'jupe';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
