import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet } from 'lucide-react';
import { api } from '../../lib/api';
import { qk } from '../../hooks/queries';
import { fcfa, NIVEAU_LABEL, PAYMENT_LABEL, paidAmounts } from '../../lib/format';
import { Chip, Skeleton } from '../../components/ui/misc';
import { downloadCsv, Table, Td, Th, THead, Tr, useSort } from '../../components/admin/DataTable';
import { Panel } from './AdminLayout';
import { cn } from '../../lib/cn';

type Preset = '7j' | '30j' | 'mois' | 'mois_prec' | 'annee' | 'perso';
const PRESETS: Record<Preset, string> = { '7j': '7 jours', '30j': '30 jours', mois: 'Ce mois', mois_prec: 'Mois dernier', annee: 'Cette année', perso: 'Personnalisé' };

const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function range(p: Preset, from: string, to: string): [string, string] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (p) {
    case '7j':
      return [day(new Date(Date.now() - 6 * 864e5)), day(now)];
    case '30j':
      return [day(new Date(Date.now() - 29 * 864e5)), day(now)];
    case 'mois':
      return [day(new Date(y, m, 1)), day(now)];
    case 'mois_prec':
      return [day(new Date(y, m - 1, 1)), day(new Date(y, m, 0))];
    case 'annee':
      return [day(new Date(y, 0, 1)), day(now)];
    default:
      return [from, to];
  }
}

const localDay = (iso: string) => day(new Date(iso));

