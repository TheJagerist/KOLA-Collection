import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Minus, Plus, Ruler } from 'lucide-react';
import type { Niveau, Product } from '../../lib/api/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useUi } from '../../stores/ui';
import { useAddToCart } from '../../hooks/useAddToCart';
import { fcfa, NIVEAU_LABEL, productKicker } from '../../lib/format';
import { cn } from '../../lib/cn';
import { ProductImage } from './ProductImage';
import { FavoriteButton } from './FavoriteButton';

/** Aperçu rapide global (ouvert depuis le « + » d'une carte produit) */
export function QuickView() {
  const product = useUi((s) => s.quickView);
  const close = useUi((s) => s.closeQuickView);
  return (
    <Modal open={!!product} onClose={close} className="sm:max-w-3xl sm:p-0">
      {product && <QuickViewBody key={product.id} product={product} onClose={close} />}
    </Modal>
  );
}

function QuickViewBody({ product, onClose }: { product: Product; onClose: () => void }) {
  const addToCart = useAddToCart();
  const [size, setSize] = useState('');
  const [niveau, setNiveau] = useState<Niveau | ''>(product.niveaux.length === 1 ? product.niveaux[0] : '');
  const [qty, setQty] = useState(1);
  const [touched, setTouched] = useState(false);
  const ready = !!size && !!niveau;

  const submit = () => {
    setTouched(true);
    if (ready) addToCart(product, size, niveau as Niveau, qty);
  };

  return (
    <div className="grid sm:grid-cols-[0.95fr_1.05fr]">
      <div className="relative hidden sm:block">
        <ProductImage product={product} className="h-full min-h-[480px] rounded-l-3xl" />
        <FavoriteButton productId={product.id} name={product.name} className="absolute top-4 left-4" />
      </div>
      <div className="flex flex-col sm:p-8">
        <div className="mb-5 flex items-center gap-4 sm:hidden">
          <ProductImage product={product} className="size-20 shrink-0 rounded-2xl" />
          <div>
            <div className="text-[11px] font-semibold tracking-[0.14em] text-kaki-600 uppercase">{productKicker(product)}</div>
            <h3 className="text-xl leading-tight">{product.name}</h3>
            <div className="font-semibold text-rouille-600">{fcfa(product.price)}</div>
          </div>
        </div>
        <div className="hidden sm:block">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-kaki-600 uppercase">{productKicker(product)}</div>
          <h3 className="mt-1 pr-8 text-3xl leading-tight">{product.name}</h3>
          <div className="mt-2 text-xl font-semibold text-ink">{fcfa(product.price)}</div>
          {product.description && <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-ink-soft">{product.description}</p>}
        </div>

        <fieldset className="mt-6">
          <div className="flex items-center justify-between">
            <legend className="label mb-0">Taille</legend>
            <Link to="/guide-des-tailles" onClick={onClose} className="flex items-center gap-1 text-[12.5px] font-medium text-rouille-600 hover:underline">
              <Ruler className="size-3.5" /> Guide
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <SelectPill key={s} active={size === s} onClick={() => setSize(s)}>
                {s}
              </SelectPill>
            ))}
          </div>
          {touched && !size && <p className="mt-1.5 text-[12.5px] font-medium text-rouille-600">Choisissez une taille.</p>}
        </fieldset>

        <fieldset className="mt-5">
          <legend className="label">Niveau scolaire</legend>
          <div className="grid grid-cols-2 gap-2">
            {product.niveaux.map((n) => (
              <SelectPill key={n} active={niveau === n} onClick={() => setNiveau(n)}>
                {NIVEAU_LABEL[n]}
              </SelectPill>
            ))}
          </div>
          {touched && !niveau && <p className="mt-1.5 text-[12.5px] font-medium text-rouille-600">Choisissez le niveau scolaire.</p>}
        </fieldset>

        <div className="mt-6 flex items-center gap-3">
          <QtyStepper value={qty} onChange={setQty} />
          <Button className="h-12 flex-1" variant={ready ? 'primary' : 'dark'} onClick={submit}>
            {ready ? `Ajouter · ${fcfa(product.price * qty)}` : 'Choisissez taille et niveau'}
          </Button>
        </div>
        <Link
          to={`/produit/${product.slug}`}
          onClick={onClose}
          className="mt-5 inline-flex items-center justify-center gap-1.5 text-[13.5px] font-medium text-ink-soft hover:text-ink sm:mt-auto sm:pt-6"
        >
          Voir la fiche complète <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

export function SelectPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-11 min-w-12 rounded-xl border px-3 text-sm font-semibold transition active:scale-95',
        active ? 'border-inverse bg-inverse text-on-inverse shadow-sm' : 'border-line bg-surface text-ink hover:border-ink-muted',
      )}
    >
      {children}
    </button>
  );
}

export function QtyStepper({ value, onChange, min = 1, max = 20 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="inline-flex h-11 items-center rounded-full border border-line bg-surface">
      <button type="button" className="grid size-11 place-items-center rounded-full text-ink-soft transition hover:bg-surface-2 active:scale-90 disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Diminuer">
        <Minus className="size-4" />
      </button>
      <span className="w-7 text-center text-sm font-semibold text-ink tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className="grid size-11 place-items-center rounded-full text-ink-soft transition hover:bg-surface-2 active:scale-90 disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Augmenter">
        <Plus className="size-4" />
      </button>
    </div>
  );
}
