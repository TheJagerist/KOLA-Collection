import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import type { Product } from '../../lib/api/types';
import { fcfa, productKicker, sizeRange } from '../../lib/format';
import { useUi } from '../../stores/ui';
import { ProductImage } from './ProductImage';
import { FavoriteButton } from './FavoriteButton';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const openQuickView = useUi((s) => s.openQuickView);
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex flex-col"
    >
      <div className="relative overflow-hidden rounded-3xl transition duration-500 ease-out-soft group-hover:-translate-y-1 group-hover:shadow-[0_24px_50px_-28px_rgba(61,46,31,0.55)]">
        <Link to={`/produit/${product.slug}`} className="block" aria-label={product.name}>
          <ProductImage product={product} className="aspect-[4/5]" imgClassName="transition duration-700 ease-out-soft group-hover:scale-[1.05]" />
          {product.sketch_url && (
            <img
              src={product.sketch_url}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full bg-white object-contain p-4 opacity-0 transition duration-500 group-hover:opacity-100 max-sm:hidden"
            />
          )}
        </Link>
        {product.badge && (
          <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-surface/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-ink shadow-sm backdrop-blur">
            {product.badge}
          </span>
        )}
        <FavoriteButton productId={product.id} name={product.name} className="absolute top-3 right-3" />
        <button
          onClick={() => openQuickView(product)}
          className="absolute right-3 bottom-3 flex h-11 items-center gap-1.5 rounded-full bg-inverse pr-4 pl-3 text-[13px] font-semibold text-on-inverse shadow-lg transition duration-300 hover:bg-rouille-500 hover:text-white active:scale-95 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0 sm:focus-visible:opacity-100"
          aria-label={`Ajouter ${product.name} au panier`}
        >
          <Plus className="size-4" />
          <span className="max-sm:hidden">Ajout rapide</span>
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-1 px-1 sm:mt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-kaki-600 uppercase dark:text-kaki-300">{productKicker(product)}</div>
          <Link to={`/produit/${product.slug}`} className="mt-1 block font-display text-[17px] leading-snug text-ink transition hover:text-rouille-600 sm:text-[19px]">
            {product.name}
          </Link>
          <div className="mt-1 text-[13px] text-ink-muted">{sizeRange(product.sizes)}</div>
        </div>
        <div className="shrink-0 text-[14.5px] font-semibold text-ink sm:pt-4 sm:text-[15px]">{fcfa(product.price)}</div>
      </div>
    </motion.article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-surface-2">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/5" />
      </div>
      <div className="mt-4 space-y-2 px-1">
        <div className="h-3 w-20 rounded bg-surface-2" />
        <div className="h-5 w-3/4 rounded bg-surface-2" />
      </div>
    </div>
  );
}
