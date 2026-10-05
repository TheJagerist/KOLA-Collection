import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ShoppingBag, Trash2, Info } from 'lucide-react';
import { cartTotals, useCart } from '../stores/cart';
import { useAuth } from '../stores/auth';
import { useProducts } from '../hooks/queries';
import { fcfa, NIVEAU_LABEL } from '../lib/format';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState, PageHeader } from '../components/ui/misc';
import { ProductImage } from '../components/product/ProductImage';
import { QtyStepper } from '../components/product/AddToCartDialog';

export default function Cart() {
  const { lines, setQty, remove, syncPrices } = useCart();
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const { data: products } = useProducts();
  const t = cartTotals(lines);

  // Met à jour les prix affichés si le catalogue a changé depuis l'ajout
  useEffect(() => {
    if (products) syncPrices(products);
  }, [products, syncPrices]);

  const unavailable = products ? lines.filter((l) => !products.some((p) => p.id === l.product.id)) : [];

  const checkout = () => navigate(user ? '/commande' : '/connexion?next=/commande');

  return (
    <>
      <PageHeader kicker="Panier" title="Votre panier" />
      <div className="container-k py-10 lg:py-14">
        {lines.length === 0 ? (
          <EmptyState icon={<ShoppingBag className="size-6" />} title="Votre panier est vide" action={<ButtonLink to="/catalogue">Voir le catalogue</ButtonLink>}>
            Ajoutez un article depuis le catalogue pour commencer.
          </EmptyState>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
            <div>
              <ul className="divide-y divide-line rounded-[28px] border border-line bg-surface">
                <AnimatePresence initial={false}>
                  {lines.map((l) => {
                    const gone = unavailable.includes(l);
                    return (
                      <motion.li
                        key={l.key}
                        layout
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-4 p-4 sm:gap-5 sm:p-5"
                      >
                        <Link to={`/produit/${l.product.slug}`} className="shrink-0">
                          <ProductImage product={l.product} className="size-24 rounded-2xl sm:size-28" />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link to={`/produit/${l.product.slug}`} className="font-display text-lg leading-snug hover:text-rouille-600">
                                {l.product.name}
                              </Link>
                              <div className="mt-1 text-[13.5px] text-ink-muted">
                                Taille {l.size} · {NIVEAU_LABEL[l.niveau]} · {fcfa(l.product.price)} / pièce
                              </div>
                              {gone && <div className="mt-1 text-[12.5px] font-medium text-rouille-600">Cet article n'est plus disponible.</div>}
                            </div>
                            <div className="shrink-0 font-semibold">{fcfa(l.product.price * l.qty)}</div>
                          </div>
                          <div className="mt-auto flex items-center justify-between pt-3">
                            <QtyStepper value={l.qty} onChange={(q) => setQty(l.key, q)} />
                            <button
                              onClick={() => remove(l.key)}
                              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium text-ink-muted transition hover:bg-rouille-50 hover:text-rouille-600"
                            >
                              <Trash2 className="size-4" />
                              <span className="hidden sm:inline">Retirer</span>
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
              <Link to="/catalogue" className="mt-5 inline-block text-[14px] font-medium text-ink-soft hover:text-ink">
                ← Continuer mes achats
              </Link>
            </div>

            <OrderSummary total={t.total} deposit={t.deposit} balance={t.balance} count={t.count}>
              <Button size="lg" className="mt-6 w-full" onClick={checkout} disabled={unavailable.length > 0} icon={<ArrowRight className="order-last size-4" />}>
                Passer la commande
              </Button>
              {!user && <p className="mt-3 text-center text-[12.5px] text-ink-muted">Vous devrez vous connecter ou créer un compte.</p>}
            </OrderSummary>
          </div>
        )}
      </div>
    </>
  );
}

export function OrderSummary({
  total,
  deposit,
  balance,
  count,
  children,
}: {
  total: number;
  deposit: number;
  balance: number;
  count: number;
  children?: React.ReactNode;
}) {
  return (
    <aside className="h-fit rounded-[28px] bg-brun-900 p-6 text-creme-100 sm:p-7 lg:sticky lg:top-28">
      <h2 className="text-2xl text-creme-50">Récapitulatif</h2>
      <dl className="mt-6 space-y-3 text-[14.5px]">
        <div className="flex justify-between">
          <dt className="text-creme-200/70">
            Sous-total ({count} article{count > 1 ? 's' : ''})
          </dt>
          <dd>{fcfa(total)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-creme-200/70">Livraison</dt>
          <dd className="text-emerald-300">Offerte</dd>
        </div>
        <div className="flex justify-between border-t border-creme-50/10 pt-3 text-lg font-semibold text-creme-50">
          <dt>Total</dt>
          <dd>{fcfa(total)}</dd>
        </div>
      </dl>
      <div className="mt-5 space-y-2 rounded-2xl bg-surface/[0.06] p-4 text-[14px]">
        <div className="flex justify-between font-semibold text-rouille-400">
          <span>À payer maintenant (50 %)</span>
          <span>{fcfa(deposit)}</span>
        </div>
        <div className="flex justify-between text-creme-200/70">
          <span>Solde à la livraison</span>
          <span>{fcfa(balance)}</span>
        </div>
      </div>
      <p className="mt-4 flex gap-2 text-[12.5px] leading-relaxed text-creme-200/60">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Les prix sont confirmés par notre serveur au moment de la commande.
      </p>
      {children}
    </aside>
  );
}
