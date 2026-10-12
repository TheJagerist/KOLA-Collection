import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Ban, BellRing, CheckCircle2, Download, FileSpreadsheet, Eye, Loader2, MoreHorizontal, PackageCheck, Phone, Plus, Printer, Search, Truck, Wallet, X } from 'lucide-react';
import { api, type Order, type OrderStatus } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { IconBadge, mapsHref, OperatorBadge, telHref } from '../../components/ui/ContactIcons';
import { fcfa, formatDate, formatPhone, NIVEAU_LABEL, ORDER_STATUS, PAYMENT_LABEL } from '../../lib/format';
import { EmptyState, PaymentBadge, Skeleton, StatusBadge } from '../../components/ui/misc';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Sheet } from '../../components/ui/Sheet';
import { cn } from '../../lib/cn';
import { timeAgo } from './AdminDashboard';
import { Avatar } from '../../components/ui/Avatar';
import { ManualOrderModal } from '../../components/admin/ManualOrderModal';
import { DeliveryEditor } from '../../components/admin/DeliveryEditor';
import { OrderTimeline } from '../../components/admin/OrderTimeline';
import { printSlips } from '../../lib/print';
import { CellStack, downloadCsv, Pagination, Table, TableCard, Td, Th, THead, Tr, usePagination, useSort } from '../../components/admin/DataTable';

