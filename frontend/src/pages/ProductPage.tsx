import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronRight, Ruler, Share2, ShieldCheck, Smartphone, Truck } from 'lucide-react';
import { useProduct, useProducts } from '../hooks/queries';
import { useAddToCart } from '../hooks/useAddToCart';
import { toast } from '../stores/toast';
import type { Niveau, Product } from '../lib/api/types';
import { fcfa, NIVEAU_LABEL, productKicker } from '../lib/format';
import { cn } from '../lib/cn';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState, Skeleton } from '../components/ui/misc';
import { ProductImage } from '../components/product/ProductImage';
import { QtyStepper, SelectPill } from '../components/product/AddToCartDialog';
import { FavoriteButton } from '../components/product/FavoriteButton';
import { ProductCard } from '../components/product/ProductCard';

export default function ProductPage() {
  const { slug = '' } = useParams();
  const { data: product, isLoading, isError } = useProduct(slug);
  const { data: all } = useProducts();

  if (isLoading) {
    return (
      <div className="container-k grid gap-12 py-12 lg:grid-cols-2">
        <Skeleton className="aspect-[4/5] rounded-[32px]" />
        <div className="space-y-4 pt-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container-k py-20">
        <EmptyState title="Article introuvable" action={<ButtonLink to="/catalogue">Retour au catalogue</ButtonLink>}>
          Cet article n'existe plus ou a été retiré du catalogue.
        </EmptyState>
      </div>
    );
  }

  const related = (all ?? []).filter((p) => p.id !== product.id && p.ensemble === product.ensemble).slice(0, 4);
  // key = id : taille, niveau et quantité repartent à zéro quand on change d'article
  return <ProductDetail key={product.id} product={product} related={related} />;
}

