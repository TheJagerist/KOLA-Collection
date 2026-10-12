<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Services\WhatsApp\WhatsAppAlerts;
use App\Support\Settings;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Paiement Mobile Money en ligne (acompte / solde) */
class PaymentController extends Controller
{
    /** GET /api/payments/config — le front sait s'il doit proposer le paiement en ligne */
    public function config(): JsonResponse
    {
        $p = Settings::get('payment');

        return response()->json(['data' => [
            'enabled' => PaymentService::enabled(),
            'driver' => config('kola.payments.driver'),
            // Paiement manuel : numéros sur lesquels le client dépose l'acompte, frais, consignes
            'manual' => [
                'mtn' => $p['mtn'],
                'airtel' => $p['airtel'],
                'note' => $p['note'],
                'whatsapp' => Settings::get('whatsapp')['shop_number'] ?: null,
            ],
        ]]);
    }

    /**
     * POST /api/orders/{reference}/payment-claim — le client déclare avoir envoyé l'acompte (ou le solde)
     * par Mobile Money. L'équipe est prévenue et vérifie la réception avant de valider.
     */
    public function claim(Request $request, string $reference): JsonResponse
    {
        $request->merge(['payer_phone' => preg_replace('/^(00)?242/', '', preg_replace('/\D/', '', (string) $request->input('payer_phone')))]);
        $data = $request->validate([
            'operator' => ['required', 'in:mtn,airtel'],
            'payer_phone' => ['required', 'regex:/^0\d{8}$/'],
            'transaction_ref' => ['nullable', 'string', 'max:60'],
            'kind' => ['nullable', 'in:deposit,balance'],
        ], [
            'payer_phone.required' => 'Indiquez le numéro qui a envoyé l’argent.',
            'payer_phone.regex' => 'Numéro invalide : 9 chiffres commençant par 0.',
        ]);
        $order = Order::query()->reference($reference)->where('user_id', $request->user()->id)->with('items.product', 'courier')->firstOrFail();
        abort_if(in_array($order->status, [OrderStatus::Annulee, OrderStatus::Livre], true), 422, 'Cette commande n’attend plus de paiement.');

        $kind = $data['kind'] ?? ($order->status === OrderStatus::EnAttente ? 'deposit' : 'balance');
        $amount = $kind === 'deposit' ? $order->deposit : $order->balance;
        $label = $data['operator'] === 'mtn' ? 'MTN MoMo' : 'Airtel Money';
        $order->forceFill(['payment_claim' => [
            'kind' => $kind,
            'amount' => $amount,
            'operator' => $data['operator'],
            'payer_phone' => $data['payer_phone'],
            'transaction_ref' => $data['transaction_ref'] ?? null,
            'at' => now()->toIso8601String(),
        ]])->save();

        $what = $kind === 'deposit' ? 'l’acompte' : 'le solde';
        $order->log('payment', "Le client déclare avoir envoyé {$what} (".number_format($amount, 0, ',', ' ')." FCFA) par {$label} depuis le {$data['payer_phone']}"
            .(! empty($data['transaction_ref']) ? " — réf. {$data['transaction_ref']}" : '').'. À vérifier.');

        WhatsAppAlerts::send("💰 Paiement déclaré — {$order->reference}\n{$label} : ".number_format($amount, 0, ',', ' ')." FCFA depuis le +242 {$data['payer_phone']}"
            .(! empty($data['transaction_ref']) ? "\nRéf. : {$data['transaction_ref']}" : '')."\nÀ vérifier puis valider : ".rtrim((string) config('app.frontend_url'), '/')."/admin/commandes?q={$order->reference}");

        return (new OrderResource($order->fresh()->load('items.product', 'courier')))->response();
    }

    /** POST /api/orders/{reference}/pay { kind: deposit|balance } → { url } */
    public function start(Request $request, string $reference, PaymentService $payments): JsonResponse
    {
        $data = $request->validate(['kind' => ['nullable', 'in:deposit,balance']]);
        $order = Order::query()->reference($reference)->where('user_id', $request->user()->id)->firstOrFail();
        ['payment' => $payment, 'url' => $url] = $payments->start($order, $data['kind'] ?? 'deposit');

        return response()->json(['data' => ['transaction_id' => $payment->transaction_id, 'amount' => $payment->amount, 'url' => $url]], 201);
    }

    /** GET /api/payments/{transaction} — état d'un paiement (revérifié auprès de l'agrégateur si en attente) */
    public function show(Request $request, string $transaction, PaymentService $payments): JsonResponse
    {
        $payment = $this->ownPayment($request, $transaction);
        $payment = $payments->sync($payment);

        return response()->json(['data' => $this->present($payment)]);
    }

    /** POST /api/payments/fake/{transaction} { success: bool } — simulateur (développement uniquement) */
    public function fakeComplete(Request $request, string $transaction, PaymentService $payments): JsonResponse
    {
        abort_unless(config('kola.payments.driver') === 'fake' && ! app()->isProduction(), 404);
        $data = $request->validate(['success' => ['required', 'boolean']]);
        $payment = $this->ownPayment($request, $transaction);
        $payment = $payments->apply($payment, $data['success'] ? 'success' : 'failed', 'SIMU-'.random_int(100000, 999999));

        return response()->json(['data' => $this->present($payment)]);
    }

    /**
     * POST /api/payments/cinetpay/notify — appel serveur à serveur de CinetPay.
     * On ne fait JAMAIS confiance au contenu : on revérifie le statut auprès de CinetPay.
     */
    public function cinetpayNotify(Request $request, PaymentService $payments): JsonResponse
    {
        $tx = (string) $request->input('cpm_trans_id', $request->input('transaction_id'));
        $payment = Payment::query()->where('transaction_id', $tx)->where('provider', 'cinetpay')->first();
        if ($payment) {
            $payments->sync($payment);
        }

        return response()->json(['ok' => true]);
    }

    private function ownPayment(Request $request, string $transaction): Payment
    {
        $user = $request->user();

        return Payment::query()->where('transaction_id', $transaction)
            ->when(! $user->is_admin, fn ($q) => $q->whereHas('order', fn ($o) => $o->where('user_id', $user->id)))
            ->with('order')
            ->firstOrFail();
    }

    private function present(Payment $p): array
    {
        return [
            'transaction_id' => $p->transaction_id,
            'kind' => $p->kind,
            'amount' => $p->amount,
            'status' => $p->status,
            'reference' => $p->order->reference,
            'paid_at' => $p->paid_at?->toIso8601String(),
        ];
    }
}