/** Rapports de ventes calculés à partir des commandes (hors commandes annulées) */
export default function AdminReports() {
  const { data: orders, isLoading } = useQuery({ queryKey: qk.admin.orders, queryFn: () => api.admin.listOrders() });
  const [preset, setPreset] = useState<Preset>('30j');
  const [custom, setCustom] = useState<[string, string]>([day(new Date(Date.now() - 29 * 864e5)), day(new Date())]);
  const [from, to] = range(preset, ...custom);

  const inRange = useMemo(() => (orders ?? []).filter((o) => localDay(o.created_at) >= from && localDay(o.created_at) <= to), [orders, from, to]);
  const sold = inRange.filter((o) => o.status !== 'annulee');

  const k = useMemo(() => {
    const revenue = sold.reduce((s, o) => s + o.total, 0);
    const cashed = sold.reduce((s, o) => s + paidAmounts(o).paid, 0);
    const pieces = sold.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0);
    const discounts = sold.reduce((s, o) => s + (o.discount ?? 0), 0);
    return { revenue, cashed, due: revenue - cashed, pieces, discounts, count: sold.length, avg: sold.length ? Math.round(revenue / sold.length) : 0, cancelled: inRange.length - sold.length };
  }, [sold, inRange]);

  const daily = useMemo(() => {
    const map = new Map<string, number>();
    for (let d = new Date(from + 'T12:00:00'); day(d) <= to; d = new Date(d.getTime() + 864e5)) map.set(day(d), 0);
    sold.forEach((o) => map.set(localDay(o.created_at), (map.get(localDay(o.created_at)) ?? 0) + o.total));
    return [...map.entries()];
  }, [sold, from, to]);

  const byArticle = useMemo(() => group(sold.flatMap((o) => o.items.map((i) => ({ key: `${i.product_name}|${i.size}|${i.niveau}`, qty: i.qty, amount: i.line_total })))), [sold]);
  const byCity = useMemo(() => group(sold.map((o) => ({ key: o.delivery_city ?? 'Retrait', qty: 1, amount: o.total }))), [sold]);
  const byPayment = useMemo(() => group(sold.map((o) => ({ key: PAYMENT_LABEL[o.payment_method], qty: 1, amount: o.total }))), [sold]);
  const bySource = useMemo(() => group(sold.map((o) => ({ key: o.source === 'manuel' ? 'Téléphone / boutique' : 'Site web', qty: 1, amount: o.total }))), [sold]);
  const byPromo = useMemo(
    () => group(sold.filter((o) => o.discount).map((o) => ({ key: o.promo_code ?? o.promo_label ?? 'Remise', qty: 1, amount: o.discount ?? 0 }))),
    [sold],
  );

  const articles = byArticle.map((r) => {
    const [name, size, niveau] = r.key.split('|');
    return { ...r, name, size, niveau: NIVEAU_LABEL[niveau as keyof typeof NIVEAU_LABEL] ?? niveau };
  });
  const { sorted: articleRows, by } = useSort(articles, { key: 'qty', dir: 'desc' }, { name: (r) => r.name, qty: (r) => r.qty, amount: (r) => r.amount });

  const stamp = `${from}_${to}`;
  const exportOrders = () =>
    downloadCsv(`ventes-kola-${stamp}.csv`, [
      ['Référence', 'Date', 'Statut', 'Source', 'Client', 'Ville', 'Paiement', 'Sous-total', 'Remise', 'Code', 'Total', 'Encaissé', 'Reste dû', 'Articles'],
      ...inRange.map((o) => [
        o.reference,
        new Date(o.created_at).toLocaleString('fr-FR'),
        o.status,
        o.source ?? 'web',
        o.customer?.full_name,
        o.delivery_city,
        PAYMENT_LABEL[o.payment_method],
        o.subtotal ?? o.total,
        o.discount ?? 0,
        o.promo_code ?? '',
        o.total,
        paidAmounts(o).paid,
        paidAmounts(o).due,
        o.items.reduce((n, i) => n + i.qty, 0),
      ]),
    ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(PRESETS) as Preset[]).map((p) => (
          <Chip key={p} active={preset === p} onClick={() => setPreset(p)}>
            {PRESETS[p]}
          </Chip>
        ))}
        {preset === 'perso' && (
          <div className="flex items-center gap-2">
            <input type="date" className="field h-9 w-auto py-0 text-[13px]" value={custom[0]} max={custom[1]} onChange={(e) => setCustom([e.target.value, custom[1]])} aria-label="Du" />
            <span className="text-ink-muted">→</span>
            <input type="date" className="field h-9 w-auto py-0 text-[13px]" value={custom[1]} min={custom[0]} onChange={(e) => setCustom([custom[0], e.target.value])} aria-label="Au" />
          </div>
        )}
        <button
          onClick={exportOrders}
          disabled={!inRange.length}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3.5 text-[13px] font-semibold text-ink transition hover:border-ink/25 disabled:opacity-40"
        >
          <FileSpreadsheet className="size-4" /> Exporter les ventes
        </button>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Chiffre d'affaires" value={fcfa(k.revenue)} hint={`${k.count} commande(s) · ${k.cancelled} annulée(s)`} strong />
            <Kpi label="Encaissé" value={fcfa(k.cashed)} hint={`Reste à encaisser : ${fcfa(k.due)}`} />
            <Kpi label="Panier moyen" value={fcfa(k.avg)} hint={`${k.pieces} article(s) vendus`} />
            <Kpi label="Remises accordées" value={fcfa(k.discounts)} hint={k.revenue ? `${((k.discounts / (k.revenue + k.discounts)) * 100).toFixed(1)} % du brut` : undefined} />
          </div>

          <Panel title="Ventes par jour" description={`Du ${new Date(from + 'T12:00').toLocaleDateString('fr-FR')} au ${new Date(to + 'T12:00').toLocaleDateString('fr-FR')}`}>
            <Bars data={daily} />
          </Panel>

          <Panel
            title="Articles vendus"
            description="Par article, taille et niveau — utile pour réassortir"
            actions={
              <CsvBtn
                onClick={() => downloadCsv(`articles-kola-${stamp}.csv`, [['Article', 'Taille', 'Niveau', 'Quantité', 'Montant (FCFA)'], ...articleRows.map((r) => [r.name, r.size, r.niveau, r.qty, r.amount])])}
                disabled={!articleRows.length}
              />
            }
          >
            {articleRows.length ? (
              <div className="-mx-5 sm:-mx-6">
                <Table minWidth={560}>
                  <THead>
                    <Th sort={by('name')}>Article</Th>
                    <Th align="center">Taille</Th>
                    <Th>Niveau</Th>
                    <Th align="right" sort={by('qty')}>
                      Quantité
                    </Th>
                    <Th align="right" sort={by('amount')}>
                      Montant
                    </Th>
                  </THead>
                  <tbody>
                    {articleRows.slice(0, 40).map((r) => (
                      <Tr key={r.key}>
                        <Td className="max-w-[280px] truncate font-medium text-ink">{r.name}</Td>
                        <Td align="center" className="font-semibold text-ink">
                          {r.size}
                        </Td>
                        <Td className="text-ink-soft">{r.niveau}</Td>
                        <Td align="right" className="font-semibold text-ink tabular-nums">
                          {r.qty}
                        </Td>
                        <Td align="right" className="text-ink-soft tabular-nums">
                          {fcfa(r.amount)}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <p className="text-[13.5px] text-ink-muted">Aucune vente sur la période.</p>
            )}
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-4">
            <Breakdown title="Par ville" rows={byCity} unit="commande" />
            <Breakdown title="Par moyen de paiement" rows={byPayment} unit="commande" />
            <Breakdown title="Par canal" rows={bySource} unit="commande" />
            <Breakdown title="Codes promo utilisés" rows={byPromo} unit="utilisation" amountLabel="remise" empty="Aucune remise sur la période." />
          </div>
        </>
      )}
    </div>
  );
}

