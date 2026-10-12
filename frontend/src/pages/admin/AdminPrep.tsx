import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, PackageOpen, Printer, Truck } from 'lucide-react';
import { api, type Order } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { DELIVERY_CITIES, NIVEAU_LABEL } from '../../lib/format';
import { printPrepSummary, printSlips, type PrepLine } from '../../lib/print';
import { EmptyState, Skeleton } from '../../components/ui/misc';
import { Chip } from '../../components/ui/misc';
import { Table, TableCard, Td, Th, THead, Tr } from '../../components/admin/DataTable';
import { Panel } from './AdminLayout';
import { timeAgo } from './AdminDashboard';
import { cn } from '../../lib/cn';

/** Préparation : commandes validées (acompte reçu) à sortir du stock et emballer */
export default function AdminPrep() {
  const { data: orders, isLoading } = useQuery({ queryKey: qk.admin.orders, queryFn: () => api.admin.listOrders() });
  const [city, setCity] = useState<string>('toutes');
  const [day, setDay] = useState<'tous' | 'aujourdhui' | 'demain' | 'non_planifiee'>('tous');

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);

  const queue = useMemo(
    () =>
      (orders ?? [])
        .filter((o) => o.status === 'validee')
        .filter((o) => city === 'toutes' || o.delivery_city === city)
        .filter((o) => (day === 'tous' ? true : day === 'aujourdhui' ? o.delivery_date === today : day === 'demain' ? o.delivery_date === tomorrow : !o.delivery_date))
        .sort((a, b) => (a.delivery_date ?? '9999').localeCompare(b.delivery_date ?? '9999') || a.created_at.localeCompare(b.created_at)),
    [orders, city, day, today, tomorrow],
  );

  // On mémorise les commandes DÉcochées : les nouvelles arrivent cochées, et le rafraîchissement ne perd rien
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const selected = { has: (id: number) => !excluded.has(id) };
  const chosen = queue.filter((o) => selected.has(o.id));

  const lines = useMemo(() => aggregate(chosen), [chosen]);
  const pieces = lines.reduce((n, l) => n + l.qty, 0);

  const ship = useAdminMutation(
    async (list: Order[]) => {
      for (const o of list) await api.admin.updateOrderStatus(o.id, 'transit');
      return list.length;
    },
    { success: (n) => `${n} commande(s) remise(s) aux livreurs`, invalidate: [qk.admin.orders, ['admin', 'deliveries']] },
  );

  const toggle = (id: number) =>
    setExcluded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(['tous', 'aujourdhui', 'demain', 'non_planifiee'] as const).map((d) => (
          <Chip key={d} active={day === d} onClick={() => setDay(d)}>
            {{ tous: 'Toutes', aujourdhui: "Livraison aujourd'hui", demain: 'Livraison demain', non_planifiee: 'Non planifiées' }[d]}
          </Chip>
        ))}
        <span className="mx-1 h-6 w-px bg-line max-sm:hidden" />
        {['toutes', ...DELIVERY_CITIES].map((c) => (
          <Chip key={c} active={city === c} onClick={() => setCity(c)}>
            {c === 'toutes' ? 'Toutes les villes' : c}
          </Chip>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : !queue.length ? (
        <EmptyState icon={<PackageOpen className="size-6" />} title="Rien à préparer">
          Les commandes apparaissent ici dès que leur acompte est confirmé.
        </EmptyState>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
          <Panel
            title="À sortir du stock"
            description={`${pieces} article(s) pour ${chosen.length} commande(s) sélectionnée(s)`}
            actions={
              <button
                onClick={() => printPrepSummary(lines, chosen)}
                disabled={!chosen.length}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-line px-3 text-[13px] font-semibold text-ink transition hover:border-ink/25 disabled:opacity-40"
              >
                <Printer className="size-4" /> Imprimer
              </button>
            }
          >
            {lines.length ? (
              <div className="-mx-5 sm:-mx-6">
                <Table>
                  <THead>
                    <Th>Article</Th>
                    <Th align="center">Taille</Th>
                    <Th>Niveau</Th>
                    <Th align="right">Qté</Th>
                  </THead>
                  <tbody>
                    {lines.map((l) => (
                      <Tr key={`${l.name}|${l.size}|${l.niveau}`}>
                        <Td className="max-w-[260px] truncate font-medium text-ink">{l.name}</Td>
                        <Td align="center">
                          <span className="inline-grid h-7 min-w-9 place-items-center rounded-lg bg-surface-2 px-2 font-semibold text-ink">{l.size}</span>
                        </Td>
                        <Td className="text-ink-soft">{l.niveau}</Td>
                        <Td align="right" className="font-display text-lg font-semibold text-ink tabular-nums">
                          {l.qty}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <p className="text-[13.5px] text-ink-muted">Sélectionnez des commandes.</p>
            )}
          </Panel>

          <TableCard
            toolbar={
              <>
                <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-rouille-500)]"
                    checked={chosen.length === queue.length}
                    ref={(el) => {
                      if (el) el.indeterminate = chosen.length > 0 && chosen.length < queue.length;
                    }}
                    onChange={(e) => setExcluded(e.target.checked ? new Set() : new Set(queue.map((o) => o.id)))}
                  />
                  {chosen.length}/{queue.length} commande(s)
                </label>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => printSlips(chosen)}
                    disabled={!chosen.length}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-line px-3 text-[13px] font-semibold text-ink transition hover:border-ink/25 disabled:opacity-40"
                  >
                    <ClipboardList className="size-4" /> Bons
                  </button>
                  <button
                    onClick={() => ship.mutate(chosen)}
                    disabled={!chosen.length || ship.isPending}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-inverse px-3 text-[13px] font-semibold text-on-inverse transition hover:opacity-90 disabled:opacity-40"
                  >
                    <Truck className="size-4" /> {ship.isPending ? 'En cours…' : 'Prêtes : expédier'}
                  </button>
                </div>
              </>
            }
          >
            <ul className="divide-y divide-line/70 overflow-hidden rounded-b-[20px]">
              {queue.map((o) => (
                <li key={o.id}>
                  <label className={cn('flex cursor-pointer items-start gap-3 px-4 py-3 transition sm:px-5', selected.has(o.id) ? 'bg-surface' : 'opacity-60')}>
                    <input type="checkbox" className="mt-1 size-4 accent-[var(--color-rouille-500)]" checked={selected.has(o.id)} onChange={() => toggle(o.id)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold text-ink">{o.customer?.full_name ?? 'Client'}</span>
                        <span className="shrink-0 font-mono text-[11.5px] text-ink-muted">{o.reference}</span>
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-ink-muted">
                        {o.delivery_city ?? 'Retrait'} ·{' '}
                        {o.delivery_date ? (
                          <span className={cn('font-medium', o.delivery_date === today ? 'text-rouille-600' : 'text-ink-soft')}>
                            {new Date(o.delivery_date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {o.delivery_slot ? ` · ${o.delivery_slot.split(' (')[0]}` : ''}
                          </span>
                        ) : (
                          'date à fixer'
                        )}{' '}
                        · validée {timeAgo(o.created_at)}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {o.items.map((i, k) => (
                          <span key={k} className="max-w-full truncate rounded-md bg-surface-2 px-1.5 py-0.5 text-[11.5px] text-ink-soft">
                            {i.qty}× {i.product_name} · <strong className="text-ink">{i.size}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          </TableCard>
        </div>
      )}
    </div>
  );
}

function aggregate(orders: Order[]): PrepLine[] {
  const map = new Map<string, PrepLine>();
  orders.forEach((o) =>
    o.items.forEach((i) => {
      const key = `${i.product_id}|${i.size}|${i.niveau}`;
      const cur = map.get(key) ?? { name: i.product_name, size: i.size, niveau: NIVEAU_LABEL[i.niveau], qty: 0 };
      cur.qty += i.qty;
      map.set(key, cur);
    }),
  );
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr') || a.size.localeCompare(b.size, 'fr', { numeric: true }));
}
