import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, Search, Trash2, UserPlus, UserRound } from 'lucide-react';
import { api, ApiError, type CustomerSummary, type Niveau, type Order, type PaymentMethod } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { DELIVERY_CITIES, fcfa, formatPhone, NIVEAU_LABEL, PAYMENT_LABEL } from '../../lib/format';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/cn';

type Line = { key: number; product_id: number; size: string; niveau: Niveau; qty: number };
let lineSeq = 1;

const digits = (s: string) => s.replace(/\D/g, '').replace(/^242/, '');

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Saisie d'une commande prise par téléphone ou en boutique */
export function ManualOrderModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (o: Order) => void }) {
  const { data: products } = useQuery({ queryKey: qk.admin.products, queryFn: () => api.admin.listProducts(), enabled: open });
  const { data: customers } = useQuery({ queryKey: qk.admin.customers, queryFn: () => api.admin.customers(), enabled: open });
  const catalogue = useMemo(() => (products ?? []).filter((p) => !p.is_archived), [products]);

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<CustomerSummary | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [city, setCity] = useState<string>(DELIVERY_CITIES[0]);
  const [address, setAddress] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('mtn');
  const [payPhone, setPayPhone] = useState('');
  const [promo, setPromo] = useState('');
  const [depositReceived, setDepositReceived] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const reset = () => {
    setMode('existing');
    setQ('');
    setPicked(null);
    setNewName('');
    setNewPhone('');
    setLines([]);
    setCity(DELIVERY_CITIES[0]);
    setAddress('');
    setMethod('mtn');
    setPayPhone('');
    setPromo('');
    setDepositReceived(false);
    setErrors({});
  };

  // Pré-remplissage depuis la fiche du client choisi
  useEffect(() => {
    if (!picked) return;
    if (picked.phone) setPayPhone(picked.phone);
    if (picked.city && (DELIVERY_CITIES as readonly string[]).includes(picked.city)) setCity(picked.city);
  }, [picked]);
  useEffect(() => {
    if (mode === 'new' && !payPhone) setPayPhone(digits(newPhone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPhone]);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    const d = digits(q);
    if (!s) return (customers ?? []).slice(0, 5);
    return (customers ?? [])
      .filter((c) => c.full_name.toLowerCase().includes(s) || c.username?.toLowerCase().includes(s) || (d.length >= 3 && c.phone?.includes(d)))
      .slice(0, 6);
  }, [customers, q]);

  const items = lines.map(({ product_id, size, niveau, qty }) => ({ product_id, size, niveau, qty }));
  const quoteKey = useDebounced(JSON.stringify([items, promo.trim().toUpperCase()]));
  const quote = useQuery({
    queryKey: ['admin', 'quote', quoteKey],
    queryFn: () => {
      const [it, code] = JSON.parse(quoteKey) as [typeof items, string];
      return api.quote(it, code || null);
    },
    enabled: open && items.length > 0,
    retry: false,
  });
  const quoteError = quote.error instanceof ApiError ? quote.error.firstError() : null;

  const addLine = (productId: number) => {
    const p = catalogue.find((x) => x.id === productId);
    if (!p) return;
    const firstSize = p.sizes.find((s) => !p.stock || (p.stock[s] ?? 0) > 0) ?? p.sizes[0];
    setLines((l) => [...l, { key: lineSeq++, product_id: p.id, size: firstSize, niveau: p.niveaux[0] ?? 'college', qty: 1 }]);
  };
  const patch = (key: number, v: Partial<Line>) => setLines((l) => l.map((x) => (x.key === key ? { ...x, ...v } : x)));

  const create = useAdminMutation(
    () =>
      api.admin.createOrder({
        ...(mode === 'existing' && picked ? { customer_id: picked.id } : { customer: { full_name: newName.trim(), phone: digits(newPhone) } }),
        items,
        payment_method: method,
        payment_phone: digits(payPhone),
        delivery_city: city,
        delivery_address: address.trim(),
        promo_code: promo.trim() || null,
        deposit_received: depositReceived,
      }),
    { success: (o) => `Commande ${o.reference} enregistrée`, invalidate: [qk.admin.orders, qk.admin.customers, qk.admin.lowStock, qk.admin.products] },
  );

  const submit = () => {
    setErrors({});
    create.mutate(undefined, {
      onSuccess: (o) => {
        reset();
        onCreated(o);
      },
      onError: (e) => e instanceof ApiError && setErrors(e.errors),
    });
  };

  const err = (k: string) => errors[k]?.[0];
  const customerOk = mode === 'existing' ? !!picked : newName.trim().length > 1 && digits(newPhone).length === 9;
  const canSubmit = customerOk && lines.length > 0 && address.trim().length >= 3 && digits(payPhone).length === 9 && !quoteError;

  return (
    <Modal open={open} onClose={onClose} eyebrow="Téléphone · boutique" title="Nouvelle commande" className="sm:max-w-3xl">
      <div className="space-y-6">
        {/* CLIENT */}
        <Section n={1} title="Client">
          <div className="mb-3 inline-flex rounded-xl bg-surface-2 p-1 text-[13px] font-medium">
            {(
              [
                ['existing', 'Client existant', UserRound],
                ['new', 'Nouveau client', UserPlus],
              ] as const
            ).map(([m, l, I]) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition', mode === m ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted')}>
                <I className="size-3.5" /> {l}
              </button>
            ))}
          </div>
          {mode === 'existing' ? (
            picked ? (
              <div className="flex items-center gap-3 rounded-2xl border border-line p-3">
                <Avatar user={picked} className="size-10 text-[12px]" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">{picked.full_name}</div>
                  <div className="text-[12.5px] text-ink-muted">
                    {picked.phone ? formatPhone(picked.phone) : 'Pas de téléphone'} · {picked.orders_count} commande(s)
                  </div>
                </div>
                <button type="button" onClick={() => setPicked(null)} className="text-[13px] font-semibold text-rouille-600 hover:underline">
                  Changer
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
                  <input className="field h-10 py-0 pl-9" placeholder="Nom, identifiant ou téléphone…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
                </div>
                <ul className="mt-2 divide-y divide-line/70 rounded-2xl border border-line">
                  {matches.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => setPicked(c)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2/50">
                        <Avatar user={c} className="size-8 text-[11px]" />
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{c.full_name}</span>
                        <span className="text-[12px] text-ink-muted">{c.phone ? formatPhone(c.phone) : c.username ? `@${c.username}` : ''}</span>
                      </button>
                    </li>
                  ))}
                  {!matches.length && (
                    <li className="px-3 py-3 text-[13px] text-ink-muted">
                      Aucun client trouvé.{' '}
                      <button type="button" className="font-semibold text-rouille-600 hover:underline" onClick={() => (setMode('new'), setNewName(q))}>
                        Créer « {q} »
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Nom complet" error={err('customer.full_name')}>
                <input className="field h-10 py-0" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex. Mireille Nkounkou" />
              </Labeled>
              <Labeled label="Téléphone" error={err('customer.phone')} hint="Si ce numéro a déjà un compte, la commande y sera rattachée.">
                <input className="field h-10 py-0" inputMode="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="06 123 45 67" />
              </Labeled>
            </div>
          )}
        </Section>

        {/* ARTICLES */}
        <Section n={2} title="Articles">
          {lines.length > 0 && (
            <ul className="mb-3 space-y-2">
              {lines.map((l) => {
                const p = catalogue.find((x) => x.id === l.product_id);
                if (!p) return null;
                return (
                  <li key={l.key} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line p-2.5">
                    <span className="size-11 shrink-0 overflow-hidden rounded-xl bg-surface-2">{p.image_url && <img src={p.image_url} alt="" className="size-full object-cover" />}</span>
                    <div className="min-w-0 flex-1 basis-40">
                      <div className="truncate text-[13.5px] font-medium text-ink">{p.name}</div>
                      <div className="text-[12px] text-ink-muted">{fcfa(p.price)}</div>
                    </div>
                    <select className="field h-9 w-auto py-0 text-[13px]" value={l.size} onChange={(e) => patch(l.key, { size: e.target.value })} aria-label="Taille">
                      {p.sizes.map((s) => {
                        const left = p.stock ? (p.stock[s] ?? 0) : null;
                        return (
                          <option key={s} value={s} disabled={left === 0}>
                            T. {s}
                            {left !== null ? ` (${left})` : ''}
                          </option>
                        );
                      })}
                    </select>
                    <select className="field h-9 w-auto py-0 text-[13px]" value={l.niveau} onChange={(e) => patch(l.key, { niveau: e.target.value as Niveau })} aria-label="Niveau">
                      {p.niveaux.map((n) => (
                        <option key={n} value={n}>
                          {NIVEAU_LABEL[n]}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center rounded-xl border border-line">
                      <button type="button" className="grid size-8 place-items-center text-ink-soft" onClick={() => patch(l.key, { qty: Math.max(1, l.qty - 1) })} aria-label="Moins">
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center text-[13.5px] font-semibold tabular-nums">{l.qty}</span>
                      <button type="button" className="grid size-8 place-items-center text-ink-soft" onClick={() => patch(l.key, { qty: Math.min(50, l.qty + 1) })} aria-label="Plus">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <button type="button" onClick={() => setLines((x) => x.filter((y) => y.key !== l.key))} className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-rouille-50 hover:text-rouille-600" aria-label="Retirer">
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <select
            className="field h-10 py-0 text-[13.5px]"
            value=""
            onChange={(e) => e.target.value && addLine(Number(e.target.value))}
            aria-label="Ajouter un article"
          >
            <option value="">+ Ajouter un article…</option>
            {catalogue.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {fcfa(p.price)}
              </option>
            ))}
          </select>
          {err('items') && <p className="mt-1.5 text-[12.5px] font-medium text-rouille-600">{err('items')}</p>}
        </Section>

        {/* LIVRAISON + PAIEMENT */}
        <Section n={3} title="Livraison et paiement">
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Ville">
              <select className="field h-10 py-0" value={city} onChange={(e) => setCity(e.target.value)}>
                {DELIVERY_CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Adresse (quartier, rue, repère) — ou « Retrait boutique »" error={err('delivery_address')}>
              <input className="field h-10 py-0" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Moungali, rue Mbaka, près du marché" />
            </Labeled>
            <Labeled label="Mobile Money">
              <select className="field h-10 py-0" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_LABEL[m]}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Numéro de paiement" error={err('payment_phone')}>
              <input className="field h-10 py-0" inputMode="tel" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} placeholder="06 123 45 67" />
            </Labeled>
            <Labeled label="Code promo (facultatif)" error={err('promo_code') ?? (quoteError && promo ? quoteError : undefined)}>
              <input className="field h-10 py-0 uppercase" value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="RENTREE26" />
            </Labeled>
            <label className="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-line px-3 py-2.5">
              <input type="checkbox" className="size-4 accent-[var(--color-rouille-500)]" checked={depositReceived} onChange={(e) => setDepositReceived(e.target.checked)} />
              <span className="text-[13.5px] text-ink">
                Acompte déjà reçu
                <span className="block text-[12px] text-ink-muted">La commande passe directement en « Validée »</span>
              </span>
            </label>
          </div>
        </Section>

        {/* TOTAUX */}
        <div className="rounded-2xl bg-surface-2/60 p-4 text-[13.5px]">
          {quote.data ? (
            <div className="space-y-1.5">
              <Row l={`Sous-total · ${quote.data.items_count} article(s)`} v={fcfa(quote.data.subtotal)} />
              {quote.data.discount > 0 && <Row l={`Remise — ${quote.data.promo?.label}`} v={`− ${fcfa(quote.data.discount)}`} accent />}
              <Row l="Total" v={fcfa(quote.data.total)} strong />
              <Row l="Acompte (50 %)" v={fcfa(quote.data.deposit)} />
            </div>
          ) : (
            <p className="text-ink-muted">{quoteError ?? (lines.length ? 'Calcul…' : 'Ajoutez des articles pour voir le total.')}</p>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={submit} loading={create.isPending} disabled={!canSubmit}>
            Enregistrer la commande
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-ink">
        <span className="grid size-6 place-items-center rounded-full bg-inverse text-[12px] text-on-inverse">{n}</span>
        {title}
      </h4>
      {children}
    </section>
  );
}

function Labeled({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-medium text-ink-muted">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] font-medium text-rouille-600">{error}</span> : hint ? <span className="mt-1 block text-[12px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

function Row({ l, v, strong, accent }: { l: string; v: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-muted">{l}</span>
      <span className={cn('tabular-nums', strong ? 'text-[15px] font-semibold text-ink' : accent ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-ink-soft')}>{v}</span>
    </div>
  );
}
