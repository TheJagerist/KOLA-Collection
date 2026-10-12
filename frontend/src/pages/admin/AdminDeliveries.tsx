import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, PackageCheck, Printer, Truck } from 'lucide-react';
import { api, type Order } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { useAuth } from '../../stores/auth';
import { can } from '../../lib/staff';
import { fcfa, formatPhone } from '../../lib/format';
import { printSlips } from '../../lib/print';
import { EmptyState, Skeleton, StatusBadge } from '../../components/ui/misc';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { NavigateFillIcon, PhoneFillIcon, WhatsAppIcon } from '../../components/ui/icons';
import { IconBadge } from '../../components/ui/ContactIcons';
import { cn } from '../../lib/cn';

const toCollect = (o: Order) => (o.balance_paid ? 0 : o.status === 'en_attente' ? o.total : o.balance);
const wa = (o: Order) =>
  `https://wa.me/242${o.payment_phone}?text=${encodeURIComponent(
    `Bonjour ${o.customer?.full_name?.split(' ')[0] ?? ''}, c'est Kōlā Collection. Votre commande ${o.reference} est en route${o.delivery_slot ? ` (${o.delivery_slot})` : ''}. Merci de prévoir ${fcfa(toCollect(o))} pour le solde.`,
  )}`;
const maps = (o: Order) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.delivery_address ?? ''}, ${o.delivery_city ?? ''}, Congo`)}`;

/** Tournée de livraison — un livreur ne voit que ses commandes */
export default function AdminDeliveries() {
  const user = useAuth((s) => s.user);
  const seeAll = can(user, 'deliveries.all');
  const [courier, setCourier] = useState<number | undefined>(undefined);
  const { data: couriers } = useQuery({ queryKey: qk.admin.couriers, queryFn: () => api.admin.couriers(), enabled: seeAll });
  const { data, isLoading } = useQuery({
    queryKey: qk.admin.deliveries(courier),
    queryFn: () => api.admin.deliveries(courier),
    refetchInterval: 60_000,
  });
  const [confirm, setConfirm] = useState<Order | null>(null);
  const [note, setNote] = useState('');

  const inv = [['admin', 'deliveries'], qk.admin.orders] as const;
  const start = useAdminMutation((id: number) => api.admin.startDelivery(id), { success: 'Bonne route !', invalidate: inv });
  const done = useAdminMutation(({ id, note }: { id: number; note?: string }) => api.admin.markDelivered(id, note), {
    success: 'Livraison confirmée — solde encaissé',
    invalidate: inv,
  });

  const today = new Date().toISOString().slice(0, 10);
  const todo = (data ?? [])
    .filter((o) => o.status !== 'livre')
    .sort((a, b) => (a.status === 'transit' ? -1 : 0) - (b.status === 'transit' ? -1 : 0) || (a.delivery_date ?? '9999').localeCompare(b.delivery_date ?? '9999') || (a.delivery_slot ?? '').localeCompare(b.delivery_slot ?? ''));
  const delivered = (data ?? []).filter((o) => o.status === 'livre');
  const cash = todo.reduce((s, o) => s + toCollect(o), 0);
  const collected = delivered.reduce((s, o) => s + o.balance, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="À livrer" value={String(todo.length)} />
        <Kpi label="À encaisser" value={fcfa(cash)} />
        <Kpi label="Livrées aujourd'hui" value={String(delivered.length)} hint={delivered.length ? `${fcfa(collected)} encaissés` : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {seeAll && (
          <select className="field h-10 w-auto py-0 text-[13.5px]" value={courier ?? ''} onChange={(e) => setCourier(e.target.value ? Number(e.target.value) : undefined)} aria-label="Livreur">
            <option value="">Tous les livreurs</option>
            {couriers?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => printSlips(todo)}
          disabled={!todo.length}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3.5 text-[13px] font-semibold text-ink transition hover:border-ink/25 disabled:opacity-40"
        >
          <Printer className="size-4" /> Feuille de route
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : !todo.length && !delivered.length ? (
        <EmptyState icon={<Truck className="size-6" />} title="Aucune livraison">
          {seeAll ? 'Attribuez un livreur depuis le détail d’une commande validée.' : 'Aucune commande ne vous est attribuée pour le moment.'}
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {todo.map((o) => (
              <article key={o.id} className={cn('flex flex-col rounded-[20px] border bg-surface p-4 shadow-[0_1px_2px_rgba(28,20,13,0.04)] sm:p-5', o.status === 'transit' ? 'border-violet-300 dark:border-violet-500/40' : 'border-line')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[16px] font-semibold text-ink">{o.customer?.full_name ?? 'Client'}</div>
                    <div className="font-mono text-[11.5px] text-ink-muted">{o.reference}</div>
                  </div>
                  <StatusBadge status={o.status} short />
                </div>

                <div className="mt-3 space-y-1.5 text-[13.5px] text-ink-soft">
                  <div className="flex items-start gap-2.5">
                    <IconBadge tone="location" size="sm" />
                    <span className="pt-0.5">
                      <strong className="font-semibold text-ink">{o.delivery_city}</strong> — {o.delivery_address}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <IconBadge tone="time" size="sm" />
                    {o.delivery_date ? (
                      <span className={cn(o.delivery_date === today && 'font-semibold text-rouille-600', o.delivery_date < today && 'font-semibold text-rouille-600')}>
                        {o.delivery_date === today ? "Aujourd'hui" : new Date(o.delivery_date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                        {o.delivery_slot ? ` · ${o.delivery_slot}` : ''}
                      </span>
                    ) : (
                      <span className="text-ink-muted">Date à convenir</span>
                    )}
                  </div>
                  {seeAll && (
                    <div className="flex items-center gap-2.5">
                      <IconBadge tone="truck" size="sm" />
                      {o.courier?.full_name ?? <span className="text-amber-700 dark:text-amber-400">Pas de livreur</span>}
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-xl bg-surface-2/60 px-3 py-2 text-[12.5px] text-ink-soft">
                  {o.items.map((i) => `${i.qty}× ${i.product_name} (${i.size})`).join(' · ')}
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-line px-3 py-2">
                  <span className="text-[12.5px] text-ink-muted">À encaisser</span>
                  <span className="font-display text-lg font-semibold text-ink tabular-nums">{fcfa(toCollect(o))}</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <a href={`tel:+242${o.payment_phone}`} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-[13px] font-semibold text-white shadow-sm hover:bg-emerald-600">
                    <PhoneFillIcon className="size-4" /> Appeler
                  </a>
                  <a href={wa(o)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-[13px] font-semibold text-white shadow-sm hover:bg-[#1ebe5a]">
                    <WhatsAppIcon className="size-4" /> Message
                  </a>
                  <a href={maps(o)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-sky-500 text-[13px] font-semibold text-white shadow-sm hover:bg-sky-600">
                    <NavigateFillIcon className="size-4" /> Itinéraire
                  </a>
                </div>
                <div className="mt-auto pt-2">
                  {o.status === 'validee' ? (
                    <Button className="w-full" variant="outline" loading={start.isPending && start.variables === o.id} onClick={() => start.mutate(o.id)} icon={<Truck className="size-4" />}>
                      Je pars livrer
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={() => (setNote(''), setConfirm(o))} icon={<PackageCheck className="size-4" />}>
                      Remise au client
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {delivered.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg text-ink">Livrées aujourd'hui</h2>
              <ul className="divide-y divide-line/70 rounded-[20px] border border-line bg-surface">
                {delivered.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-ink">{o.customer?.full_name}</div>
                      <div className="text-[12px] text-ink-muted">
                        {o.reference} · {o.delivered_at && new Date(o.delivered_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className="text-[13px] font-semibold text-ink tabular-nums">{fcfa(o.balance)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} eyebrow="Confirmation de livraison" title="Commande remise ?">
        {confirm && (
          <>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              Confirmez que <strong className="text-ink">{confirm.customer?.full_name}</strong> a reçu la commande <span className="font-mono">{confirm.reference}</span> et que le solde de{' '}
              <strong className="text-ink">{fcfa(toCollect(confirm))}</strong> a été encaissé ({formatPhone(confirm.payment_phone)}).
            </p>
            <input
              className="field mt-4 h-11 py-0"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Remarque (facultatif) : reçu par la maman, payé en espèces…"
              maxLength={300}
            />
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => setConfirm(null)}>
                Retour
              </Button>
              <Button loading={done.isPending} onClick={() => done.mutate({ id: confirm.id, note: note.trim() || undefined }, { onSuccess: () => setConfirm(null) })}>
                Confirmer la remise
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[20px] border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(28,20,13,0.04)] sm:p-5">
      <div className="text-[12.5px] text-ink-muted">{label}</div>
      <div className="mt-1 font-display text-lg font-semibold text-ink tabular-nums sm:text-2xl">{value}</div>
      {hint && <div className="text-[11.5px] text-ink-muted">{hint}</div>}
    </div>
  );
}
