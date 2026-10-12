<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Airtel = 'airtel';
    case Mtn = 'mtn';

    public function label(): string
    {
        return match ($this) {
            self::Airtel => 'Airtel Money',
            self::Mtn => 'MTN Mobile Money',
        };
    }
}