function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const addToCart = useAddToCart();
  const [slide, setSlide] = useState(0);
  const [size, setSize] = useState('');
  const [niveau, setNiveau] = useState<Niveau | ''>(() => (product.niveaux.length === 1 ? product.niveaux[0] : ''));
  const [qty, setQty] = useState(1);
  const [touched, setTouched] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const configRef = useRef<HTMLDivElement>(null);
  const ready = !!size && !!niveau;

  const slides = [
    { key: 'photo', label: 'Photo' },
    ...(product.sketch_url ? [{ key: 'croquis', label: 'Croquis technique' }] : []),
  ];

  // Barre d'achat collante (mobile) : visible quand le bloc de sélection sort de l'écran
  useEffect(() => {
    const el = configRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting), { rootMargin: '0px 0px -80px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const submit = () => {
    setTouched(true);
    if (!ready) {
      // Attend que les messages d'erreur soient affichés avant de remonter jusqu'au sélecteur
      setTimeout(() => {
        const el = configRef.current;
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
      }, 60);
      return;
    }
    addToCart(product, size, niveau as Niveau, qty);
  };

  const share = async () => {
    const data = { title: product.name, text: `${product.name} — Kōlā Collection`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        toast.success('Lien copié');
      }
    } catch {
      /* partage annulé */
    }
  };

  const label = ready ? `Ajouter au panier · ${fcfa(product.price * qty)}` : !size && !niveau ? 'Choisissez taille et niveau' : !size ? 'Choisissez une taille' : 'Choisissez le niveau';

  return (
    <>
      <div className="container-k pt-6">
        <nav className="flex items-center gap-1.5 text-[13px] text-ink-muted" aria-label="Fil d'Ariane">
          <Link to="/" className="hover:text-ink">
            Accueil
          </Link>
          <ChevronRight className="size-3.5" />
          <Link to="/catalogue" className="hover:text-ink">
            Catalogue
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="truncate text-ink">{product.name}</span>
        </nav>
      </div>

      <section className="container-k grid gap-10 py-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-12">
        {/* Galerie : glisser pour passer de la photo au croquis */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative overflow-hidden rounded-[32px] bg-photo">
            <motion.div
              className="flex"
              drag={slides.length > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, i) => {
                if (i.offset.x < -60) setSlide((s) => Math.min(slides.length - 1, s + 1));
                if (i.offset.x > 60) setSlide((s) => Math.max(0, s - 1));
              }}
              animate={{ x: `-${slide * 100}%` }}
              transition={{ type: 'spring', damping: 30, stiffness: 260 }}
            >
              <div className="w-full shrink-0">
                <ProductImage product={product} className="aspect-[4/5]" imgClassName="pointer-events-none" />
              </div>
              {product.sketch_url && (
                <div className="grid aspect-[4/5] w-full shrink-0 place-items-center bg-white p-6">
                  <img src={product.sketch_url} alt={`Croquis technique — ${product.name}`} className="pointer-events-none max-h-full object-contain" draggable={false} />
                </div>
              )}
            </motion.div>
            {product.badge && (
              <span className="absolute top-5 left-5 rounded-full bg-surface/90 px-3 py-1 text-[12px] font-semibold text-ink shadow-sm">{product.badge}</span>
            )}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <FavoriteButton productId={product.id} name={product.name} size="lg" />
              <button onClick={share} className="grid size-12 place-items-center rounded-full bg-surface/90 text-ink shadow-sm backdrop-blur transition hover:scale-105 active:scale-90" aria-label="Partager">
                <Share2 className="size-5" />
              </button>
            </div>
            {slides.length > 1 && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
                {slides.map((s, i) => (
                  <button
                    key={s.key}
                    onClick={() => setSlide(i)}
                    aria-label={s.label}
                    className={cn('h-1.5 rounded-full transition-all duration-300', i === slide ? 'w-8 bg-brun-900' : 'w-3 bg-brun-900/25')}
                  />
                ))}
              </div>
            )}
          </div>
          {slides.length > 1 && (
            <div className="mt-3 flex gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => setSlide(i)}
                  className={cn(
                    'h-10 rounded-full px-4 text-[13px] font-medium transition',
                    i === slide ? 'bg-inverse text-on-inverse' : 'bg-surface-2 text-ink-soft hover:text-ink',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Infos */}
        <div>
          <div className="text-[12px] font-semibold tracking-[0.16em] text-kaki-600 uppercase dark:text-kaki-300">{productKicker(product)}</div>
          <h1 className="mt-2 text-4xl leading-[1.08] sm:text-5xl">{product.name}</h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-semibold text-ink">{fcfa(product.price)}</span>
            <span className="rounded-full bg-rouille-500/10 px-2.5 py-0.5 text-[12.5px] font-medium text-rouille-600 dark:text-rouille-400">
              {fcfa(Math.round(product.price / 2))} à la commande
            </span>
          </div>
          {product.description && <p className="mt-6 text-[15.5px] leading-relaxed text-ink-soft">{product.description}</p>}

          <div ref={configRef} className="mt-8 scroll-mt-28 rounded-[28px] border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="label mb-0">Taille {size && <span className="font-semibold text-ink">· {size}</span>}</span>
              <Link to="/guide-des-tailles" className="flex items-center gap-1.5 text-[13px] font-medium text-rouille-600 hover:underline">
                <Ruler className="size-4" /> Guide des tailles
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <SelectPill key={s} active={size === s} onClick={() => setSize(s)}>
                  {s}
                </SelectPill>
              ))}
            </div>
            <ErrorLine show={touched && !size}>Choisissez une taille.</ErrorLine>

            <div className="label mt-6">Niveau scolaire</div>
            <div className="grid grid-cols-2 gap-2">
              {product.niveaux.map((n) => (
                <SelectPill key={n} active={niveau === n} onClick={() => setNiveau(n)}>
                  {NIVEAU_LABEL[n]}
                </SelectPill>
              ))}
            </div>
            <ErrorLine show={touched && !niveau}>Choisissez le niveau scolaire.</ErrorLine>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <QtyStepper value={qty} onChange={setQty} />
              <Button size="lg" variant={ready ? 'primary' : 'dark'} className="flex-1" onClick={submit}>
                {label}
              </Button>
            </div>
          </div>

          {product.construction.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl">Détails de construction</h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {product.construction.map((c) => (
                  <li key={c} className="flex gap-2.5 text-[14.5px] text-ink-soft">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { Icon: Truck, t: 'Livraison 48–72 h', s: 'Brazzaville & Pointe-Noire' },
              { Icon: Smartphone, t: 'Mobile Money', s: 'Airtel ou MTN' },
              { Icon: ShieldCheck, t: 'Conforme', s: 'Règlement scolaire' },
            ].map(({ Icon, t, s }) => (
              <div key={t} className="group rounded-2xl bg-surface-2/70 p-4">
                <span className="icon-3d grid size-10 place-items-center rounded-xl text-rouille-600">
                  <Icon className="size-5" />
                </span>
                <div className="mt-2 text-[14px] font-semibold text-ink">{t}</div>
                <div className="text-[12.5px] text-ink-muted">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-line py-16">
          <div className="container-k">
            <h2 className="mb-8 text-3xl">Pour compléter l'ensemble</h2>
            {/* Défilement horizontal sur mobile, grille sur ordinateur */}
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {related.map((p, i) => (
                <div key={p.id} className="w-[68%] shrink-0 snap-start sm:w-auto">
                  <ProductCard product={p} index={i} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Barre d'achat collante — mobile */}
      <AnimatePresence>
        {showBar && (
          <motion.div
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-page/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden"
          >
            <div className="flex items-center gap-3">
              <ProductImage product={product} className="size-12 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-ink">{product.name}</div>
                <div className="text-[13px] font-semibold text-ink">
                  {fcfa(product.price)}
                  {size && <span className="font-normal text-ink-muted"> · T. {size}</span>}
                </div>
              </div>
              <Button variant={ready ? 'primary' : 'dark'} onClick={submit} className="h-11 px-5">
                {ready ? 'Ajouter' : 'Choisir'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ErrorLine({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -4, 4, 0] }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-2 text-[12.5px] font-medium text-rouille-600"
          role="alert"
        >
          {children}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
