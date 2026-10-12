<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * CinetPay (Airtel Money / MTN MoMo au Congo, devise XAF).
 * Doc : https://docs.cinetpay.com — init : POST /payment ; vérification : POST /payment/check.
 * Réglages : CINETPAY_SITE_ID, CINETPAY_API_KEY (config/kola.php).
 */
class CinetPayGateway implements PaymentGateway
{
    private function cfg(string $key): string
    {
        $v = (string) config("kola.payments.cinetpay.$key");
        if ($v === '') {
            throw new RuntimeException("Paiement en ligne : CINETPAY_".strtoupper($key).' manquant dans .env');
        }

        return $v;
    }

    public function initiate(Payment $payment, string $returnUrl, string $notifyUrl): string
    {
        $order = $payment->order()->with('user')->first();
        $res = Http::acceptJson()->timeout(20)->post($this->cfg('base_url').'/payment', [
            'apikey' => $this->cfg('api_key'),
            'site_id' => $this->cfg('site_id'),
            'transaction_id' => $payment->transaction_id,
            'amount' => $payment->amount,
            'currency' => 'XAF',
            'description' => ($payment->kind === 'deposit' ? 'Acompte' : 'Solde').' commande '.$order->reference,
            'customer_name' => $order->user->full_name,
            'customer_phone_number' => '+242'.$order->payment_phone,
            'channels' => 'MOBILE_MONEY',
            'notify_url' => $notifyUrl,
            'return_url' => $returnUrl,
            'lang' => 'fr',
            'metadata' => $order->reference,
        ]);

        $url = $res->json('data.payment_url');
        if (! $res->successful() || ! $url) {
            throw new RuntimeException('CinetPay : '.($res->json('message') ?? 'initialisation refusée'));
        }

        return $url;
    }

    public function check(Payment $payment): array
    {
        $res = Http::acceptJson()->timeout(20)->post($this->cfg('base_url').'/payment/check', [
            'apikey' => $this->cfg('api_key'),
            'site_id' => $this->cfg('site_id'),
            'transaction_id' => $payment->transaction_id,
        ]);

        $status = strtoupper((string) $res->json('data.status'));

        return [
            'status' => match ($status) {
                'ACCEPTED' => 'success',
                'REFUSED', 'CANCELED', 'CANCELLED' => 'failed',
                default => 'pending',
            },
            'provider_ref' => $res->json('data.operator_id') ?? $res->json('data.payment_method'),
            'payload' => $res->json(),
        ];
    }
}
