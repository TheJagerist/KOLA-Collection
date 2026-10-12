import { useEffect, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Check, CreditCard, Download, FileText, Loader2, MapPin, Phone, Truck, User as UserIcon, Wallet, XCircle } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Order } from '../lib/api';
import { qk, useMyOrder } from '../hooks/queries';
import { useAuth } from '../stores/auth';
import { orderWhatsAppLink } from '../lib/whatsapp';
import { fcfa, formatDateTime, formatPhone, NIVEAU_LABEL, paidAmounts, PAYMENT_LABEL, paymentState } from '../lib/format';
import { Button, ButtonLink } from '../components/ui/Button';
import { PaymentBadge, Skeleton, StatusBadge } from '../components/ui/misc';
import { WhatsAppIcon } from '../components/ui/icons';
import { toast } from '../stores/toast';
import { cn } from '../lib/cn';

export default function OrderConfirmation() {
  const { reference = '' } = useParams();
  const state = useLocation().state as { order?: Order } | null;
  const query = useMyOrder(reference);
  // Les données fraîches du serveur priment (le statut a pu changer depuis)
  const order = query.data ?? state?.order;
  const user = useAuth((s) => s.user);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!order) return;
    setBusy(true);
    try {
      const { downloadReceiptPdf } = await import('../lib/receipt');
      await downloadReceiptPdf(order, { customerName: user?.full_name, customerUsername: user?.username });
      toast.success('Reçu téléchargé');
    } catch {
      toast.error("Le reçu n'a pas pu être généré. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  // Paiement Mobile Money en ligne (CinetPay en production, simulateur en dev)
  const { data: payCfg } = useQuery({ queryKey: ['payments-config'], queryFn: () => api.payments.config(), staleTime: 300_000, retry: false });
  const [params, setParams] = useSearchParams();
  const tx = params.get('paiement');
  const qc = useQueryClient();
  const payment = useQuery({
    queryKey: ['payment', tx],
    queryFn: () => api.payments.status(tx!),
    enabled: !!tx,
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 2500 : false),
  });
  useEffect(() => {
    if (payment.data && payment.data.status !== 'pending') {
      qc.invalidateQueries({ queryKey: qk.myOrder(reference) });
      qc.invalidateQueries({ queryKey: qk.myOrders });
    }
  }, [payment.data, qc, reference]);
  const [paying, setPaying] = useState(false);
  const pay = async (kind: 'deposit' | 'balance') => {
    if (!order) return;
    setPaying(true);
    try {
      const r = await api.payments.start(order.reference, kind);
      window.location.assign(r.url);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.firstError() : 'Le paiement en ligne est indisponible.');
      setPaying(false);
    }
  };

  const ps = order ? paymentState(order) : 'impaye';
  const amounts = order ? paidAmounts(order) : { paid: 0, due: 0 };
  const isNew = !!state?.order;

  return (
    <div className="container-k max-w-3xl py-12 sm:py-16">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className={cn(
          'mx-auto grid size-20 place-items-center rounded-full',
          ps === 'paye' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        )}
      >
        <Check className="size-10" strokeWidth={2.5} />
      </motion.div>
      <h1 className="mt-6 text-center text-4xl sm:text-5xl">{isNew ? 'Commande enregistrée' : 'Votre commande'}</h1>

      {!order ? (
        <Skeleton className="mt-10 h-96 rounded-[28px]" />
      ) : (
        <>
          <p className="mx-auto mt-4 max-w-lg text-center text-[15.5px] leading-relaxed text-ink-soft">
            {ps === 'impaye' ? (
              <>
                Merci ! Envoyez-nous la commande <strong className="text-ink">{order.reference}</strong> sur WhatsApp : nous vous indiquerons comment régler
                l'acompte de <strong className="text-ink">{fcfa(order.deposit)}</strong>.
              </>
            ) : ps === 'acompte' ? (
              <>Acompte reçu, merci ! Le solde de {fcfa(amounts.due)} se règle à la livraison.</>
            ) : ps === 'paye' ? (
              <>Commande entièrement réglée. Merci pour votre confiance !</>
            ) : (
              <>Cette commande a été annulée.</>
            )}
          </p>

          {tx && payment.data && (
            <div
              className={cn(
                'mx-auto mt-6 flex max-w-lg items-start gap-3 rounded-2xl border p-4 text-[14px]',
                payment.data.status === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : payment.data.status === 'failed'
                    ? 'border-rouille-500/30 bg-rouille-50 text-rouille-600 dark:bg-rouille-500/10'
                    : 'border-line bg-surface-2/60 text-ink-soft',
              )}
            >
              {payment.data.status === 'pending' ? <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin" /> : payment.data.status === 'success' ? <Check className="mt-0.5 size-5 shrink-0" /> : <XCircle className="mt-0.5 size-5 shrink-0" />}
              <div className="flex-1">
                <strong>
                  {payment.data.status === 'pending' ? 'Paiement en cours de vérification…' : payment.data.status === 'success' ? `Paiement de ${fcfa(payment.data.amount)} reçu` : 'Paiement non abouti'}
                </strong>
                <div className="mt-0.5 text-[13px] opacity-80">
                  {payment.data.status === 'pending'
                    ? 'Validez la demande sur votre téléphone si ce n’est pas déjà fait.'
                    : payment.data.status === 'success'
                      ? 'Votre reçu est à jour. Merci !'
                      : 'Aucun montant n’a été débité. Vous pouvez réessayer.'}
                </div>
              </div>
              {payment.data.status !== 'pending' && (
                <button onClick={() => setParams({}, { replace: true })} className="text-[12.5px] font-semibold underline">
                  OK
                </button>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            {payCfg?.enabled && (ps === 'impaye' || (ps === 'acompte' && !order.balance_paid)) && (
              <Button size="lg" onClick={() => pay(ps === 'impaye' ? 'deposit' : 'balance')} loading={paying} icon={<CreditCard className="size-4" />}>
                {ps === 'impaye' ? `Payer l’acompte en ligne · ${fcfa(order.deposit)}` : `Payer le solde en ligne · ${fcfa(amounts.due)}`}
              </Button>
            )}
            {ps === 'impaye' && (
              <a
                href={orderWhatsAppLink(order, user?.full_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-7 text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(37,211,102,0.8)] transition hover:bg-[#1ebe5a]"
              >
                <WhatsAppIcon className="size-5" />
                Envoyer sur WhatsApp
              </a>
            )}
            <Button size="lg" variant={ps === 'impaye' || (payCfg?.enabled && ps === 'acompte' && !order.balance_paid) ? 'outline' : 'primary'} onClick={download} loading={busy} icon={<Download className="size-4" />}>
              Télécharger le reçu
            </Button>
            <ButtonLink to="/compte" size="lg" variant="ghost">
              Suivre ma commande
            </ButtonLink>
          </div>

          <div className="mt-12 overflow-hidden rounded-[28px] border border-line bg-surface">
            {/* Statut du paiement */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface-2/50 px-6 py-5 sm:px-8">
              <div>
                <div className="text-[11.5px] font-semibold tracking-[0.12em] text-ink-muted uppercase">Statut du paiement</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <PaymentBadge order={order} />
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12.5px] text-ink-muted">Reste à payer</div>
                <div className="font-display text-2xl font-semibold text-ink tabular-nums">{fcfa(amounts.due)}</div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl">Récapitulatif</h2>
                <span className="font-mono text-[13px] text-ink-muted">
                  {order.reference} · {formatDateTime(order.created_at)}
                </span>
              </div>

              {/* Informations client */}
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <InfoCard Icon={UserIcon} title="Client">
                  <div className="font-semibold text-ink">{order.customer?.full_name ?? user?.full_name ?? '—'}</div>
                  {(order.customer?.username ?? user?.username) && <div className="text-ink-muted">@{order.customer?.username ?? user?.username}</div>}
                  {user?.email && <div className="truncate text-ink-muted">{user.email}</div>}
                </InfoCard>
                <InfoCard Icon={Phone} title="Contact & paiement">
                  <div className="font-semibold text-ink">{formatPhone(order.payment_phone)}</div>
                  <div className="text-ink-muted">{PAYMENT_LABEL[order.payment_method]}</div>
                </InfoCard>
                <InfoCard Icon={MapPin} title="Livraison">
                  {order.delivery_city ? (
                    <>
                      <div className="font-semibold text-ink">{order.delivery_city}</div>
                      <div className="text-ink-muted">{order.delivery_address}</div>
                    </>
                  ) : (
                    <div className="text-ink-muted">Retrait en boutique</div>
                  )}
                </InfoCard>
              </div>

              <ul className="mt-6 divide-y divide-line border-t border-line">
                {order.items.map((i, idx) => (
                  <li key={idx} className="flex items-center gap-4 py-3.5 text-[14.5px]">
                    {i.product_image_url && <img src={i.product_image_url} alt="" className="size-12 shrink-0 rounded-xl bg-surface-2 object-cover" />}
                    <span className="min-w-0 flex-1">
                      {i.qty} × {i.product_name}
                      <span className="block text-[13px] text-ink-muted">
                        Taille {i.size} · {NIVEAU_LABEL[i.niveau]} · {fcfa(i.unit_price)} l'unité
                      </span>
                    </span>
                    <span className="font-medium tabular-nums">{fcfa(i.line_total)}</span>
                  </li>
                ))}
              </ul>

              <dl className="mt-2 space-y-2 border-t border-line pt-4 text-[14.5px]">
 {!!order.discount && (
                  <>
                    <Row label="Sous-total" value={fcfa(order.subtotal ?? order.total + order.discount)} />
                    <Row label={`Remise${order.promo_label ? ` — ${order.promo_label}` : ''}`} value={`− ${fcfa(order.discount)}`} good />
                  </>
                )}
                <Row label="Total" value={fcfa(order.total)} strong />
                {(order.delivery_date || order.courier) && (
                  <div className="flex items-center gap-2 rounded-xl bg-surface-2/60 px-3 py-2 text-[13.5px] text-ink-soft">
                    <Truck className="size-4 text-ink-muted" />
                    Livraison
                    {order.delivery_date && ` le ${new Date(order.delivery_date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
                    {order.delivery_slot && ` · ${order.delivery_slot}`}
                    {order.courier && ` · par ${order.courier.full_name.split(' ')[0]}`}
                  </div>
                )}
                <Row label="Acompte (50 %)" value={fcfa(order.deposit)} accent={ps === 'impaye'} />
                <Row label="Solde à la livraison" value={fcfa(order.balance)} />
                <Row label="Déjà payé" value={fcfa(amounts.paid)} good={amounts.paid > 0} />
              </dl>

              <button
                onClick={download}
                disabled={busy}
                className="mt-6 flex w-full items-center gap-4 rounded-2xl border border-dashed border-line p-4 text-left transition hover:border-ink/30 hover:bg-surface-2/40 disabled:opacity-60"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rouille-50 text-rouille-600 dark:bg-rouille-500/15">
                  <FileText className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-[14px] font-semibold text-ink">Recu-Kola-{order.reference}.pdf</span>
                  <span className="block text-[12.5px] text-ink-muted">À présenter au livreur · se met à jour à chaque paiement</span>
                </span>
                <Download className="size-5 text-ink-muted" />
              </button>
            </div>
          </div>

          {ps === 'impaye' && (
            <p className="mt-5 flex items-start justify-center gap-2 text-center text-[13px] text-ink-muted">
              <Wallet className="mt-0.5 size-4 shrink-0" />
              Dès réception de votre acompte, nous validons la commande et vous renvoyons le reçu mis à jour sur WhatsApp.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function InfoCard({ Icon, title, children }: { Icon: typeof Phone; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2/50 p-4 text-[13.5px] leading-relaxed">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
        <Icon className="size-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, strong, accent, good }: { label: string; value: string; strong?: boolean; accent?: boolean; good?: boolean }) {
  return (
    <div
      className={cn(
        'flex justify-between gap-4',
        strong && 'text-base font-semibold',
        accent && 'font-semibold text-rouille-600',
        good && 'font-semibold text-emerald-700 dark:text-emerald-400',
      )}
    >
      <dt className={strong || accent || good ? '' : 'text-ink-muted'}>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}