function exportCsv(list: Order[]) {
  downloadCsv(`commandes-kola-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Référence', 'Date', 'Source', 'Client', 'Téléphone', 'Ville', 'Adresse', 'Paiement', 'Statut', 'Paiement reçu', 'Sous-total', 'Remise', 'Code promo', 'Total', 'Acompte', 'Solde', 'Livreur', 'Date de livraison', 'Créneau', 'Articles'],
    ...list.map((o) => [
      o.reference,
      new Date(o.created_at).toLocaleString('fr-FR'),
      o.source === 'manuel' ? 'Téléphone / boutique' : 'Site',
      o.customer?.full_name,
      formatPhone(o.payment_phone),
      o.delivery_city,
      o.delivery_address,
      PAYMENT_LABEL[o.payment_method],
      ORDER_STATUS[o.status].label,
      PAYMENT_STATE_LABEL[paymentState(o)],
      o.subtotal ?? o.total,
      o.discount ?? 0,
      o.promo_code ?? o.promo_label ?? '',
      o.total,
      o.deposit,
      o.balance,
      o.courier?.full_name ?? '',
      o.delivery_date ?? '',
      o.delivery_slot ?? '',
      o.items.map((i) => `${i.qty}× ${i.product_name} (${i.size})`).join(' | '),
    ]),
  ]);
}
import { WhatsAppIcon } from '../../components/ui/icons';
import { toast } from '../../stores/toast';
import { PAYMENT_STATE, paymentState } from '../../lib/format';
const PAYMENT_STATE_LABEL = Object.fromEntries(Object.entries(PAYMENT_STATE).map(([k, v]) => [k, v.label])) as Record<keyof typeof PAYMENT_STATE, string>;

/** Reçu : module chargé à la demande */
async function receiptAction(kind: 'pdf' | 'whatsapp', order: Order) {
  const m = await import('../../lib/receipt');
  if (kind === 'pdf') {
    await m.downloadReceiptPdf(order);
    toast.success('Reçu téléchargé');
    return;
  }
  const mode = await m.sendReceiptWhatsApp(order);
  if (mode === 'manual') toast.success('Reçu téléchargé : glissez le PDF dans la conversation WhatsApp qui vient de s’ouvrir.');
  if (mode === 'shared') toast.success('Reçu partagé');
}

const FILTERS: (OrderStatus | 'tous')[] = ['tous', 'en_attente', 'validee', 'transit', 'livre', 'annulee'];
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string; short: string; Icon: typeof Wallet }>> = {
  en_attente: { status: 'validee', label: "Confirmer l'acompte", short: 'Acompte reçu', Icon: Wallet },
  validee: { status: 'transit', label: 'Lancer la livraison', short: 'Expédier', Icon: Truck },
  transit: { status: 'livre', label: 'Marquer comme livrée', short: 'Livrée', Icon: PackageCheck },
};

export default function AdminOrders() {
  const { data: orders, isLoading } = useQuery({ queryKey: qk.admin.orders, queryFn: () => api.admin.listOrders() });
  const [params, setParams] = useSearchParams();
  const filter = (params.get('statut') as OrderStatus | null) ?? 'tous';
  const search = params.get('q') ?? '';
  const [openId, setOpenId] = useState<number | null>(null);
  const [pending, setPending] = useState<{ order: Order; status: OrderStatus } | null>(null);
  const [justPaid, setJustPaid] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v && v !== 'tous') next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const mutation = useAdminMutation(({ id, status }: { id: number; status: OrderStatus }) => api.admin.updateOrderStatus(id, status), {
    success: 'Statut mis à jour',
    invalidate: [qk.admin.orders, qk.myOrders, ['admin', 'events'], qk.admin.lowStock, ['admin', 'deliveries']],
  });
  // Après un encaissement (acompte ou solde), on propose d'envoyer le reçu au client
  const update = {
    ...mutation,
    mutate: (v: { id: number; status: OrderStatus }, o?: { onSettled?: () => void }) =>
      mutation.mutate(v, {
        onSuccess: () => {
          if (v.status === 'validee' || v.status === 'livre') {
            setJustPaid(v.id);
            setOpenId(v.id);
          }
        },
        onSettled: o?.onSettled,
      }),
  };

  const list = useMemo(
    () =>
      (orders ?? []).filter((o) => {
        if (filter !== 'tous' && o.status !== filter) return false;
        const q = search.trim().toLowerCase();
        return (
          !q ||
          o.reference.toLowerCase().includes(q) ||
          o.customer?.full_name.toLowerCase().includes(q) ||
          o.customer?.username?.toLowerCase().includes(q) ||
          o.payment_phone.includes(q.replace(/\s/g, ''))
        );
      }),
    [orders, filter, search],
  );

  const { sorted, by } = useSort(list, { key: 'date', dir: 'desc' }, {
    date: (o) => o.created_at,
    total: (o) => o.total,
    client: (o) => o.customer?.full_name ?? '',
  });
  const pager = usePagination(sorted, 12, `${filter}|${search}`);

  const opened = orders?.find((o) => o.id === openId) ?? null;

  const askStatus = (order: Order, status: OrderStatus) => {
    if (status === order.status) return;
    const needsConfirm = status === 'livre' || status === 'annulee' || (status === 'validee' && order.status === 'en_attente');
    if (needsConfirm) setPending({ order, status });
    else update.mutate({ id: order.id, status });
  };

  const confirmText = (p: { order: Order; status: OrderStatus }) =>
    p.status === 'livre'
      ? `Marquer ${p.order.reference} comme livrée ? Le solde de ${fcfa(p.order.balance)} sera enregistré comme encaissé.`
      : p.status === 'annulee'
        ? `Annuler la commande ${p.order.reference} ?`
        : `Confirmer la réception de l'acompte de ${fcfa(p.order.deposit)} pour ${p.order.reference} ?`;

  return (
    <div className="space-y-5">
      {/* Onglets de statut */}
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <div className="inline-flex min-w-full gap-1 border-b border-line sm:min-w-0">
          {FILTERS.map((f) => {
            const count = f === 'tous' ? orders?.length : orders?.filter((o) => o.status === f).length;
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setParam('statut', f)}
                className={cn(
                  '-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-[13.5px] font-medium whitespace-nowrap transition',
                  active ? 'border-rouille-500 text-ink' : 'border-transparent text-ink-muted hover:text-ink',
                )}
              >
                {f === 'tous' ? 'Toutes' : f === 'en_attente' ? 'À encaisser' : ORDER_STATUS[f].label}
                {count !== undefined && (
                  <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums', active ? 'bg-inverse text-on-inverse' : 'bg-surface-2 text-ink-muted')}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <TableCard
        toolbar={
          <>
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                className="field h-10 py-0 pr-9 pl-9"
                placeholder="Référence, client, téléphone…"
                value={search}
                onChange={(e) => setParam('q', e.target.value)}
                aria-label="Rechercher"
              />
              {search && (
                <button onClick={() => setParam('q', '')} className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-ink-muted hover:bg-surface-2" aria-label="Effacer">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <span className="text-[13px] text-ink-muted max-sm:order-last">
              <strong className="font-semibold text-ink">{fcfa(list.filter((o) => o.status !== 'annulee').reduce((s, o) => s + o.total, 0))}</strong> sur la sélection
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => exportCsv(sorted)}
                disabled={!list.length}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3.5 text-[13px] font-semibold text-ink transition hover:border-ink/25 disabled:opacity-40"
              >
                <FileSpreadsheet className="size-4" /> <span className="max-sm:hidden">Exporter</span>
              </button>
              <button
                onClick={() => setCreating(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-rouille-500 px-3.5 text-[13px] font-semibold text-white transition hover:bg-rouille-600"
              >
                <Plus className="size-4" /> Nouvelle commande
              </button>
            </div>
          </>
        }
        footer={!isLoading && list.length > 0 ? <Pagination {...pager} unit="commande" /> : undefined}
      >
        {isLoading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Aucune commande dans cette vue">Modifiez le filtre ou la recherche.</EmptyState>
          </div>
        ) : (
          <>
            {/* Tableau (grand écran) */}
            <div className="max-xl:hidden">
              <Table noScroll>
                <THead>
                  <Th sort={by('date')}>Commande</Th>
                  <Th sort={by('client')}>Client</Th>
                  <Th>Statut</Th>
                  <Th align="right" sort={by('total')}>
                    Montant
                  </Th>
                  <Th align="right">Actions</Th>
                </THead>
                <tbody>
                  {pager.rows.map((o) => (
                    <Tr key={o.id} onClick={() => setOpenId(o.id)} active={openId === o.id}>
                      <Td>
                        <CellStack mono title={o.reference} sub={<span title={formatDate(o.created_at)}>{timeAgo(o.created_at)}</span>} />
                      </Td>
                      <Td className="max-w-[260px]">
                        <div className="flex items-center gap-3">
                          <Avatar user={{ full_name: o.customer?.full_name ?? 'Client' }} className="size-9 text-[12px]" />
                          <CellStack
                            title={o.customer?.full_name ?? 'Client'}
                            sub={
                              <>
                                {o.delivery_city ?? 'Retrait'} · {o.items.reduce((n, i) => n + i.qty, 0)} article(s)
                                {o.source === 'manuel' && ' · tél.'}
                                {o.courier && ` · ${o.courier.full_name.split(' ')[0]}`}
                              </>
                            }
                          />
                        </div>
                      </Td>
                      <Td>
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusBadge status={o.status} short />
                          <PaymentBadge order={o} className="px-2 py-0.5 text-[10px]" />
                          {o.payment_claim && <ClaimBadge />}
                        </div>
                      </Td>
                      <Td align="right">
                        <div className="font-semibold text-ink tabular-nums">{fcfa(o.total)}</div>
                        <div className="mt-1 text-[12px] text-ink-muted tabular-nums">
                          {o.status === 'annulee' ? '—' : o.balance_paid ? 'Soldée' : o.status === 'en_attente' ? `Acompte ${fcfa(o.deposit)}` : `Reste ${fcfa(o.balance)}`}
                        </div>
                      </Td>
                      <Td align="right" onClick={(e) => e.stopPropagation()}>
                        <RowActions order={o} onStatus={(st) => askStatus(o, st)} onOpen={() => setOpenId(o.id)} busy={update.isPending} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Liste (mobile et tablette) */}
            <ul className="divide-y divide-line/70 xl:hidden">
              {pager.rows.map((o) => (
                <li key={o.id} className="px-4 py-3.5 sm:px-5">
                  <button onClick={() => setOpenId(o.id)} className="flex w-full items-start gap-3 text-left">
                    <Avatar user={{ full_name: o.customer?.full_name ?? 'Client' }} className="mt-0.5 size-10 text-[12px]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold text-ink">{o.customer?.full_name ?? 'Client'}</span>
                        <span className="shrink-0 font-semibold text-ink tabular-nums">{fcfa(o.total)}</span>
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[11.5px] text-ink-muted">
                        {o.reference} · {timeAgo(o.created_at)} · {o.delivery_city ?? 'Retrait'}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <StatusBadge status={o.status} short className="py-0.5 text-[11px]" />
                        <PaymentBadge order={o} className="py-0.5 text-[10px]" />
                        {o.payment_claim && <ClaimBadge />}
                      </div>
                    </div>
                  </button>
                  <div className="mt-3 pl-[52px]">
                    <RowActions order={o} onStatus={(st) => askStatus(o, st)} onOpen={() => setOpenId(o.id)} busy={update.isPending} wide />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </TableCard>

      {/* Détail d'une commande */}
      <Sheet
        open={!!opened}
        onClose={() => {
          setOpenId(null);
          setJustPaid(null);
        }}
        title={opened ? <span className="font-mono">{opened.reference}</span> : ''}
        footer={
          opened &&
          NEXT[opened.status] && (
            <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
              <Button variant="outline" onClick={() => askStatus(opened, 'annulee')}>
                Annuler
              </Button>
              <Button loading={update.isPending} onClick={() => askStatus(opened, NEXT[opened.status]!.status)}>
                {NEXT[opened.status]!.label}
              </Button>
            </div>
          )
        }
      >
        {opened && <OrderDetail order={opened} onStatus={(s) => askStatus(opened, s)} busy={update.isPending} justPaid={justPaid === opened.id} />}
      </Sheet>

      <ManualOrderModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(o) => {
          setCreating(false);
          setOpenId(o.id);
        }}
      />

      <Modal open={!!pending} onClose={() => setPending(null)} eyebrow="Confirmation" title="Changer le statut ?">
        {pending && <p className="text-[15px] leading-relaxed text-ink-soft">{confirmText(pending)}</p>}
        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => setPending(null)}>
            Retour
          </Button>
          <Button
            loading={update.isPending}
            onClick={() => pending && update.mutate({ id: pending.order.id, status: pending.status }, { onSettled: () => setPending(null) })}
          >
            Confirmer
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const STEPS: OrderStatus[] = ['en_attente', 'validee', 'transit', 'livre'];

function OrderDetail({ order: o, onStatus, busy, justPaid }: { order: Order; onStatus: (s: OrderStatus) => void; busy: boolean; justPaid: boolean }) {
  const step = ORDER_STATUS[o.status].step;
  const [working, setWorking] = useState<'pdf' | 'whatsapp' | null>(null);
  const run = async (kind: 'pdf' | 'whatsapp') => {
    setWorking(kind);
    try {
      await receiptAction(kind, o);
    } catch {
      toast.error("Le reçu n'a pas pu être généré.");
    } finally {
      setWorking(null);
    }
  };
  const paidState = paymentState(o);

  return (
    <div className="space-y-6 pb-2">
      {justPaid && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <div className="font-semibold text-emerald-900 dark:text-emerald-200">Paiement enregistré</div>
              <p className="mt-0.5 text-[13px] text-emerald-800/80 dark:text-emerald-200/70">Envoyez maintenant le reçu mis à jour au client.</p>
            </div>
          </div>
        </div>
      )}

      {o.payment_claim && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/30 dark:bg-sky-500/10">
          <div className="flex items-start gap-3">
            <BellRing className="mt-0.5 size-5 shrink-0 text-sky-700 dark:text-sky-300" />
            <div className="min-w-0 flex-1 text-[13.5px] text-sky-950 dark:text-sky-100">
              <div className="font-semibold">Le client a déclaré un paiement — à vérifier</div>
              <div className="mt-1 space-y-0.5 text-[13px] opacity-90">
                <div>
                  {o.payment_claim.kind === 'deposit' ? 'Acompte' : 'Solde'} de <strong>{fcfa(o.payment_claim.amount)}</strong> par {PAYMENT_LABEL[o.payment_claim.operator]}
                </div>
                <div>Depuis le {formatPhone(o.payment_claim.payer_phone)}</div>
                {o.payment_claim.transaction_ref && <div>Réf. transaction : <span className="font-mono font-semibold">{o.payment_claim.transaction_ref}</span></div>}
                <div className="text-[12px] opacity-75">Déclaré {timeAgo(o.payment_claim.at)}</div>
              </div>
              <p className="mt-2 text-[12.5px] opacity-80">Vérifiez sur votre téléphone {PAYMENT_LABEL[o.payment_claim.operator]} que l’argent est bien arrivé, puis confirmez.</p>
              {NEXT[o.status] && (o.status === 'en_attente' || o.payment_claim.kind === 'balance') && (
                <Button size="sm" className="mt-3" disabled={busy} onClick={() => onStatus(o.payment_claim!.kind === 'deposit' ? 'validee' : 'livre')}>
                  {o.payment_claim.kind === 'deposit' ? 'Argent reçu : valider la commande' : 'Solde reçu : marquer livrée'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PaymentBadge order={o} />
          <StatusBadge status={o.status} />
        </div>
        <span className="text-[12.5px] text-ink-muted">
          {o.source === 'manuel' ? 'Saisie par l’équipe' : 'Passée sur le site'} le {formatDate(o.created_at)}
        </span>
      </div>

      {/* Progression */}
      {o.status !== 'annulee' && (
        <ol className="grid grid-cols-4 gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s}>
              <div className={cn('h-1.5 rounded-full', i <= step ? 'bg-rouille-500' : 'bg-surface-2')} />
              <div className={cn('mt-1.5 text-[11px] leading-tight', i <= step ? 'font-semibold text-ink' : 'text-ink-muted')}>{ORDER_STATUS[s].label.replace(' de paiement', '')}</div>
            </li>
          ))}
        </ol>
      )}

      <section className="rounded-2xl border border-line p-4">
        <div className="text-[11.5px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Client</div>
        <div className="mt-1.5 font-semibold text-ink">{o.customer?.full_name ?? 'Client'}</div>
        {o.customer?.username && <div className="text-[13px] text-ink-muted">@{o.customer.username}</div>}
        <div className="mt-3 space-y-2.5 text-[13.5px] text-ink-soft">
          <div className="flex items-center gap-2.5">
            <IconBadge tone="phone" size="sm" />
            <a href={telHref(o.payment_phone)} className="font-medium text-ink hover:underline">
              {formatPhone(o.payment_phone)}
            </a>
            <OperatorBadge op={o.payment_method} />
          </div>
          <div className="flex items-start gap-2.5">
            <IconBadge tone="location" size="sm" />
            {o.delivery_city ? (
              <a href={mapsHref(o.delivery_address, o.delivery_city)} target="_blank" rel="noreferrer" className="pt-0.5 hover:underline">
                <strong className="font-semibold text-ink">{o.delivery_city}</strong> — {o.delivery_address}
              </a>
            ) : (
              <span className="pt-0.5">Retrait en boutique</span>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-2 text-[11.5px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Articles</div>
        <ul className="divide-y divide-line/70 rounded-2xl border border-line">
          {o.items.map((i, idx) => (
            <li key={idx} className="flex items-center gap-3 p-3">
              <span className="size-12 shrink-0 overflow-hidden rounded-xl bg-surface-2">{i.product_image_url && <img src={i.product_image_url} alt="" className="size-full object-cover" />}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-ink">{i.product_name}</div>
                <div className="text-[12px] text-ink-muted">
                  Taille {i.size} · {NIVEAU_LABEL[i.niveau]} · {i.qty} × {fcfa(i.unit_price)}
                </div>
              </div>
              <span className="text-[13.5px] font-semibold text-ink tabular-nums">{fcfa(i.line_total)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl bg-surface-2/50 p-4 text-[13.5px]">
        {!!o.discount && (
          <>
            <Row label="Sous-total" value={fcfa(o.subtotal ?? o.total + o.discount)} />
            <Row label={`Remise${o.promo_label ? ` — ${o.promo_label}` : ''}`} value={`− ${fcfa(o.discount)}`} />
          </>
        )}
        <Row label="Total" value={fcfa(o.total)} strong />
        <Row label="Acompte (50 %)" value={o.status === 'en_attente' ? `${fcfa(o.deposit)} · à vérifier` : `${fcfa(o.deposit)} · reçu`} />
        <Row label="Solde à la livraison" value={o.balance_paid ? `${fcfa(o.balance)} · encaissé` : fcfa(o.balance)} />
      </section>

      <section>
        <div className="mb-2 text-[11.5px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Reçu</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => run('whatsapp')}
            disabled={!!working || paidState === 'annule'}
            className={cn(
              'col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-[13.5px] font-semibold text-white transition hover:bg-[#1ebe5a] disabled:opacity-50',
              justPaid && 'ring-4 ring-[#25D366]/25',
            )}
          >
            <WhatsAppIcon className="size-4" />
            {working === 'whatsapp' ? 'Préparation…' : 'Envoyer sur WhatsApp'}
          </button>
          <button
            onClick={() => run('pdf')}
            disabled={!!working}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink/15 px-4 text-[13.5px] font-semibold text-ink transition hover:bg-ink/5 disabled:opacity-50"
          >
            <Download className="size-4" />
            {working === 'pdf' ? 'Préparation…' : 'Reçu PDF'}
          </button>
          <button
            onClick={() => printSlips([o])}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink/15 px-4 text-[13.5px] font-semibold text-ink transition hover:bg-ink/5"
          >
            <Printer className="size-4" /> Bon de préparation
          </button>
        </div>
        <p className="mt-2 text-[12px] text-ink-muted">Envoyé au {formatPhone(o.payment_phone)} · statut « {PAYMENT_STATE_LABEL[paidState]} » sur le reçu</p>
      </section>

      {o.status !== 'annulee' && o.delivery_city && <DeliveryEditor order={o} />}

      <OrderTimeline orderId={o.id} />

      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">Changer le statut manuellement</span>
        <select className="field h-11 py-0" value={o.status} disabled={busy} onChange={(e) => onStatus(e.target.value as OrderStatus)}>
          {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS[s].label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function ClaimBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap text-sky-900 uppercase ring-1 ring-sky-200 ring-inset dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/30">
      <span className="size-1.5 animate-pulse rounded-full bg-current" />
      Paiement déclaré
    </span>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className={cn('tabular-nums', strong ? 'text-[15px] font-semibold text-ink' : 'text-ink-soft')}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ ACTIONS PAR LIGNE */
function RowActions({
  order: o,
  onStatus,
  onOpen,
  busy,
  wide,
}: {
  order: Order;
  onStatus: (s: OrderStatus) => void;
  onOpen: () => void;
  busy: boolean;
  wide?: boolean;
}) {
  const next = NEXT[o.status];
  const [working, setWorking] = useState<'pdf' | 'whatsapp' | null>(null);
  const [menu, setMenu] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toggleMenu = () => {
    // Ouvre le menu vers le haut s'il n'y a pas la place en dessous
    const r = ref.current?.getBoundingClientRect();
    setUp(!!r && window.innerHeight - r.bottom < 260);
    setMenu((v) => !v);
  };

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);

  const run = async (kind: 'pdf' | 'whatsapp') => {
    setMenu(false);
    setWorking(kind);
    try {
      await receiptAction(kind, o);
    } catch {
      toast.error("Le reçu n'a pas pu être généré.");
    } finally {
      setWorking(null);
    }
  };

  const iconBtn = 'grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink-soft transition hover:border-ink/25 hover:text-ink disabled:opacity-40';

  return (
    <div className={cn('flex items-center justify-end gap-1.5', wide && 'justify-start')}>
      {next ? (
        <button
          onClick={() => onStatus(next.status)}
          disabled={busy}
          title={next.label}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold whitespace-nowrap transition disabled:opacity-50',
            o.status === 'en_attente' ? 'bg-rouille-500 text-white hover:bg-rouille-600' : 'bg-inverse text-on-inverse hover:opacity-90',
            wide && 'flex-1 justify-center',
          )}
        >
          <next.Icon className="size-3.5" />
          {wide ? next.label : next.short}
        </button>
      ) : (
        wide ? <span className="flex-1" /> : <span className="px-2 text-[12px] text-ink-muted">{o.status === 'livre' ? 'Terminée' : 'Annulée'}</span>
      )}

      <button onClick={() => run('whatsapp')} disabled={!!working || o.status === 'annulee'} className={cn(iconBtn, 'text-[#1ebe5a] hover:text-[#1ebe5a]')} title="Envoyer le reçu sur WhatsApp" aria-label="Envoyer le reçu sur WhatsApp">
        {working === 'whatsapp' ? <Loader2 className="size-4 animate-spin" /> : <WhatsAppIcon className="size-4" />}
      </button>

      <div ref={ref} className="relative">
        <button onClick={toggleMenu} className={iconBtn} aria-haspopup="menu" aria-expanded={menu} aria-label="Plus d'actions" title="Plus d'actions">
          {working === 'pdf' ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
        </button>
        {menu && (
          <div role="menu" className={cn('absolute right-0 z-20 w-60', up ? 'bottom-full mb-1.5' : 'top-full mt-1.5', 'overflow-hidden rounded-xl border border-line bg-surface p-1 text-[13.5px] shadow-xl')}>
            <MenuItem Icon={Eye} onClick={() => (setMenu(false), onOpen())}>
              Voir le détail
            </MenuItem>
            <MenuItem Icon={Download} onClick={() => run('pdf')}>
              Télécharger le reçu (PDF)
            </MenuItem>
            <MenuItem Icon={Printer} onClick={() => (setMenu(false), printSlips([o]))}>
              Imprimer le bon de préparation
            </MenuItem>
            <MenuItem Icon={Phone} href={`tel:+242${o.payment_phone}`}>
              Appeler le client
            </MenuItem>
            {o.status !== 'en_attente' && o.status !== 'annulee' && (
              <MenuItem Icon={Wallet} onClick={() => (setMenu(false), onStatus('en_attente'))}>
                Repasser en « impayé »
              </MenuItem>
            )}
            {o.status !== 'annulee' && o.status !== 'livre' && (
              <>
                <div className="my-1 h-px bg-line" />
                <MenuItem Icon={Ban} danger onClick={() => (setMenu(false), onStatus('annulee'))}>
                  Annuler la commande
                </MenuItem>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({ Icon, children, onClick, href, danger }: { Icon: typeof Eye; children: React.ReactNode; onClick?: () => void; href?: string; danger?: boolean }) {
  const cls = cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition hover:bg-surface-2', danger ? 'text-rouille-600' : 'text-ink');
  return href ? (
    <a href={href} role="menuitem" className={cls}>
      <Icon className="size-4 opacity-70" />
      {children}
    </a>
  ) : (
    <button role="menuitem" onClick={onClick} className={cls}>
      <Icon className="size-4 opacity-70" />
      {children}
    </button>
  );
}
