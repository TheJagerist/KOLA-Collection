import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CornerDownLeft, Ruler, Search, Shirt, Truck, X } from 'lucide-react';
import { useProducts } from '../../hooks/queries';
import { useUi } from '../../stores/ui';
import { fcfa, productKicker } from '../../lib/format';
import { cn } from '../../lib/cn';
import { ProductImage } from '../product/ProductImage';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const QUICK = [
  { label: 'Ensemble garçon', to: '/catalogue?ensemble=garcon', Icon: Shirt },
  { label: 'Ensemble fille', to: '/catalogue?ensemble=fille', Icon: Shirt },
  { label: 'Guide des tailles', to: '/guide-des-tailles', Icon: Ruler },
  { label: 'Suivre ma commande', to: '/compte', Icon: Truck },
];
const SUGGESTIONS = ['chemise', 'pantalon', 'jupe', 'kaki', 'bleu nuit'];

export function SearchPalette() {
  const open = useUi((s) => s.searchOpen);
  const setOpen = useUi((s) => s.setSearch);

  // Raccourcis : Ctrl/⌘ + K, ou « / » hors d'un champ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable]');
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setOpen(!useUi.getState().searchOpen);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);

  return createPortal(
    <AnimatePresence>{open && <Palette onClose={() => setOpen(false)} />}</AnimatePresence>,
    document.body,
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data: products = [] } = useProducts();

  const results = useMemo(() => {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return products.filter((p) => {
      const hay = norm(`${p.name} ${p.cat} ${p.ensemble === 'garcon' ? 'garcon kaki' : 'fille bleu ciel nuit'} ${p.description ?? ''}`);
      return terms.every((t) => hay.includes(t));
    });
  }, [q, products]);

  const items = q ? results.map((p) => ({ key: `p${p.id}`, to: `/produit/${p.slug}` })) : QUICK.map((l) => ({ key: l.to, to: l.to }));

  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      if (items[active]) go(items[active].to);
      else if (q) go(`/catalogue`);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-3 pt-[8vh] sm:p-6 sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label="Recherche">
      <motion.div className="absolute inset-0 bg-brun-950/50 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ type: 'spring', damping: 30, stiffness: 380 }}
        className="glass relative w-full max-w-xl overflow-hidden rounded-3xl border"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search className="size-5 shrink-0 text-ink-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="Chemise kaki, jupe, taille 12…"
            className="h-16 w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-muted"
            role="combobox"
            aria-expanded
            aria-controls="search-results"
          />
          <button onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-2" aria-label="Fermer">
            <X className="size-4" />
          </button>
        </div>

        <div id="search-results" role="listbox" className="max-h-[60dvh] overflow-y-auto p-2">
          {!q && (
            <>
              <div className="px-3 pt-2 pb-2 text-[11px] font-semibold tracking-[0.16em] text-ink-muted uppercase">Recherches fréquentes</div>
              <div className="flex flex-wrap gap-2 px-3 pb-3">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setQ(s)} className="h-8 rounded-full bg-surface-2 px-3 text-[13px] font-medium text-ink-soft transition hover:text-ink">
                    {s}
                  </button>
                ))}
              </div>
              <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-[0.16em] text-ink-muted uppercase">Accès rapide</div>
              {QUICK.map(({ label, to, Icon }, i) => (
                <Row key={to} active={active === i} onHover={() => setActive(i)} onClick={() => go(to)}>
                  <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-rouille-600">
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="flex-1 font-medium text-ink">{label}</span>
                  <ArrowRight className="size-4 text-ink-muted" />
                </Row>
              ))}
            </>
          )}

          {q && results.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="font-display text-lg text-ink">Aucun résultat pour « {q} »</p>
              <button onClick={() => go('/catalogue')} className="mt-2 text-[14px] font-medium text-rouille-600 hover:underline">
                Parcourir tout le catalogue
              </button>
            </div>
          )}

          {results.map((p, i) => (
            <Row key={p.id} active={active === i} onHover={() => setActive(i)} onClick={() => go(`/produit/${p.slug}`)}>
              <ProductImage product={p} className="size-14 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{p.name}</span>
                <span className="text-[12.5px] text-ink-muted">{productKicker(p)}</span>
              </span>
              <span className="text-[14px] font-semibold text-ink">{fcfa(p.price)}</span>
            </Row>
          ))}
        </div>

        <div className="hidden items-center gap-4 border-t border-line px-5 py-3 text-[12px] text-ink-muted sm:flex">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> naviguer
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>
              <CornerDownLeft className="size-3" />
            </Kbd>{' '}
            ouvrir
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Échap</Kbd> fermer
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ active, onHover, onClick, children }: { active: boolean; onHover: () => void; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="option"
      aria-selected={active}
      onMouseMove={onHover}
      onClick={onClick}
      className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition', active ? 'bg-surface-2' : 'hover:bg-surface-2/60')}
    >
      {children}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-grid h-5 min-w-5 place-items-center rounded-md border border-line bg-page px-1 font-sans text-[11px] text-ink-soft">{children}</kbd>;
}
