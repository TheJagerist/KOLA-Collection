import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Truck } from 'lucide-react';
import { api, type Order } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { Button } from '../ui/Button';
import { ROLE_LABEL } from '../../lib/staff';

export const DELIVERY_SLOTS = ['Matin (8h – 12h)', 'Après-midi (12h – 16h)', 'Soir (16h – 19h)'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Affectation d'un livreur, d'une date et d'un créneau */
export function DeliveryEditor({ order: o }: { order: Order }) {
  const { data: couriers } = useQuery({ queryKey: qk.admin.couriers, queryFn: () => api.admin.couriers(), staleTime: 60_000 });
  const [courier, setCourier] = useState<string>(o.courier?.id ? String(o.courier.id) : '');
  const [date, setDate] = useState(o.delivery_date ?? '');
  const [slot, setSlot] = useState(o.delivery_slot ?? '');

  useEffect(() => {
    setCourier(o.courier?.id ? String(o.courier.id) : '');
    setDate(o.delivery_date ?? '');
    setSlot(o.delivery_slot ?? '');
  }, [o.id, o.courier?.id, o.delivery_date, o.delivery_slot]);

  const save = useAdminMutation(
    () => api.admin.setDelivery(o.id, { courier_id: courier ? Number(courier) : null, delivery_date: date || null, delivery_slot: slot || null }),
    { success: 'Livraison planifiée', invalidate: [qk.admin.orders, qk.admin.events(o.id), ['admin', 'deliveries']] },
  );

  const dirty = courier !== (o.courier?.id ? String(o.courier.id) : '') || date !== (o.delivery_date ?? '') || slot !== (o.delivery_slot ?? '');
  const today = new Date();
  const tomorrow = new Date(Date.now() + 864e5);
  const closed = o.status === 'livre' || o.status === 'annulee';

  return (
    <section className="rounded-2xl border border-line p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
          <Truck className="size-4" /> Livraison
        </div>
        {o.courier && (
          <span className="text-[12px] text-ink-muted">
            Actuellement : <strong className="text-ink">{o.courier.full_name}</strong>
          </span>
        )}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-[12px] text-ink-muted">Livreur</span>
          <select className="field h-10 py-0 text-[13.5px]" value={courier} onChange={(e) => setCourier(e.target.value)} disabled={closed}>
            <option value="">— Non attribuée —</option>
            {couriers?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} · {ROLE_LABEL[c.staff_role]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 flex items-center justify-between text-[12px] text-ink-muted">
            Date
            <span className="flex gap-1">
              {[
                ['Auj.', today],
                ['Demain', tomorrow],
              ].map(([l, d]) => (
                <button key={l as string} type="button" disabled={closed} onClick={() => setDate(iso(d as Date))} className="rounded-md px-1.5 text-[11px] font-semibold text-rouille-600 hover:bg-rouille-50 dark:hover:bg-rouille-500/10">
                  {l as string}
                </button>
              ))}
            </span>
          </span>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
            <input type="date" className="field h-10 py-0 pl-9 text-[13.5px]" value={date} min={iso(today)} onChange={(e) => setDate(e.target.value)} disabled={closed} />
          </div>
        </label>
        <label>
          <span className="mb-1 block text-[12px] text-ink-muted">Créneau</span>
          <select className="field h-10 py-0 text-[13.5px]" value={slot} onChange={(e) => setSlot(e.target.value)} disabled={closed}>
            <option value="">— Indifférent —</option>
            {[...new Set([...DELIVERY_SLOTS, ...(o.delivery_slot ? [o.delivery_slot] : [])])].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {dirty && (
        <Button size="sm" className="mt-3 w-full" loading={save.isPending} onClick={() => save.mutate(undefined)}>
          Enregistrer la livraison
        </Button>
      )}
    </section>
  );
}
