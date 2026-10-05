import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, MapPin, Smartphone } from 'lucide-react';
import { api, ApiError, type PaymentMethod } from '../lib/api';
import { cartTotals, useCart } from '../stores/cart';
import { useAuth } from '../stores/auth';
import { qk } from '../hooks/queries';
import { DELIVERY_CITIES, fcfa, NIVEAU_LABEL } from '../lib/format';
import { cn } from '../lib/cn';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/misc';
import { OrderSummary } from './Cart';

const OPERATORS: { v: PaymentMethod; name: string; hint: string; color: string; logo: string }[] = [
  { v: 'airtel', name: 'Airtel Money', hint: 'Numéros 05…', color: 'text-[#E30613]', logo: 'airtel' },
  { v: 'mtn', name: 'MTN Mobile Money', hint: 'Numéros 06…', color: 'text-[#d9a700]', logo: 'MTN' },
];

export default function Checkout() {
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const t = cartTotals(lines);

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState<string>('');
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);

  const mutation = useMutation({
    mutationFn: api.createOrder,
    onSuccess: (order) => {
      navigate(`/commande/confirmation/${order.reference}`, { replace: true, state: { order } });
      clear();
      qc.invalidateQueries({ queryKey: qk.myOrders });
    },
    onError: (e) => {
      setConfirm(false);
      if (e instanceof ApiError && e.status === 422) {
        setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k.startsWith('items') ? 'items' : k, v[0]])));
      } else {
        setErrors({ items: e instanceof Error ? e.message : 'Commande impossible.' });
      }
    },
  });

  if (!user) return <Navigate to="/connexion?next=/commande" replace />;
  if (lines.length === 0 && mutation.isIdle) return <Navigate to="/panier" replace />;

  const cleanPhone = phone.replace(/\D/g, '');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!city) e.delivery_city = 'Choisissez votre ville.';
    if (address.trim().length < 5) e.delivery_address = "Indiquez l'adresse (quartier, rue, repère).";
    if (!method) e.payment_method = 'Choisissez un opérateur.';
    if (!/^0\d{8}$/.test(cleanPhone)) e.payment_phone = 'Numéro à 9 chiffres, ex. 06 123 45 67.';
    setErrors(e);
    if (Object.keys(e).length === 0) setConfirm(true);
  };

  const submit = () =>
    mutation.mutate({
      items: lines.map((l) => ({ product_id: l.product.id, size: l.size, niveau: l.niveau, qty: l.qty })),
      payment_method: method!,
      payment_phone: cleanPhone,
      delivery_city: city,
      delivery_address: address.trim(),
    });

  return (
    <>
      <PageHeader kicker="Commande" title="Finaliser ma commande" />
      <div className="container-k grid gap-10 py-10 lg:grid-cols-[1fr_380px] lg:py-14">
        <div className="space-y-6">
          {errors.items && <div className="rounded-2xl bg-rouille-50 px-5 py-4 text-[14px] font-medium text-rouille-600">{errors.items}</div>}

          <Section icon={<MapPin className="size-5" />} n="1" title="Livraison">
            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <Select label="Ville" value={city} onChange={(e) => setCity(e.target.value)} error={errors.delivery_city}>
                <option value="">Choisir…</option>
                {DELIVERY_CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <Input
                label="Adresse de livraison"
                placeholder="Quartier, rue, point de repère"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                error={errors.delivery_address}
              />
            </div>
          </Section>

          <Section icon={<Smartphone className="size-5" />} n="2" title="Paiement de l'acompte">
            <p className="-mt-1 mb-5 text-[14px] text-ink-soft">
              Vous réglez <strong className="text-ink">{fcfa(t.deposit)}</strong> maintenant, le solde de {fcfa(t.balance)} à la livraison. Notre équipe vous
              recontacte sur WhatsApp pour finaliser le paiement.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {OPERATORS.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setMethod(o.v)}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border-2 bg-surface p-4 text-left transition',
                    method === o.v ? 'border-inverse shadow-sm' : 'border-line hover:border-ink-muted',
                  )}
                >
                  <span className={cn('grid h-12 w-16 place-items-center rounded-xl bg-page text-[15px] font-black tracking-tight', o.color)}>{o.logo}</span>
                  <span>
                    <span className="block font-semibold">{o.name}</span>
                    <span className="text-[13px] text-ink-muted">{o.hint}</span>
                  </span>
                </button>
              ))}
            </div>
            {errors.payment_method && <p className="mt-2 text-[12.5px] font-medium text-rouille-600">{errors.payment_method}</p>}

            <label className="label mt-5" htmlFor="phone">
              Numéro Mobile Money
            </label>
            <div className={cn('flex overflow-hidden rounded-xl border bg-surface focus-within:border-rouille-500 focus-within:ring-4 focus-within:ring-rouille-500/10', errors.payment_phone ? 'border-rouille-500' : 'border-line')}>
              <span className="grid place-items-center border-r border-line bg-surface-2/60 px-4 text-[15px] font-medium text-ink-soft">+242</span>
              <input
                id="phone"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="06 123 45 67"
                maxLength={13}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-transparent px-3.5 py-2.5 text-[15px] outline-none"
              />
            </div>
            {errors.payment_phone && <p className="mt-1.5 text-[12.5px] font-medium text-rouille-600">{errors.payment_phone}</p>}
          </Section>
        </div>

        <OrderSummary {...t}>
          <ul className="mt-5 space-y-2 border-t border-creme-50/10 pt-4 text-[13px] text-creme-200/80">
            {lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-3">
                <span className="truncate">
                  {l.qty} × {l.product.name} <span className="text-creme-200/50">({l.size}, {NIVEAU_LABEL[l.niveau]})</span>
                </span>
                <span className="shrink-0">{fcfa(l.product.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <Button size="lg" className="mt-6 w-full" onClick={validate} icon={<Lock className="size-4" />}>
            Valider la commande
          </Button>
        </OrderSummary>
      </div>

      <Modal open={confirm} onClose={() => !mutation.isPending && setConfirm(false)} eyebrow="Dernière étape" title="Confirmer la commande ?">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Votre commande de <strong className="text-ink">{fcfa(t.total)}</strong> va être enregistrée. L'acompte de{' '}
          <strong className="text-ink">{fcfa(t.deposit)}</strong> sera à régler via {method === 'airtel' ? 'Airtel Money' : 'MTN Mobile Money'} (+242 {cleanPhone}
          ). Livraison à {city}.
        </p>
        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => setConfirm(false)} disabled={mutation.isPending}>
            Revoir
          </Button>
          <Button onClick={submit} loading={mutation.isPending}>
            Oui, confirmer
          </Button>
        </div>
      </Modal>
    </>
  );
}

function Section({ icon, n, title, children }: { icon: React.ReactNode; n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-line bg-surface p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-rouille-600">{icon}</span>
        <h2 className="text-2xl">
          <span className="mr-2 text-ink-muted">{n}.</span>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