type Grouped = { key: string; qty: number; amount: number };
function group(rows: Grouped[]): Grouped[] {
  const m = new Map<string, Grouped>();
  rows.forEach((r) => {
    const c = m.get(r.key) ?? { key: r.key, qty: 0, amount: 0 };
    c.qty += r.qty;
    c.amount += r.amount;
    m.set(r.key, c);
  });
  return [...m.values()].sort((a, b) => b.amount - a.amount);
}

function Kpi({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className={cn('rounded-[20px] border p-4 shadow-[0_1px_2px_rgba(28,20,13,0.04)] sm:p-5', strong ? 'border-transparent bg-inverse text-on-inverse' : 'border-line bg-surface')}>
      <div className={cn('text-[12.5px]', strong ? 'opacity-70' : 'text-ink-muted')}>{label}</div>
      <div className={cn('mt-1 font-display text-lg font-semibold tabular-nums sm:text-2xl', !strong && 'text-ink')}>{value}</div>
      {hint && <div className={cn('mt-0.5 text-[11.5px]', strong ? 'opacity-60' : 'text-ink-muted')}>{hint}</div>}
    </div>
  );
}

function Bars({ data }: { data: [string, number][] }) {
  const max = Math.max(1, ...data.map(([, v]) => v));
  const dense = data.length > 45;
  return (
    <div>
      <div className="flex h-48 items-end gap-[3px]">
        {data.map(([d, v]) => (
          <div key={d} className="group relative flex h-full flex-1 items-end">
            <div className={cn('w-full rounded-t-[4px] transition', v ? 'bg-rouille-500/80 group-hover:bg-rouille-500' : 'bg-surface-2')} style={{ height: `${Math.max(v ? 4 : 2, (v / max) * 100)}%` }} />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg bg-inverse px-2 py-1 text-[11.5px] whitespace-nowrap text-on-inverse group-hover:block">
              {new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {fcfa(v)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-muted">
        {data
          .filter((_, i) => i === 0 || i === data.length - 1 || (!dense && data.length > 10 && i === Math.floor(data.length / 2)))
          .map(([d]) => (
            <span key={d}>{new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          ))}
      </div>
    </div>
  );
}

function Breakdown({ title, rows, unit, amountLabel, empty }: { title: string; rows: Grouped[]; unit: string; amountLabel?: string; empty?: string }) {
  const total = rows.reduce((s, r) => s + r.amount, 0) || 1;
  return (
    <Panel title={title}>
      {rows.length ? (
        <ul className="space-y-3.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
                <span className="truncate font-medium text-ink">{r.key}</span>
                <span className="shrink-0 font-semibold text-ink tabular-nums">{fcfa(r.amount)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-rouille-500" style={{ width: `${(r.amount / total) * 100}%` }} />
              </div>
              <div className="mt-1 text-[11.5px] text-ink-muted">
                {r.qty} {unit}
                {r.qty > 1 ? 's' : ''}
                {amountLabel ? ` · ${amountLabel}` : ''} · {Math.round((r.amount / total) * 100)} %
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13.5px] text-ink-muted">{empty ?? 'Aucune donnée.'}</p>
      )}
    </Panel>
  );
}

function CsvBtn({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="inline-flex h-9 items-center gap-2 rounded-xl border border-line px-3 text-[13px] font-semibold text-ink transition hover:border-ink/25 disabled:opacity-40">
      <FileSpreadsheet className="size-4" /> CSV
    </button>
  );
}

