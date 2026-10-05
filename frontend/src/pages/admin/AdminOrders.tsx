import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api, type Order, type OrderStatus } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { fcfa, formatDate, formatPhone, NIVEAU_LABEL, ORDER_STATUS, PAYMENT_LABEL } from '../../lib/format';
import { Chip, EmptyState, Skeleton, StatusBadge } from '../../components/ui/misc';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Panel } from './AdminLayout';

const FILTERS: (OrderStatus | 'tous')[] = ['tous', 'en_attente', 'validee', 'transit', 'livre', 'annulee'];

export default function AdminOrders() {
  const { data: orders, isLoading } = useQuery({ queryKey: qk.admin.orders, queryFn: () => api.admin.listOrders() });
  const [filter, setFilter] = useState<OrderStatus | 'tous'>('tous');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<{ order: Order; status: OrderStatus } | null>(null);

  const update = useAdminMutation(({ id, status }: { id: number; status: OrderStatus }) => api.admin.updateOrderStatus(id, status), {
    success: 'Statut mis à jour',
    invalidate: [qk.admin.orders, qk.myOrders],
  });

  const stats = useMemo(() => {
    const list = orders ?? [];
    return {
      waiting: list.filter((o) => o.status === 'en_attente').length,
      depositToCollect: list.filter((o) => o.status === 'en_attente').reduce((s, o) => s + o.deposit, 0),
      balanceToCollect: list.filter((o) => ['validee', 'transit'].includes(o.status)).reduce((s, o) => s + o.balance, 0),
      revenue: list.filter((o) => o.status !== 'annulee').reduce((s, o) => s + o.total, 0),
    };
  }, [orders]);

  const list = (orders ?? []).filter((o) => {
    if (filter !== 'tous' && o.status !== filter) return false;
    const q = search.trim().toLowerCase();
    return !q || o.reference.toLowerCase().includes(q) || o.customer?.full_name.toLowerCase().includes(q) || o.payment_phone.includes(q);
  });

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
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="En attente d'acompte" value={String(stats.waiting)} />
        <Stat label="Acomptes à encaisser" value={fcfa(stats.depositToCollect)} accent />
        <Stat label="Soldes à encaisser" value={fcfa(stats.balanceToCollect)} />
        <Stat label="Chiffre d'affaires" value={fcfa(stats.revenue)} />
      </div>

      <Panel
        title="Commandes"
        description="Faites évoluer le statut au fil de la livraison. Passer une commande en « Livrée » enregistre l'encaissement du solde."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
            <input className="field h-10 w-64 py-0 pl-9" placeholder="Référence, client, téléphone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
      >
        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === 'tous' ? 'Toutes' : ORDER_STATUS[f].label}
              {orders && <span className="ml-1.5 opacity-60">{f === 'tous' ? orders.length : orders.filter((o) => o.status === f).length}</span>}
            </Chip>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState title="Aucune commande dans cette vue" />
        ) : (
          <div className="space-y-3">
            {list.map((o) => (
              <article key={o.id} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[14px] font-semibold">{o.reference}</span>
                      <span className="text-ink-muted">·</span>
                      <span className="font-semibold">{o.customer?.full_name ?? 'Client'}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-1 text-[13px] text-ink-muted">
                      {formatDate(o.created_at)} · {PAYMENT_LABEL[o.payment_method]} {formatPhone(o.payment_phone)}
                      {o.delivery_city && ` · ${o.delivery_city}, ${o.delivery_address}`}
                    </div>
                  </div>
                  <select
                    aria-label="Statut de la commande"
                    className="field h-10 w-auto py-0 pr-8 text-[13.5px] font-medium"
                    value={o.status}
                    disabled={update.isPending}
                    onChange={(e) => askStatus(o, e.target.value as OrderStatus)}
                  >
                    {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS[s].label}
                      </option>
                    ))}
                  </select>
                </div>
                <ul className="mt-4 space-y-1 border-t border-dashed border-line pt-3 text-[13.5px] text-ink-soft">
                  {o.items.map((i, idx) => (
                    <li key={idx}>
                      {i.qty} × {i.product_name} — taille {i.size}, {NIVEAU_LABEL[i.niveau]}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
                  <span>
                    Total <strong>{fcfa(o.total)}</strong>
                  </span>
                  <span className="text-ink-muted">Acompte {fcfa(o.deposit)}</span>
                  <span className={o.balance_paid ? 'font-semibold text-emerald-700' : 'text-ink-muted'}>
                    {o.status === 'annulee' ? 'Annulée' : o.balance_paid ? 'Soldée' : `Solde ${fcfa(o.balance)}`}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Modal open={!!pending} onClose={() => setPending(null)} eyebrow="Confirmation" title="Changer le statut ?">
        {pending && <p className="text-[15px] leading-relaxed text-ink-soft">{confirmText(pending)}</p>}
        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => setPending(null)}>
            Annuler
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${accent ? 'bg-rouille-500 text-creme-50' : 'border border-line bg-surface'}`}>
      <div className={`text-[12.5px] ${accent ? 'text-creme-50/80' : 'text-ink-muted'}`}>{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
