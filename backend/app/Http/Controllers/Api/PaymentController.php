<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
        return response()->json(['data' => ['enabled' => PaymentService::enabled(), 'driver' => config('kola.payments.driver')]]);
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
