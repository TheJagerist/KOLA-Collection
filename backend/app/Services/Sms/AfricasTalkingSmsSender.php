<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Envoi réel via Africa's Talking (couvre le Congo-Brazzaville).
 * KOLA_SMS_DRIVER=africastalking + AT_USERNAME, AT_API_KEY, AT_SENDER_ID (facultatif).
 */
class AfricasTalkingSmsSender implements SmsSender
{
    public function send(string $to, string $message): void
    {
        $cfg = config('kola.sms.africastalking');
        $sandbox = ($cfg['username'] ?? '') === 'sandbox';

        $res = Http::asForm()
            ->withHeaders(['apiKey' => (string) $cfg['api_key'], 'Accept' => 'application/json'])
            ->timeout(15)
            ->post($sandbox ? 'https://api.sandbox.africastalking.com/version1/messaging' : 'https://api.africastalking.com/version1/messaging', array_filter([
                'username' => $cfg['username'],
                'to' => '+242'.$to,
                'message' => $message,
                'from' => $cfg['sender_id'] ?: null,
            ]));

        if (! $res->successful()) {
            throw new RuntimeException('Envoi du SMS impossible ('.$res->status().').');
        }
    }
}
