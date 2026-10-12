import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleDot, MessageSquareText, Send, ShoppingBag, Truck, Wallet } from 'lucide-react';
import { api, type OrderEvent } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { ORDER_STATUS } from '../../lib/format';
import { cn } from '../../lib/cn';
import { Skeleton } from '../ui/misc';

const ICON: Record<OrderEvent['type'], typeof CircleDot> = {
  created: ShoppingBag,
  status: CircleDot,
  note: MessageSquareText,
  payment: Wallet,
  delivery: Truck,
};

function describe(e: OrderEvent) {
  if (e.type === 'created') return e.body ?? 'Commande créée';
  if (e.type === 'status' && e.to_status) {
    return `${e.from_status ? `${ORDER_STATUS[e.from_status].label.replace(' de paiement', '')} → ` : ''}${ORDER_STATUS[e.to_status].label.replace(' de paiement', '')}`;
  }
  return e.body ?? '';
}

const when = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Historique de la commande (qui a fait quoi, quand) + notes internes de l'équipe */
export function OrderTimeline({ orderId }: { orderId: number }) {
  const { data, isLoading } = useQuery({ queryKey: qk.admin.events(orderId), queryFn: () => api.admin.orderEvents(orderId) });
  const [note, setNote] = useState('');
  const add = useAdminMutation((body: string) => api.admin.addOrderNote(orderId, body), {
    success: 'Note ajoutée',
    invalidate: [qk.admin.events(orderId)],
  });

  return (
    <section>
      <div className="mb-2 text-[11.5px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Historique & notes internes</div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (note.trim()) add.mutate(note.trim(), { onSuccess: () => setNote('') });
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          placeholder="Ajouter une note (visible par l'équipe uniquement)…"
          className="field h-10 flex-1 py-0 text-[13.5px]"
          aria-label="Note interne"
        />
        <button
          disabled={!note.trim() || add.isPending}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-inverse text-on-inverse transition hover:opacity-90 disabled:opacity-40"
          aria-label="Ajouter la note"
        >
          <Send className="size-4" />
        </button>
      </form>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : (
        <ol className="relative space-y-4 pl-1">
          <span className="absolute top-2 bottom-2 left-[15px] w-px bg-line" aria-hidden />
          {(data ?? []).map((e) => {
            const Icon = ICON[e.type];
            const isNote = e.type === 'note';
            return (
              <li key={e.id} className="relative flex gap-3">
                <span
                  className={cn(
                    'relative z-[1] grid size-[30px] shrink-0 place-items-center rounded-full ring-4 ring-surface',
                    isNote ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : e.type === 'payment' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-surface-2 text-ink-soft',
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <div className={cn('text-[13.5px] text-ink', isNote && 'rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-500/10', e.type === 'status' && 'font-medium')}>
                    {describe(e)}
                    {e.type === 'status' && e.body && <div className="mt-0.5 text-[12.5px] font-normal text-ink-muted">{e.body}</div>}
                  </div>
                  <div className="mt-1 text-[11.5px] text-ink-muted">
                    {when(e.created_at)} · {e.user ? (e.user.is_staff ? e.user.full_name : `${e.user.full_name} (client)`) : 'Système'}
                  </div>
                </div>
              </li>
            );
          })}
          {!data?.length && <li className="text-[13px] text-ink-muted">Aucun évènement pour l’instant.</li>}
        </ol>
      )}
    </section>
  );
}
