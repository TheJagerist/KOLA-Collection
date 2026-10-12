<?php

namespace App\Services\Sms;

interface SmsSender
{
    /** @param string $to numéro local à 9 chiffres (06…) */
    public function send(string $to, string $message): void;
}
