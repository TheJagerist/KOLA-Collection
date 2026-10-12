<?php

namespace App\Services\Payments;

use App\Models\Payment;

/**
 * Simulateur de paiement pour le développement (KOLA_PAYMENT_DRIVER=fake).
 * Le client est envoyé sur une page du front qui permet de « réussir » ou « refuser » le paiement.
 */
class FakeGateway implements PaymentGateway
{
    public function initiate(Payment $payment, string $returnUrl, string $notifyUrl): string
    {
        $front = rtrim((string) config('app.frontend_url'), '/');

        return "{$front}/paiement/simulateur/{$payment->transaction_id}?retour=".urlencode($returnUrl);
    }

    public function check(Payment $payment): array
    {
        return ['status' => $payment->status, 'provider_ref' => $payment->provider_ref];
    }
}
