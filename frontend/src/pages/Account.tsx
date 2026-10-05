import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, LayoutDashboard, LogOut, Package } from 'lucide-react';
import { useAuth } from '../stores/auth';
import { useMyOrders } from '../hooks/queries';
import type { Order } from '../lib/api';
import { fcfa, formatDate, NIVEAU_LABEL, ORDER_STATUS, PAYMENT_LABEL } from '../lib/format';
import { orderWhatsAppLink } from '../lib/whatsapp';
import { cn } from '../lib/cn';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState, Skeleton, StatusBadge } from '../components/ui/misc';
import { WhatsAppIcon } from '../components/ui/icons';

export default function Account() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: orders, isLoading } = useMyOrders(!!user);

  if (!user) return <Navigate to="/connexion?next=/compte" replace />;

  const logout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="container-k py-10 sm:py-14">
      <div className="flex flex-col gap-6 rounded-[32px] bg-brun-900 p-6 text-creme-100 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-2xl bg-rouille-500 font-display text-2xl text-creme-50">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl text-creme-50 sm:text-3xl">{user.full_name}</h1>
            <p className="text-[14px] text-creme-200/70">
              {user.role === 'eleve' ? 'Élève · compte personnel' : 'Parent · commande pour ses enfants'}
              {user.username && <span className="text-creme-200/40"> · @{user.username}</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.is_admin && (
            <ButtonLink to="/admin" variant="light" size="sm" icon={<LayoutDashboard className="size-4" />}>
              Administration
            </ButtonLink>
          )}
          <Button variant="outline" size="sm" className="border-creme-50/20 text-creme-100 hover:bg-surface/5" onClick={logout} icon={<LogOut className="size-4" />}>
            Se déconnecter
          </Button>
        </div>
      </div>

      <h2 className="mt-12 mb-5 text-2xl">Mes commandes</h2>
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : !orders?.length ? (
        <EmptyState icon={<Package className="size-6" />} title="Aucune commande pour l'instant" action={<ButtonLink to="/catalogue">Découvrir le catalogue</ButtonLink>}>
          Vos commandes apparaîtront ici une fois passées.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} customerName={user.full_name} />
          ))}
        </div>
      )}
    </div>
  );
}

const STEPS = ['Commande reçue', 'Acompte validé', 'En livraison', 'Livrée'];

function OrderRow({ order, customerName }: { order: Order; customerName: string }) {
  const [open, setOpen] = useState(false);
  const count = order.items.reduce((s, i) => s + i.qty, 0);
  const step = ORDER_STATUS[order.status].step;

  const payText =
    order.status === 'annulee'
      ? 'Commande annulée'
      : order.status === 'en_attente'
        ? `Acompte de ${fcfa(order.deposit)} en attente`
        : order.balance_paid
          ? `Soldée · ${fcfa(order.total)}`
          : `Solde de ${fcfa(order.balance)} à la livraison`;

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left sm:p-6" aria-expanded={open}>
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[14px] font-semibold">{order.reference}</span>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1.5 text-[13.5px] text-ink-muted">
            {count} article{count > 1 ? 's' : ''} · {formatDate(order.created_at)} · {payText}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-semibold">{fcfa(order.total)}</span>
          <ChevronDown className={cn('size-5 text-ink-muted transition', open && 'rotate-180')} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-line p-5 sm:p-6">
              {order.status !== 'annulee' && (
                <ol className="mb-6 grid grid-cols-4 gap-2">
                  {STEPS.map((s, i) => (
                    <li key={s}>
                      <div className={cn('h-1.5 rounded-full', i <= step ? 'bg-rouille-500' : 'bg-line')} />
                      <div className={cn('mt-2 text-[11.5px] leading-tight sm:text-[12.5px]', i <= step ? 'font-semibold text-ink' : 'text-ink-muted')}>{s}</div>
                    </li>
                  ))}
                </ol>
              )}
              <ul className="space-y-2 text-[14px]">
                {order.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between gap-4">
                    <span>
                      {i.qty} × {i.product_name} <span className="text-ink-muted">— taille {i.size}, {NIVEAU_LABEL[i.niveau]}</span>
                    </span>
                    <span>{fcfa(i.line_total)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[13.5px] text-ink-soft">
                <span>
                  {PAYMENT_LABEL[order.payment_method]}
                  {order.delivery_city && ` · Livraison ${order.delivery_city}`}
                </span>
                {order.status === 'en_attente' && (
                  <a
                    href={orderWhatsAppLink(order, customerName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-[13px] font-semibold text-white"
                  >
                    <WhatsAppIcon className="size-4" /> Relancer sur WhatsApp
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
