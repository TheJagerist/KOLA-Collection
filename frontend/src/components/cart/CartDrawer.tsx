import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { ProductImage } from '../product/ProductImage';
import { QtyStepper } from '../product/AddToCartDialog';
import { cartTotals, useCart } from '../../stores/cart';
import { useUi } from '../../stores/ui';
import { useAuth } from '../../stores/auth';
import { fcfa, NIVEAU_LABEL } from '../../lib/format';

export function CartDrawer() {
  const open = useUi((s) => s.cartOpen);
  const close = useUi((s) => s.closeCart);
  const { lines, setQty, remove } = useCart();
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const t = cartTotals(lines);

  const go = (to: string) => {
    close();
    navigate(to);
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={
        <span className="flex items-baseline gap-2">
          Mon panier <span className="font-sans text-sm text-ink-muted">({t.count})</span>
        </span>
      }
      footer={
        lines.length > 0 && (
          <>
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-[12.5px] font-medium text-emerald-700 dark:text-emerald-300">
              <Truck className="size-4" /> Livraison offerte à Brazzaville et Pointe-Noire
            </div>
            <dl className="space-y-1.5 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Total</dt>
                <dd className="font-semibold text-ink">{fcfa(t.total)}</dd>
              </div>
              <div className="flex justify-between text-rouille-600 dark:text-rouille-400">
                <dt>À payer aujourd'hui (50 %)</dt>
                <dd className="font-semibold">{fcfa(t.deposit)}</dd>
              </div>
            </dl>
            <Button size="lg" className="mt-4 w-full" onClick={() => go(user ? '/commande' : '/connexion?next=/commande')} icon={<ArrowRight className="order-last size-4" />}>
              Commander
            </Button>
            <button onClick={() => go('/panier')} className="mt-2 h-10 w-full text-[14px] font-medium text-ink-soft hover:text-ink">
              Voir le panier détaillé
            </button>
          </>
        )
      }
    >
      {lines.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-surface-2 text-ink-soft">
            <ShoppingBag className="size-7" />
          </div>
          <p className="mt-4 font-display text-xl text-ink">Votre panier est vide</p>
          <p className="mt-1 text-[14px] text-ink-muted">Ajoutez un article pour commencer.</p>
          <Button className="mt-6" onClick={() => go('/catalogue')}>
            Voir le catalogue
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-line pb-4">
          <AnimatePresence initial={false}>
            {lines.map((l) => (
              <motion.li
                key={l.key}
                layout
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30, height: 0 }}
                className="flex gap-4 py-4"
              >
                <Link to={`/produit/${l.product.slug}`} onClick={close}>
                  <ProductImage product={l.product} className="size-20 rounded-2xl" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-2">
                    <span className="truncate font-medium text-ink">{l.product.name}</span>
                    <span className="shrink-0 text-[14px] font-semibold text-ink">{fcfa(l.product.price * l.qty)}</span>
                  </div>
                  <span className="text-[12.5px] text-ink-muted">
                    Taille {l.size} · {NIVEAU_LABEL[l.niveau]}
                  </span>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <QtyStepper value={l.qty} onChange={(q) => setQty(l.key, q)} />
                    <button onClick={() => remove(l.key)} className="grid size-10 place-items-center rounded-full text-ink-muted transition hover:bg-rouille-50 hover:text-rouille-600" aria-label="Retirer">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Sheet>
  );
}
