import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { SlidersHorizontal, X, PackageSearch } from 'lucide-react';
import { useProducts } from '../hooks/queries';
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard';
import { Chip, EmptyState, PageHeader } from '../components/ui/misc';
import { Button } from '../components/ui/Button';
import type { Category, Ensemble, Niveau, ProductSort } from '../lib/api/types';
import { cn } from '../lib/cn';

const ENSEMBLES: { v: Ensemble; label: string; dots: string[] }[] = [
  { v: 'garcon', label: 'Garçon · kaki', dots: ['bg-kaki-300'] },
  { v: 'fille', label: 'Fille · bleu ciel & bleu nuit', dots: ['bg-ciel-300', 'bg-nuit-800'] },
];
const CATS: { v: Category; label: string }[] = [
  { v: 'chemise', label: 'Chemises' },
  { v: 'pantalon', label: 'Pantalons' },
  { v: 'jupe', label: 'Jupes' },
];
const NIVEAUX: { v: Niveau; label: string }[] = [
  { v: 'college', label: 'Collège' },
  { v: 'lycee', label: 'Lycée' },
];
const SORTS: { v: ProductSort; label: string }[] = [
  { v: 'populaires', label: 'Populaires' },
  { v: 'prix', label: 'Prix croissant' },
  { v: 'nouveautes', label: 'Nouveautés' },
];

export default function Catalogue() {
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState(false);

  const filters = useMemo(
    () => ({
      ensemble: params.getAll('ensemble') as Ensemble[],
      cat: params.getAll('cat') as Category[],
      niveau: params.getAll('niveau') as Niveau[],
      sort: (params.get('sort') as ProductSort) || 'populaires',
    }),
    [params],
  );
  const { data, isLoading } = useProducts(filters);
  const activeCount = filters.ensemble.length + filters.cat.length + filters.niveau.length;

  const toggle = (key: 'ensemble' | 'cat' | 'niveau', value: string) => {
    const next = new URLSearchParams(params);
    const values = next.getAll(key);
    next.delete(key);
    (values.includes(value) ? values.filter((v) => v !== value) : [...values, value]).forEach((v) => next.append(key, v));
    setParams(next, { replace: true });
  };
  const setSort = (s: ProductSort) => {
    const next = new URLSearchParams(params);
    if (s === 'populaires') next.delete('sort');
    else next.set('sort', s);
    setParams(next, { replace: true });
  };
  const reset = () => {
    const next = new URLSearchParams();
    if (params.get('sort')) next.set('sort', params.get('sort')!);
    setParams(next, { replace: true });
  };

  const filterPanel = (
    <div className="space-y-8">
      <FilterGroup title="Ensemble">
        {ENSEMBLES.map((e) => (
          <Check key={e.v} checked={filters.ensemble.includes(e.v)} onChange={() => toggle('ensemble', e.v)}>
            <span className="flex -space-x-1">
              {e.dots.map((d) => (
                <span key={d} className={cn('size-3.5 rounded-full ring-2 ring-surface', d)} />
              ))}
            </span>
            {e.label}
          </Check>
        ))}
      </FilterGroup>
      <FilterGroup title="Catégorie">
        {CATS.map((c) => (
          <Check key={c.v} checked={filters.cat.includes(c.v)} onChange={() => toggle('cat', c.v)}>
            {c.label}
          </Check>
        ))}
      </FilterGroup>
      <FilterGroup title="Niveau">
        {NIVEAUX.map((n) => (
          <Check key={n.v} checked={filters.niveau.includes(n.v)} onChange={() => toggle('niveau', n.v)}>
            {n.label}
          </Check>
        ))}
      </FilterGroup>
      {activeCount > 0 && (
        <button onClick={reset} className="text-[13px] font-semibold text-rouille-600 underline-offset-4 hover:underline">
          Effacer les filtres ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <>
      <PageHeader kicker="Catalogue" title="Tout l'uniforme, par taille et par ensemble">
        Chaque article existe du 10 ans au S/M. Filtrez par ensemble, catégorie ou niveau scolaire.
      </PageHeader>

      <div className="container-k grid gap-10 py-10 lg:grid-cols-[240px_1fr] lg:py-14">
        <aside className="hidden lg:block">
          <div className="sticky top-28">{filterPanel}</div>
        </aside>

        <div>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setSheet(true)} icon={<SlidersHorizontal className="size-4" />}>
                Filtres{activeCount ? ` (${activeCount})` : ''}
              </Button>
              <span className="text-[14px] text-ink-muted">
                {isLoading ? 'Chargement…' : `${data?.length ?? 0} article${(data?.length ?? 0) > 1 ? 's' : ''}`}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {SORTS.map((s) => (
                <Chip key={s.v} active={filters.sort === s.v} onClick={() => setSort(s.v)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 xl:grid-cols-3">
              {data.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<PackageSearch className="size-6" />}
              title="Aucun article ne correspond"
              action={
                <Button variant="outline" onClick={reset}>
                  Effacer les filtres
                </Button>
              }
            >
              Essayez d'élargir vos filtres.
            </EmptyState>
          )}
        </div>
      </div>

      <AnimatePresence>
        {sheet && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-brun-950/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-surface p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-2xl">Filtres</h3>
                <button onClick={() => setSheet(false)} className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label="Fermer">
                  <X className="size-5" />
                </button>
              </div>
              {filterPanel}
              <Button className="mt-8 w-full" onClick={() => setSheet(false)}>
                Voir {data?.length ?? 0} article{(data?.length ?? 0) > 1 ? 's' : ''}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h5 className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-ink-muted uppercase">{title}</h5>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-[14.5px] text-ink transition hover:bg-surface-2/60">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-[18px] rounded accent-[var(--inverse)]" />
      <span className="flex items-center gap-2">{children}</span>
    </label>
  );
}
