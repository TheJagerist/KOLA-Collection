<?php

namespace App\Services\Payments;

use App\Models\Payment;

/** Un agrégateur Mobile Money (Airtel Money / MTN MoMo) */
interface PaymentGateway
{
    /** Démarre le paiement et renvoie l'URL où envoyer le client */
    public function initiate(Payment $payment, string $returnUrl, string $notifyUrl): string;

    /** Interroge l'agrégateur : 'success' | 'failed' | 'pending' (+ référence opérateur éventuelle) */
    public function check(Payment $payment): array;
}
