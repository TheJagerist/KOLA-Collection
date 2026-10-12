<?php

namespace App\Enums;

/** Profil choisi à l'inscription */
enum Role: string
{
    case Parent = 'parent';
    case Eleve = 'eleve';
}
