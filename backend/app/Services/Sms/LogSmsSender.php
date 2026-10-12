<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

/** Développement : le SMS est écrit dans storage/logs/laravel.log au lieu d'être envoyé */
class LogSmsSender implements SmsSender
{
    public function send(string $to, string $message): void
    {
        Log::info("[SMS → +242 {$to}] {$message}");
    }
}
