import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Copy } from 'lucide-react';
import { api, ApiError, type Order, type PaymentConfig, type PaymentMethod } from '../../lib/api';
import { fcfa, formatPhone, PAYMENT_LABEL } from '../../lib/format';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PhoneFillIcon, WhatsAppIcon } from '../ui/icons';
import { cn } from '../../lib/cn';

type Manual = NonNullable<PaymentConfig['manual']>;

const APP: Record<PaymentMethod, string> = { mtn: 'MTN MoMo', airtel: 'Airtel Money' };
const spaced = (n: string) => n.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* presse-papiers indisponible */
        }
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold transition',
        done ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-inverse text-on-inverse hover:opacity-90',
      )}
      aria-label={`Copier ${label}`}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {done ? 'Copié' : 'Copier'}
    </button>
  );
}

/**
 * Paiement de l'acompte par dépôt Mobile Money :
 * le client copie le numéro de Kōlā, envoie le montant depuis son téléphone,
 * puis déclare l'envoi. L'équipe est prévenue et valide après vérification.
 */
export function ManualPaymentModal({
  open,
  onClose,
  order,
  manual,
  onClaimed,
}: {
  open: boolean;
  onClose: () => void;
  order: Order;
  manual: Manual;
  onClaimed: (o: Order) => void;
}) {
  const kind = order.status === 'en_attente' ? 'deposit' : 'balance';
  const amount = kind === 'deposit' ? order.deposit : order.balance;
  const [op, setOp] = useState<PaymentMethod>(order.payment_method);
  const [payer, setPayer] = useState(spaced(order.payment_phone));
  const [txRef, setTxRef] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setDone(false);
      setError('');
    }
  }, [open]);

  const acc = manual[op];
  const fee = acc.fee_percent > 0 ? Math.ceil((amount * acc.fee_percent) / 100 / 5) * 5 : 0;
  const what = kind === 'deposit' ? 'l’acompte' : 'le solde';

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const o = await api.payments.claim(order.reference, { operator: op, payer_phone: payer, transaction_ref: txRef.trim() || null });
      setDone(true);
      onClaimed(o);
    } catch (e) {
      setError(e instanceof ApiError ? e.firstError() : 'Envoi impossible, réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const waText = `Bonjour Kōlā, j'ai envoyé ${what} de ${fcfa(amount)} pour la commande ${order.reference} par ${APP[op]} depuis le ${payer}${txRef ? ` (réf. ${txRef})` : ''}. Voici la capture du paiement.`;

  return (
    <Modal open={open} onClose={onClose} eyebrow={`Commande ${order.reference}`} title={done ? 'Merci, c’est noté !' : `Payer ${what} par Mobile Money`} className="sm:max-w-xl">
      {done ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[14.5px] text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            <p>
              L’équipe Kōlā a été prévenue. Dès que nous voyons {what} de <strong>{fcfa(amount)}</strong> arriver, nous validons votre commande et votre reçu se met à jour.
            </p>
          </div>
          {manual.whatsapp && (
            <a
              href={`https://wa.me/${manual.whatsapp}?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] text-[14.5px] font-semibold text-white hover:bg-[#1ebe5a]"
            >
              <WhatsAppIcon className="size-5" /> Envoyer la capture du paiement (facultatif)
            </a>
          )}
          <Button variant="outline" className="w-full" onClick={onClose}>
            Fermer
          </Button>
        </div>
      ) : (
        <div className="space-y-5 text-[14px]">
          {/* Opérateur */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-1 text-[13.5px] font-semibold">
            {(['mtn', 'airtel'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setOp(m)}
                className={cn('h-10 rounded-lg transition', op === m ? (m === 'mtn' ? 'bg-[#FFCC00] text-[#1a1a1a] shadow-sm' : 'bg-[#E40000] text-white shadow-sm') : 'text-ink-muted hover:text-ink')}
              >
                {PAYMENT_LABEL[m]}
              </button>
            ))}
          </div>

          {acc.number ? (
            <>
              {/* Numéro + montant à copier */}
              <div className="divide-y divide-line rounded-2xl border border-line">
                <div className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-ink-muted">Numéro {APP[op]} de Kōlā</div>
                    <div className="font-mono text-xl font-bold tracking-wide text-ink">{formatPhone(acc.number)}</div>
                    {acc.name && <div className="text-[12.5px] text-ink-muted">Au nom de : {acc.name}</div>}
                  </div>
                  <CopyButton value={acc.number} label="le numéro" />
                </div>
                <div className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-ink-muted">Montant à envoyer</div>
                    <div className="font-display text-2xl font-semibold text-rouille-600 tabular-nums">{fcfa(amount)}</div>
                    {fee > 0 && (
                      <div className="text-[12.5px] text-ink-muted">
                        + frais de transfert estimés ≈ {fcfa(fee)} ({acc.fee_percent} %), à votre charge
                      </div>
                    )}
                  </div>
                  <CopyButton value={String(amount)} label="le montant" />
                </div>
                <div className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-ink-muted">Motif / référence à indiquer</div>
                    <div className="font-mono text-[15px] font-semibold text-ink">{order.reference}</div>
                  </div>
                  <CopyButton value={order.reference} label="la référence" />
                </div>
              </div>

              {/* Étapes */}
              <ol className="space-y-2.5">
                {[
                  <>
                    Composez{' '}
                    {acc.ussd ? (
                      <a href={`tel:${encodeURIComponent(acc.ussd)}`} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 font-mono font-semibold text-ink">
                        <PhoneFillIcon className="size-3 text-emerald-600" /> {acc.ussd}
                      </a>
                    ) : (
                      'le menu'
                    )}{' '}
                    ou ouvrez l’application {APP[op]}.
                  </>,
                  <>
                    Choisissez <strong className="text-ink">Transfert d’argent</strong> et collez le numéro <strong className="text-ink">{spaced(acc.number)}</strong>.
                  </>,
                  <>
                    Envoyez exactement <strong className="text-ink">{fcfa(amount)}</strong>
                    {fee > 0 ? ' (les frais s’ajoutent automatiquement)' : ''} et indiquez <strong className="text-ink">{order.reference}</strong> en motif si on vous le demande.
                  </>,
                  <>Validez avec votre code secret, puis confirmez ci-dessous.</>,
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-ink-soft">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-inverse text-[12px] font-semibold text-on-inverse">{i + 1}</span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
              {manual.note && <p className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{manual.note}</p>}

              {/* Déclaration */}
              <div className="grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[12.5px] font-medium text-ink-muted">Numéro qui a envoyé l’argent</span>
                  <input className="field h-11 py-0" inputMode="tel" value={payer} onChange={(e) => setPayer(e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12.5px] font-medium text-ink-muted">Référence de la transaction (facultatif)</span>
                  <input className="field h-11 py-0" value={txRef} onChange={(e) => setTxRef(e.target.value)} placeholder="Reçue par SMS" maxLength={60} />
                </label>
              </div>
              {error && <p className="rounded-xl bg-rouille-50 px-4 py-3 text-[13.5px] font-medium text-rouille-600 dark:bg-rouille-500/10">{error}</p>}
              <Button size="lg" className="w-full" onClick={submit} loading={busy} icon={<Check className="size-4" />}>
                J’ai envoyé {what}
              </Button>
            </>
          ) : (
            <p className="rounded-2xl border border-dashed border-line p-4 text-ink-muted">
              Le numéro {APP[op]} de Kōlā n’est pas encore renseigné. {manual.whatsapp ? 'Écrivez-nous sur WhatsApp pour recevoir les instructions.' : 'Choisissez l’autre opérateur ou contactez-nous.'}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
