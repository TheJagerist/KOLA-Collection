<?php

namespace App\Services\Payments;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Paiement Mobile Money en ligne de l'acompte (ou du solde).
 * Une fois confirmé par l'agrégateur, la commande avance toute seule :
 * acompte payé → « validée » ; solde payé → solde marqué encaissé.
 */
class PaymentService
{
    public static function enabled(): bool
    {
        return in_array(config('kola.payments.driver'), ['fake', 'cinetpay'], true);
    }

    public function gateway(?string $driver = null): PaymentGateway
    {
        return match ($driver ?? config('kola.payments.driver')) {
            'fake' => new FakeGateway,
            'cinetpay' => new CinetPayGateway,
            default => throw ValidationException::withMessages(['payment' => 'Le paiement en ligne n’est pas activé.']),
        };
    }

    /** @return array{payment: Payment, url: string} */
    public function start(Order $order, string $kind = 'deposit'): array
    {
        $amount = match (true) {
            $kind === 'deposit' && $order->status === OrderStatus::EnAttente => $order->deposit,
            $kind === 'balance' && in_array($order->status, [OrderStatus::Validee, OrderStatus::Transit], true) && ! $order->balance_paid => $order->balance,
            default => throw ValidationException::withMessages(['payment' => $kind === 'deposit' ? 'L’acompte de cette commande est déjà réglé.' : 'Le solde ne peut pas être réglé pour cette commande.']),
        };

        $payment = $order->payments()->create([
            'provider' => config('kola.payments.driver'),
            'kind' => $kind,
            'amount' => $amount,
            'transaction_id' => 'KOLA'.now()->format('ymd').Str::upper(Str::random(10)),
        ]);

        $front = rtrim((string) config('app.frontend_url'), '/');
        $url = $this->gateway($payment->provider)->initiate(
            $payment,
            "{$front}/commande/confirmation/{$order->reference}?paiement={$payment->transaction_id}",
            rtrim((string) config('app.url'), '/').'/api/payments/'.$payment->provider.'/notify',
        );

        return ['payment' => $payment, 'url' => $url];
    }

    /** Revérifie auprès de l'agrégateur et applique le résultat (idempotent) */
    public function sync(Payment $payment): Payment
    {
        if ($payment->status !== 'pending') {
            return $payment;
        }
        $r = $this->gateway($payment->provider)->check($payment);

        return $this->apply($payment, $r['status'], $r['provider_ref'] ?? null, $r['payload'] ?? null);
    }

    public function apply(Payment $payment, string $status, ?string $ref = null, ?array $payload = null): Payment
    {
        return DB::transaction(function () use ($payment, $status, $ref, $payload) {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            if ($payment->status !== 'pending' || $status === 'pending') {
                return $payment;
            }

            $payment->forceFill([
                'status' => $status,
                'provider_ref' => $ref ?? $payment->provider_ref,
                'payload' => $payload ?? $payment->payload,
                'paid_at' => $status === 'success' ? now() : null,
            ])->save();

            $order = $payment->order;
            $fcfa = number_format($payment->amount, 0, ',', ' ').' FCFA';
            if ($status !== 'success') {
                $order->log('payment', "Paiement Mobile Money échoué ({$fcfa})", userId: $order->user_id);

                return $payment;
            }

            $label = $payment->kind === 'deposit' ? 'Acompte' : 'Solde';
            $note = "{$label} de {$fcfa} payé en ligne".($ref ? " (réf. {$ref})" : '');
            if ($payment->kind === 'deposit' && $order->status === OrderStatus::EnAttente) {
                auth()->setUser($order->user); // l'historique attribue le paiement au client
                $order->transitionTo(OrderStatus::Validee, $note);
            } elseif ($payment->kind === 'balance') {
                $order->forceFill(['balance_paid' => true])->save();
                $order->log('payment', $note, userId: $order->user_id);
            } else {
                $order->log('payment', $note, userId: $order->user_id);
            }

            return $payment;
        });
    }
}
