import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Clock, Hourglass, ReceiptText, ShoppingBag, Wallet } from 'lucide-react';
import { can } from '../../lib/staff';
import { api, type Order, type OrderStatus } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { useAuth } from '../../stores/auth';
import { fcfa, ORDER_STATUS, PAYMENT_LABEL } from '../../lib/format';
import { Skeleton, StatusBadge } from '../../components/ui/misc';
import { cn } from '../../lib/cn';
import { Panel } from './AdminLayout';
import { Avatar } from '../../components/ui/Avatar';
import { CellStack, Table, Td, Th, THead, Tr } from '../../components/admin/DataTable';

const DAY = 86_400_000;
const PERIODS = [
  { days: 7, label: '7 jours' },
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' },
] as const;

const nf = new Intl.NumberFormat('fr-FR');
const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M` : n >= 1000 ? `${Math.round(n / 1000)} k` : String(n));
const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
export function timeAgo(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Couleurs d'état réservées aux statuts (toujours accompagnées du libellé) */
const STATUS_FILL: Record<OrderStatus, string> = {
  en_attente: 'bg-amber-400',
  validee: 'bg-sky-500',
  transit: 'bg-violet-500',
  livre: 'bg-emerald-500',
  annulee: 'bg-stone-300 dark:bg-stone-600',
};

export default function AdminDashboard() {
  const user = useAuth((s) => s.user);
  const { data: orders, isLoading } = useQuery({ queryKey: qk.admin.orders, queryFn: () => api.admin.listOrders() });
  const [days, setDays] = useState<number>(30);

  const m = useMemo(() => computeMetrics(orders ?? [], days), [orders, days]);
  const firstName = user?.full_name?.split(' ')[0];
  const hour = new Date().getHours();

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-ink-muted capitalize">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <h2 className="mt-1 font-display text-2xl text-ink sm:text-3xl">
            {hour < 18 ? 'Bonjour' : 'Bonsoir'}
            {firstName && firstName !== 'Administrateur' ? `, ${firstName}` : ''} 👋
          </h2>
        </div>
        <div className="inline-flex rounded-xl border border-line bg-surface p-1" role="radiogroup" aria-label="Période">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              role="radio"
              aria-checked={days === p.days}
              onClick={() => setDays(p.days)}
              className={cn('relative h-8 rounded-lg px-3.5 text-[13px] font-medium transition', days === p.days ? 'text-on-inverse' : 'text-ink-muted hover:text-ink')}
            >
              {days === p.days && <motion.span layoutId="period" className="absolute inset-0 rounded-lg bg-inverse" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              <span className="relative">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {isLoading ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[132px] rounded-[20px]" />)
        ) : (
          <>
            <Kpi Icon={Wallet} label="Chiffre d'affaires" value={fcfa(m.revenue)} delta={m.revenueDelta} hint={`vs ${days} jours précédents`} highlight />
            <Kpi Icon={ReceiptText} label="Commandes" value={nf.format(m.count)} delta={m.countDelta} hint={`vs ${days} jours précédents`} />
            <Kpi Icon={ShoppingBag} label="Panier moyen" value={fcfa(m.avg)} delta={m.avgDelta} hint={`${nf.format(m.units)} articles vendus`} />
            <Kpi Icon={Hourglass} label="Reste à encaisser" value={fcfa(m.toCollect)} hint={`${m.pending.length} acompte(s) en attente`} />
          </>
        )}
      </div>

      {/* Graphique + statuts */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel
          title="Chiffre d'affaires"
          description={days === 90 ? 'Par semaine, commandes annulées exclues' : 'Par jour, commandes annulées exclues'}
          actions={<div className="text-right font-display text-2xl text-ink tabular-nums">{fcfa(m.revenue)}</div>}
        >
          {isLoading ? <Skeleton className="h-[260px]" /> : <RevenueChart buckets={m.buckets} />}
        </Panel>

        <Panel title="Statut des commandes" description={`${m.count + m.cancelled} commandes sur la période`}>
          <StatusBreakdown byStatus={m.byStatus} />
        </Panel>
      </div>

      {/* À traiter + top articles */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          title="À traiter"
          description="Acomptes à vérifier sur Airtel Money / MTN avant de lancer la préparation"
          actions={
            <Link to="/admin/commandes?statut=en_attente" className="inline-flex items-center gap-1 text-[13px] font-semibold text-rouille-600 hover:underline">
              Tout voir <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <PendingList orders={m.pendingAll} />
        </Panel>

        <Panel title="Articles les plus vendus" description="En quantité, sur la période">
          <TopProducts rows={m.top} />
        </Panel>
      </div>

      {/* Alerte stock bas */}
      <LowStockPanel />

      {/* Répartitions + dernières commandes */}
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Panel title="Répartition" description="Commandes sur la période">
          <div className="space-y-6">
            <Split title="Ville de livraison" rows={m.cities} />
            <Split title="Moyen de paiement" rows={m.payments} />
          </div>
        </Panel>

        <Panel
          title="Dernières commandes"
          actions={
            <Link to="/admin/commandes" className="inline-flex items-center gap-1 text-[13px] font-semibold text-rouille-600 hover:underline">
              Toutes les commandes <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <RecentOrders orders={(orders ?? []).slice(0, 6)} loading={isLoading} />
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ CALCULS */
function computeMetrics(orders: Order[], days: number) {
  const now = Date.now();
  const start = startOfDay(now - (days - 1) * DAY);
  const prevStart = start - days * DAY;
  const t = (o: Order) => new Date(o.created_at).getTime();
  const inPeriod = orders.filter((o) => t(o) >= start);
  const inPrev = orders.filter((o) => t(o) >= prevStart && t(o) < start);
  const valid = inPeriod.filter((o) => o.status !== 'annulee');
  const validPrev = inPrev.filter((o) => o.status !== 'annulee');

  const sum = (l: Order[]) => l.reduce((s, o) => s + o.total, 0);
  const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? null : 0) : ((a - b) / b) * 100);
  const revenue = sum(valid);
  const revenuePrev = sum(validPrev);
  const avg = valid.length ? Math.round(revenue / valid.length) : 0;
  const avgPrev = validPrev.length ? Math.round(revenuePrev / validPrev.length) : 0;

  // Barres : par jour (7/30 j) ou par semaine (90 j)
  const step = days === 90 ? 7 : 1;
  const n = Math.ceil(days / step);
  const buckets = Array.from({ length: n }, (_, i) => {
    const from = start + i * step * DAY;
    const to = from + step * DAY;
    const list = valid.filter((o) => t(o) >= from && t(o) < to);
    const d = new Date(from);
    const label =
      step === 1
        ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        : `Sem. du ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    return { from, label, value: sum(list), count: list.length };
  });

  const byStatus = (Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => {
    const l = inPeriod.filter((o) => o.status === s);
    return { status: s, count: l.length, amount: sum(l) };
  });

  const units = valid.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  const prod = new Map<number, { name: string; image: string | null; qty: number; amount: number }>();
  valid.forEach((o) =>
    o.items.forEach((i) => {
      const cur = prod.get(i.product_id) ?? { name: i.product_name, image: i.product_image_url, qty: 0, amount: 0 };
      cur.qty += i.qty;
      cur.amount += i.line_total;
      prod.set(i.product_id, cur);
    }),
  );
  const top = [...prod.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  const group = (key: (o: Order) => string) => {
    const map = new Map<string, number>();
    valid.forEach((o) => map.set(key(o), (map.get(key(o)) ?? 0) + 1));
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  };

  const pendingAll = orders.filter((o) => o.status === 'en_attente');
  const toCollect =
    pendingAll.reduce((s, o) => s + o.total, 0) + orders.filter((o) => o.status === 'validee' || o.status === 'transit').reduce((s, o) => s + o.balance, 0);

  return {
    revenue,
    revenueDelta: pct(revenue, revenuePrev),
    count: valid.length,
    countDelta: pct(valid.length, validPrev.length),
    avg,
    avgDelta: pct(avg, avgPrev),
    units,
    cancelled: inPeriod.length - valid.length,
    toCollect,
    pending: pendingAll,
    pendingAll,
    buckets,
    byStatus,
    top,
    cities: group((o) => o.delivery_city ?? 'Retrait'),
    payments: group((o) => PAYMENT_LABEL[o.payment_method]),
  };
}

