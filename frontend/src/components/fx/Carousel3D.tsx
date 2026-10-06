import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'motion/react';
import { ChevronLeft, ChevronRight, Hand } from 'lucide-react';
import type { Product } from '../../lib/api/types';
import { fcfa, productKicker } from '../../lib/format';
import { ProductImage } from '../product/ProductImage';

/**
 * Vitrine circulaire en 3D : les articles tournent sur un anneau.
 * Rotation automatique lente, glisser (souris ou doigt) pour faire tourner, flèches au clavier.
 */
export function Carousel3D({ products }: { products: Product[] }) {
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  const rot = useMotionValue(0);
  const dragging = useRef(false);
  const hovering = useRef(false);
  const moved = useRef(0);

  useEffect(() => {
    const on = () => setWidth(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Au moins 6 éléments pour que l'anneau soit plein
  const items = products.length === 0 ? [] : products.length >= 6 ? products : [...products, ...products, ...products].slice(0, Math.max(6, products.length));
  const n = items.length;
  const step = 360 / Math.max(n, 1);
  const cardW = width < 640 ? 170 : 230;
  const radius = Math.round(cardW / 2 / Math.tan(Math.PI / Math.max(n, 3)) + (width < 640 ? 24 : 60));

  // Rotation automatique (pause au survol, pendant le glissement, ou si animations réduites)
  useAnimationFrame((_, delta) => {
    if (reduce || dragging.current || hovering.current) return;
    rot.set(rot.get() - delta * 0.008);
  });

  const snap = (dir: -1 | 1) => {
    const target = Math.round(rot.get() / step) * step + dir * step;
    rot.set(target);
  };

  if (!n) return null;

  return (
    <div
      className="relative select-none"
      onPointerEnter={() => (hovering.current = true)}
      onPointerLeave={() => (hovering.current = false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') snap(1);
        if (e.key === 'ArrowRight') snap(-1);
      }}
      tabIndex={0}
      role="region"
      aria-roledescription="carrousel"
      aria-label="Vitrine 3D des articles"
    >
      <motion.div
        className="relative mx-auto flex h-[340px] cursor-grab touch-pan-y items-center justify-center [perspective:1100px] active:cursor-grabbing sm:h-[440px]"
        onPanStart={() => {
          dragging.current = true;
          moved.current = 0;
        }}
        onPan={(_, info) => {
          moved.current += Math.abs(info.delta.x);
          rot.set(rot.get() + info.delta.x * 0.35);
        }}
        onPanEnd={() => {
          setTimeout(() => (dragging.current = false), 600);
        }}
      >
        <motion.div className="relative" style={{ width: cardW, height: cardW * 1.3, transformStyle: 'preserve-3d', rotateY: rot, z: -radius }}>
          {items.map((p, i) => (
            <RingItem key={`${p.id}-${i}`} product={p} angle={i * step} radius={radius} rot={rot} width={cardW} moved={moved} />
          ))}
        </motion.div>
      </motion.div>

      {/* Sol réfléchissant */}
      <div aria-hidden className="pointer-events-none absolute inset-x-[10%] bottom-2 h-16 rounded-[50%] bg-gradient-to-b from-brun-900/20 to-transparent blur-2xl dark:from-black/60" />

      <div className="mt-2 flex items-center justify-center gap-3">
        <button onClick={() => snap(1)} className="btn-3d-light grid size-11 place-items-center rounded-full" aria-label="Article précédent">
          <ChevronLeft className="size-5" />
        </button>
        <span className="flex items-center gap-1.5 text-[12.5px] text-ink-muted">
          <Hand className="size-4" /> Glissez pour faire tourner
        </span>
        <button onClick={() => snap(-1)} className="btn-3d-light grid size-11 place-items-center rounded-full" aria-label="Article suivant">
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}

function RingItem({
  product,
  angle,
  radius,
  rot,
  width,
  moved,
}: {
  product: Product;
  angle: number;
  radius: number;
  rot: MotionValue<number>;
  width: number;
  moved: React.RefObject<number>;
}) {
  // 1 = face à nous, 0 = à l'arrière de l'anneau
  const facing = useTransform(rot, (r) => {
    const a = (((angle + r) % 360) + 360) % 360;
    const d = Math.min(a, 360 - a) / 180;
    return 1 - d;
  });
  const opacity = useTransform(facing, [0, 0.5, 1], [0.25, 0.6, 1]);
  const brightness = useTransform(facing, (f) => `brightness(${0.55 + f * 0.45})`);

  return (
    <motion.div
      className="absolute inset-0"
      style={{ transform: `rotateY(${angle}deg) translateZ(${radius}px)`, opacity, filter: brightness, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
    >
      <Link
        to={`/produit/${product.slug}`}
        draggable={false}
        onClick={(e) => {
          if ((moved.current ?? 0) > 8) e.preventDefault(); // un glissement n'est pas un clic
        }}
        className="sm:mirror group flex h-full flex-col overflow-hidden rounded-[22px] border border-white/40 bg-surface shadow-[0_30px_60px_-30px_rgba(28,20,13,0.55)]"
        style={{ width }}
      >
        <ProductImage product={product} className="min-h-0 flex-1" imgClassName="pointer-events-none" />
        <div className="p-3">
          <div className="text-[10px] font-semibold tracking-[0.14em] text-kaki-600 uppercase dark:text-kaki-300">{productKicker(product)}</div>
          <div className="truncate font-display text-[15px] text-ink">{product.name}</div>
          <div className="text-[13px] font-semibold text-rouille-600">{fcfa(product.price)}</div>
        </div>
      </Link>
    </motion.div>
  );
}
