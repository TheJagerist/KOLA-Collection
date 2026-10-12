import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Smartphone, XCircle } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { fcfa } from '../lib/format';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/misc';

/**
 * Simulateur de paiement Mobile Money (développement uniquement, KOLA_PAYMENT_DRIVER=fake).
 * En production, le client est redirigé vers la page de paiement CinetPay à la place.
 */
export default function PaymentSimulator() {
  const { tx = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const back = params.get('retour') || '/compte';
  const { data, isLoading, error } = useQuery({ queryKey: ['payment', tx], queryFn: () => api.payments.status(tx) });
  const [busy, setBusy] = useState<'ok' | 'ko' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const finish = async (success: boolean) => {
    setBusy(success ? 'ok' : 'ko');
    setErr(null);
    try {
      await api.payments.fakeComplete(tx, success);
      const url = new URL(back, location.origin);
      url.searchParams.set('paiement', tx);
      navigate(url.pathname + url.search, { replace: true });
    } catch (e) {
      setErr(e instanceof ApiError ? e.firstError() : 'Le paiement n’a pas pu être simulé.');
      setBusy(null);
    }
  };

  return (
    <div className="container-k flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-sm rounded-[28px] border border-line bg-surface p-6 text-center shadow-xl sm:p-8">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          <Smartphone className="size-7" />
        </div>
        <div className="text-[11px] font-semibold tracking-[0.14em] text-amber-700 uppercase dark:text-amber-400">Simulateur · mode développement</div>
        <h1 className="mt-2 text-2xl">Paiement Mobile Money</h1>
        {isLoading ? (
          <Skeleton className="mx-auto mt-6 h-24" />
        ) : error || !data ? (
          <p className="mt-4 text-ink-muted">Transaction introuvable.</p>
        ) : (
          <>
            <p className="mt-3 text-[14px] text-ink-muted">
              {data.kind === 'deposit' ? 'Acompte' : 'Solde'} de la commande <span className="font-mono font-semibold text-ink">{data.reference}</span>
            </p>
            <div className="mt-4 font-display text-4xl font-semibold text-ink tabular-nums">{fcfa(data.amount)}</div>
            {data.status !== 'pending' ? (
              <p className="mt-5 text-[14px] text-ink-muted">Cette transaction est déjà {data.status === 'success' ? 'payée' : 'refusée'}.</p>
            ) : (
              <div className="mt-7 grid gap-2">
                <Button loading={busy === 'ok'} disabled={!!busy} onClick={() => finish(true)} icon={<CheckCircle2 className="size-4" />}>
                  Simuler un paiement réussi
                </Button>
                <Button variant="outline" loading={busy === 'ko'} disabled={!!busy} onClick={() => finish(false)} icon={<XCircle className="size-4" />}>
                  Simuler un refus
                </Button>
              </div>
            )}
            {err && <p className="mt-3 text-[13px] font-medium text-rouille-600">{err}</p>}
            <p className="mt-6 text-[12px] text-ink-muted">En production, cette étape est remplacée par la page sécurisée de l’opérateur (CinetPay).</p>
          </>
        )}
      </div>
    </div>
  );
}