/* ------------------------------------------------------------------ KPI */
function Kpi({
  Icon,
  label,
  value,
  delta,
  hint,
  highlight,
}: {
  Icon: typeof Wallet;
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
  highlight?: boolean;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[20px] p-4 sm:p-5',
        highlight ? 'bg-brun-900 text-creme-50 dark:bg-rouille-600' : 'border border-line bg-surface shadow-[0_1px_2px_rgba(28,20,13,0.04)]',
      )}
    >
      {highlight && <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-44 rounded-full bg-rouille-500/35 blur-3xl dark:bg-white/15" />}
      <div className="relative flex items-center justify-between gap-2">
        <span className={cn('text-[12.5px] font-medium sm:text-[13px]', highlight ? 'text-creme-200/80' : 'text-ink-muted')}>{label}</span>
        <span className={cn('grid size-8 place-items-center rounded-lg sm:size-9', highlight ? 'bg-white/10 text-creme-50' : 'bg-surface-2 text-rouille-600')}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className={cn('relative mt-3 font-display text-[19px] leading-tight font-semibold tabular-nums sm:text-[26px]', highlight ? 'text-white' : 'text-ink')}>{value}</div>
      <div className="relative mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
        {delta !== undefined && delta !== null && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular-nums',
              highlight ? 'bg-white/12 text-white' : up ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rouille-50 text-rouille-600 dark:bg-rouille-500/15 dark:text-rouille-400',
            )}
          >
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(delta).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %
          </span>
        )}
        {delta === null && <span className={cn('rounded-md px-1.5 py-0.5 font-semibold', highlight ? 'bg-white/12 text-white' : 'bg-surface-2 text-ink-soft')}>Nouveau</span>}
        {hint && <span className={cn('max-sm:hidden', highlight ? 'text-creme-200/65' : 'text-ink-muted')}>{hint}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ GRAPHIQUE */
function RevenueChart({ buckets }: { buckets: { label: string; value: number; count: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 260;
  const pad = { top: 12, right: 4, bottom: 28, left: 44 };
  const iw = Math.max(10, w - pad.left - pad.right);
  const ih = H - pad.top - pad.bottom;
  const max = Math.max(1, ...buckets.map((b) => b.value));
  const niceMax = (() => {
    const p = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / p) * p;
  })();
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMax);
  const slot = iw / buckets.length;
  const bw = Math.max(3, Math.min(28, slot - 2));
  const y = (v: number) => pad.top + ih - (v / niceMax) * ih;
  const labelEvery = Math.ceil(buckets.length / Math.max(2, Math.floor(iw / 70)));
  const hb = hover !== null ? buckets[hover] : null;

  return (
    <div ref={ref} className="relative min-w-0">
      {w > 0 && (
      <svg width={w} height={H} role="img" aria-label="Chiffre d'affaires sur la période" className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={w - pad.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeDasharray={t === 0 ? undefined : '3 4'} />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-muted text-[11px] tabular-nums">
              {compact(t)}
            </text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const x = pad.left + i * slot + (slot - bw) / 2;
          const h = Math.max(b.value > 0 ? 3 : 0, (b.value / niceMax) * ih);
          const active = hover === i;
          return (
            <g key={i}>
              {active && <rect x={pad.left + i * slot} y={pad.top} width={slot} height={ih} className="fill-ink/[0.04]" rx={6} />}
              <motion.path
                initial={{ opacity: 0 }}
                animate={{ opacity: hover === null || active ? 1 : 0.45 }}
                transition={{ duration: 0.2 }}
                d={roundedTop(x, y(0) - h, bw, h, Math.min(4, bw / 2))}
                className="fill-rouille-500"
              />
              {i % labelEvery === 0 && (
                <text x={pad.left + i * slot + slot / 2} y={H - 8} textAnchor="middle" className="fill-ink-muted text-[11px]">
                  {b.label.replace('Sem. du ', '')}
                </text>
              )}
              {/* zone de survol plus large que la barre */}
              <rect
                x={pad.left + i * slot}
                y={pad.top}
                width={slot}
                height={ih}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      )}
      {w === 0 && <div style={{ height: H }} />}
      {hb && hover !== null && (
        <div
          className="pointer-events-none absolute z-10 min-w-[150px] -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface px-3 py-2 shadow-xl"
          style={{
            left: Math.min(Math.max(pad.left + hover * slot + slot / 2, 80), w - 80),
            top: Math.max(y(hb.value) - 10, 40),
          }}
        >
          <div className="text-[11.5px] text-ink-muted">{hb.label}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[14px] font-semibold text-ink tabular-nums">
            <span className="size-2 rounded-sm bg-rouille-500" />
            {fcfa(hb.value)}
          </div>
          <div className="text-[12px] text-ink-soft">{hb.count} commande(s)</div>
        </div>
      )}
      <table className="sr-only">
        <caption>Chiffre d'affaires par période</caption>
        <tbody>
          {buckets.map((b, i) => (
            <tr key={i}>
              <th>{b.label}</th>
              <td>{fcfa(b.value)}</td>
              <td>{b.count} commandes</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return '';
  const rr = Math.min(r, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/* ------------------------------------------------------------------ STATUTS */
function StatusBreakdown({ byStatus }: { byStatus: { status: OrderStatus; count: number; amount: number }[] }) {
  const total = byStatus.reduce((s, b) => s + b.count, 0);
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-surface-2" aria-hidden>
        {total > 0 &&
          byStatus
            .filter((b) => b.count > 0)
            .map((b) => (
              <motion.div
                key={b.status}
                className={cn('h-full first:rounded-l-full last:rounded-r-full', STATUS_FILL[b.status])}
                initial={{ width: 0 }}
                animate={{ width: `${(b.count / total) * 100}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                title={`${ORDER_STATUS[b.status].label} : ${b.count}`}
              />
            ))}
      </div>
      <ul className="mt-5 divide-y divide-line/70">
        {byStatus.map((b) => (
          <li key={b.status}>
            <Link to={`/admin/commandes?statut=${b.status}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-surface-2/60">
              <span className={cn('size-2.5 shrink-0 rounded-[3px]', STATUS_FILL[b.status])} />
              <span className="flex-1 text-[13.5px] text-ink-soft">{ORDER_STATUS[b.status].label}</span>
              <span className="text-[12.5px] text-ink-muted tabular-nums">{fcfa(b.amount)}</span>
              <span className="w-8 text-right text-[14px] font-semibold text-ink tabular-nums">{b.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ À TRAITER */
function PendingList({ orders }: { orders: Order[] }) {
  const validate = useAdminMutation((id: number) => api.admin.updateOrderStatus(id, 'validee'), {
    success: 'Acompte confirmé — commande validée',
    invalidate: [qk.admin.orders, qk.myOrders],
  });

  if (!orders.length)
    return (
      <div className="flex flex-col items-center rounded-2xl bg-surface-2/50 px-6 py-10 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">✓</span>
        <p className="mt-3 font-semibold text-ink">Tout est à jour</p>
        <p className="mt-1 text-[13px] text-ink-muted">Aucun acompte en attente de vérification.</p>
      </div>
    );

  return (
    <ul className="space-y-2">
      {orders.slice(0, 5).map((o) => (
        <li key={o.id} className="flex items-center gap-3 rounded-2xl border border-line/80 p-3 transition hover:border-ink/20">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            <Clock className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 text-[13.5px]">
              <span className="font-semibold text-ink">{o.customer?.full_name ?? 'Client'}</span>
              <span className="font-mono text-[12px] text-ink-muted">{o.reference}</span>
            </div>
            <div className="text-[12.5px] text-ink-muted">
              Acompte <strong className="font-semibold text-ink-soft">{fcfa(o.deposit)}</strong> · {PAYMENT_LABEL[o.payment_method]} · {timeAgo(o.created_at)}
            </div>
          </div>
          <button
            onClick={() => validate.mutate(o.id)}
            disabled={validate.isPending}
            className="h-9 shrink-0 rounded-lg bg-inverse px-3 text-[12.5px] font-semibold text-on-inverse transition hover:opacity-90 disabled:opacity-50"
          >
            Valider
          </button>
        </li>
      ))}
      {orders.length > 5 && (
        <li className="pt-1 text-center text-[12.5px] text-ink-muted">
          + {orders.length - 5} autre(s) —{' '}
          <Link to="/admin/commandes?statut=en_attente" className="font-semibold text-rouille-600 hover:underline">
            voir tout
          </Link>
        </li>
      )}
    </ul>
  );
}

/* ------------------------------------------------------------------ TOP ARTICLES */
function TopProducts({ rows }: { rows: { name: string; image: string | null; qty: number; amount: number }[] }) {
  if (!rows.length) return <p className="py-8 text-center text-[13.5px] text-ink-muted">Aucune vente sur la période.</p>;
  const max = rows[0].qty;
  return (
    <ol className="space-y-3.5">
      {rows.map((r, i) => (
        <li key={r.name} className="flex items-center gap-3">
          <span className="w-4 text-center text-[12px] font-semibold text-ink-muted tabular-nums">{i + 1}</span>
          <span className="size-11 shrink-0 overflow-hidden rounded-xl bg-surface-2">{r.image && <img src={r.image} alt="" className="size-full object-cover" />}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[13.5px] font-medium text-ink">{r.name}</span>
              <span className="shrink-0 text-[13px] font-semibold text-ink tabular-nums">{r.qty} vendus</span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <motion.div className="h-full rounded-full bg-rouille-500" initial={{ width: 0 }} animate={{ width: `${(r.qty / max) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.05 }} />
              </div>
              <span className="w-24 shrink-0 text-right text-[12px] text-ink-muted tabular-nums">{fcfa(r.amount)}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ RÉPARTITION */
function Split({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div>
      <div className="mb-3 text-[12px] font-semibold tracking-[0.08em] text-ink-muted uppercase">{title}</div>
      {total === 0 ? (
        <p className="text-[13px] text-ink-muted">—</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const p = Math.round((r.value / total) * 100);
            return (
              <li key={r.label}>
                <div className="flex items-baseline justify-between text-[13.5px]">
                  <span className="text-ink-soft">{r.label}</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {p} % <span className="font-normal text-ink-muted">· {r.value}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <motion.div className="h-full rounded-full bg-kaki-600 dark:bg-kaki-300" initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 0.7 }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ DERNIÈRES COMMANDES */
function RecentOrders({ orders, loading }: { orders: Order[]; loading: boolean }) {
  const navigate = useNavigate();
  if (loading) return <Skeleton className="h-64" />;
  return (
    <div className="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6">
      <Table minWidth={560}>
        <THead>
          <Th>Commande</Th>
          <Th>Client</Th>
          <Th>Statut</Th>
          <Th align="right">Total</Th>
        </THead>
        <tbody>
          {orders.map((o) => (
            <Tr key={o.id} onClick={() => navigate(`/admin/commandes?q=${o.reference}`)}>
              <Td>
                <CellStack mono title={o.reference} sub={timeAgo(o.created_at)} />
              </Td>
              <Td>
                <div className="flex items-center gap-3">
                  <Avatar user={{ full_name: o.customer?.full_name ?? 'Client' }} className="size-8 text-[11px]" />
                  <CellStack title={o.customer?.full_name ?? 'Client'} sub={o.delivery_city ?? 'Retrait'} />
                </div>
              </Td>
              <Td>
                <StatusBadge status={o.status} short />
              </Td>
              <Td align="right" className="font-semibold text-ink tabular-nums">
                {fcfa(o.total)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

/* ------------------------------------------------------------------ STOCK BAS */
function LowStockPanel() {
  const user = useAuth((s) => s.user);
  const { data } = useQuery({ queryKey: qk.admin.lowStock, queryFn: () => api.admin.lowStock(), staleTime: 60_000 });
  if (!data?.length) return null;
  const out = data.filter((r) => r.qty === 0).length;
  return (
    <Panel
      title="Stock bas"
      description={`${data.length} taille(s) à réassortir${out ? ` · ${out} en rupture (plus commandable sur le site)` : ''}`}
      actions={
        can(user, 'catalogue') ? (
          <Link to="/admin/catalogue" className="inline-flex items-center gap-1 text-[13px] font-semibold text-rouille-600 hover:underline">
            Gérer le stock <ArrowRight className="size-3.5" />
          </Link>
        ) : undefined
      }
      className="border-amber-300/70 dark:border-amber-500/30"
    >
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {data.slice(0, 12).map((r) => (
          <li key={`${r.product_id}-${r.size}`} className="flex items-center gap-3 rounded-xl border border-line p-2.5">
            <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">{r.image_url && <img src={r.image_url} alt="" className="size-full object-cover" />}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-ink">{r.name}</div>
              <div className="text-[12px] text-ink-muted">Taille {r.size}</div>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold tabular-nums',
                r.qty === 0 ? 'bg-rouille-50 text-rouille-600 dark:bg-rouille-500/15' : 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300',
              )}
            >
              {r.qty === 0 && <AlertTriangle className="size-3" />}
              {r.qty === 0 ? 'Rupture' : `${r.qty} restant${r.qty > 1 ? 's' : ''}`}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
