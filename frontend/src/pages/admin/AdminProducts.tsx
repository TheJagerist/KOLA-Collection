import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, Boxes, ImagePlus, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { api, ApiError, type Category, type Ensemble, type Niveau, type Product, type ProductInput } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { CATEGORY_LABEL, ENSEMBLE_LABEL, fcfa, NIVEAU_LABEL } from '../../lib/format';
import { cn } from '../../lib/cn';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Chip, EmptyState, Skeleton } from '../../components/ui/misc';
import { CellStack, Table, TableCard, Td, Th, THead, Tr, useSort } from '../../components/admin/DataTable';
import { ProductImage } from '../../components/product/ProductImage';

export default function AdminProducts() {
  const { data, isLoading } = useQuery({ queryKey: qk.admin.products, queryFn: api.admin.listProducts });
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [stockOf, setStockOf] = useState<Product | null>(null);

  const del = useAdminMutation((id: number) => api.admin.deleteProduct(id), {
    success: (r) => (r.archived ? 'Article déjà commandé : archivé (historique conservé)' : 'Article supprimé'),
    invalidate: [qk.admin.products],
  });
  const restore = useAdminMutation((id: number) => api.admin.restoreProduct(id), { success: 'Article réactivé', invalidate: [qk.admin.products] });

  const [view, setView] = useState<'actifs' | 'archives'>('actifs');
  const [q, setQ] = useState('');
  const [ens, setEns] = useState<Ensemble | 'tous'>('tous');
  const active = (data ?? []).filter((p) => !p.is_archived);
  const archived = (data ?? []).filter((p) => p.is_archived);
  const base = view === 'actifs' ? active : archived;
  const list = base.filter((p) => (ens === 'tous' || p.ensemble === ens) && (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase())));
  const { sorted, by } = useSort(list, { key: 'name', dir: 'asc' }, { name: (p) => p.name, price: (p) => p.price, cat: (p) => CATEGORY_LABEL[p.cat] });

  const actions = (p: Product, compact?: boolean) =>
    p.is_archived ? (
      <Button size="sm" variant="outline" icon={<RotateCcw className="size-3.5" />} loading={restore.isPending && restore.variables === p.id} onClick={() => restore.mutate(p.id)}>
        Réactiver
      </Button>
    ) : (
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => setStockOf(p)}
          className="grid size-9 place-items-center rounded-lg border border-line text-ink-soft transition hover:border-ink/25 hover:text-ink"
          aria-label={`Stock de ${p.name}`}
          title="Gérer le stock"
        >
          <Boxes className="size-4" />
        </button>
        <button onClick={() => setEditing(p)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] font-semibold text-ink transition hover:border-ink/25">
          <Pencil className="size-3.5" /> {compact ? '' : 'Modifier'}
        </button>
        <button
          onClick={() => setToDelete(p)}
          className="grid size-9 place-items-center rounded-lg border border-line text-rouille-600 transition hover:border-rouille-500/40 hover:bg-rouille-50 dark:hover:bg-rouille-500/10"
          aria-label={`Retirer ${p.name}`}
          title="Retirer"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="inline-flex gap-1 border-b border-line">
          {(
            [
              ['actifs', 'En ligne', active.length],
              ['archives', 'Archivés', archived.length],
            ] as const
          ).map(([id, label, n]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                '-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-[13.5px] font-medium transition',
                view === id ? 'border-rouille-500 text-ink' : 'border-transparent text-ink-muted hover:text-ink',
              )}
            >
              {label}
              <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums', view === id ? 'bg-inverse text-on-inverse' : 'bg-surface-2 text-ink-muted')}>{n}</span>
            </button>
          ))}
        </div>
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
          Nouvel article
        </Button>
      </div>

      <TableCard
        toolbar={
          <>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
              <input className="field h-10 py-0 pl-9" placeholder="Rechercher un article…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un article" />
            </div>
            <div className="flex gap-1.5">
              {(['tous', 'garcon', 'fille'] as const).map((e) => (
                <Chip key={e} active={ens === e} onClick={() => setEns(e)} className="h-10">
                  {e === 'tous' ? 'Tous' : ENSEMBLE_LABEL[e]}
                </Chip>
              ))}
            </div>
            <span className="ml-auto text-[13px] text-ink-muted max-sm:hidden">
              {view === 'actifs' ? 'Visibles sur le site' : 'Masqués du site — historique conservé'}
            </span>
          </>
        }
      >
        {isLoading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-5">
            <EmptyState title={view === 'actifs' ? 'Aucun article' : 'Aucun article archivé'} action={view === 'actifs' ? <Button onClick={() => setEditing('new')}>Ajouter un article</Button> : undefined}>
              {q || ens !== 'tous' ? 'Aucun résultat pour ce filtre.' : view === 'actifs' ? 'Cette collection est encore vide.' : 'Les articles retirés après une commande apparaissent ici.'}
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="max-lg:hidden">
              <Table>
                <THead>
                  <Th sort={by('name')}>Article</Th>
                  <Th sort={by('cat')}>Type</Th>
                  <Th>Tailles · stock</Th>
                  <Th>Niveaux</Th>
                  <Th align="right" sort={by('price')}>
                    Prix
                  </Th>
                  <Th align="right">Actions</Th>
                </THead>
                <tbody>
                  {sorted.map((p) => (
                    <Tr key={p.id} className={cn(p.is_archived && 'opacity-70')}>
                      <Td className="max-w-[320px]">
                        <div className="flex items-center gap-3">
                          <ProductImage product={p} className="size-12 shrink-0 rounded-xl" />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-ink">{p.name}</div>
                            {p.badge && <span className="mt-1 inline-block rounded-md bg-rouille-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-rouille-600 dark:bg-rouille-500/15">{p.badge}</span>}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className={cn('size-2.5 rounded-full', p.ensemble === 'garcon' ? 'bg-kaki-400' : 'bg-ciel-400')} />
                          <CellStack title={CATEGORY_LABEL[p.cat]} sub={ENSEMBLE_LABEL[p.ensemble]} />
                        </div>
                      </Td>
                      <Td>
                        <StockChips product={p} />
                      </Td>
                      <Td className="text-ink-soft">{p.niveaux.map((n) => NIVEAU_LABEL[n]).join(', ')}</Td>
                      <Td align="right" className="font-semibold text-ink tabular-nums">
                        {fcfa(p.price)}
                      </Td>
                      <Td align="right">{actions(p)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <ul className="divide-y divide-line/70 lg:hidden">
              {sorted.map((p) => (
                <li key={p.id} className={cn('flex items-center gap-3 px-4 py-3', p.is_archived && 'opacity-70')}>
                  <ProductImage product={p} className="size-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink">{p.name}</div>
                    <div className="truncate text-[12px] text-ink-muted">
                      {ENSEMBLE_LABEL[p.ensemble]} · {CATEGORY_LABEL[p.cat]}
                    </div>
                    <StockChips product={p} className="mt-1" />
                    <div className="mt-0.5 text-[13.5px] font-semibold text-rouille-600">{fcfa(p.price)}</div>
                  </div>
                  {actions(p, true)}
                </li>
              ))}
            </ul>
          </>
        )}
      </TableCard>

      <ProductFormModal product={editing} onClose={() => setEditing(null)} />
      <StockModal product={stockOf} onClose={() => setStockOf(null)} />

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} eyebrow="Catalogue" title="Retirer cet article ?">
        <p className="text-[15px] text-ink-soft">
          « {toDelete?.name} » sera supprimé. S'il a déjà été commandé, il sera simplement archivé.
        </p>
        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => setToDelete(null)}>
            Annuler
          </Button>
          <Button loading={del.isPending} icon={<Archive className="size-4" />} onClick={() => toDelete && del.mutate(toDelete.id, { onSettled: () => setToDelete(null) })}>
            Retirer
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const ALL_SIZES = ['10', '12', '14', '16', 'S', 'M', 'L'];

function ProductFormModal({ product, onClose }: { product: Product | 'new' | null; onClose: () => void }) {
  const isNew = product === 'new';
  const current = product && product !== 'new' ? product : null;

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [ensemble, setEnsemble] = useState<Ensemble>('garcon');
  const [cat, setCat] = useState<Category>('chemise');
  const [sizes, setSizes] = useState<string[]>(['10', '12', '14', '16', 'S', 'M']);
  const [niveaux, setNiveaux] = useState<Niveau[]>(['college', 'lycee']);
  const [description, setDescription] = useState('');
  const [construction, setConstruction] = useState('');
  const [badge, setBadge] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [sketch, setSketch] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!product) return;
    setName(current?.name ?? '');
    setPrice(current ? String(current.price) : '');
    setEnsemble(current?.ensemble ?? 'garcon');
    setCat(current?.cat ?? 'chemise');
    setSizes(current?.sizes ?? ['10', '12', '14', '16', 'S', 'M']);
    setNiveaux(current?.niveaux ?? ['college', 'lycee']);
    setDescription(current?.description ?? '');
    setConstruction((current?.construction ?? []).join('\n'));
    setBadge(current?.badge ?? '');
    setImage(null);
    setSketch(null);
    setErrors({});
  }, [product, current]);

  const save = useAdminMutation(
    (input: ProductInput) => (current ? api.admin.updateProduct(current.id, input) : api.admin.createProduct(input)),
    { success: current ? 'Article mis à jour' : 'Article ajouté au catalogue', invalidate: [qk.admin.products] },
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nom obligatoire.';
    if (!(Number(price) > 0)) errs.price = 'Prix invalide.';
    if (!sizes.length) errs.sizes = 'Au moins une taille.';
    if (!niveaux.length) errs.niveaux = 'Au moins un niveau.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    save.mutate(
      {
        name: name.trim(),
        price: Math.round(Number(price)),
        ensemble,
        cat,
        sizes: ALL_SIZES.filter((s) => sizes.includes(s)),
        niveaux,
        description: description.trim(),
        construction: construction.split('\n').map((l) => l.trim()).filter(Boolean),
        badge: badge.trim() || null,
        image,
        sketch,
      },
      {
        onSuccess: onClose,
        onError: (err) => err instanceof ApiError && setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]]))),
      },
    );
  };

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <Modal open={!!product} onClose={onClose} eyebrow="Catalogue" title={isNew ? 'Nouvel article' : `Modifier « ${current?.name} »`} className="sm:max-w-2xl">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Input label="Nom" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="Ex. Chemise kaki" />
          <Input label="Prix (FCFA)" type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} error={errors.price} placeholder="5000" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Ensemble" value={ensemble} onChange={(e) => setEnsemble(e.target.value as Ensemble)}>
            <option value="garcon">Garçon</option>
            <option value="fille">Fille</option>
          </Select>
          <Select label="Catégorie" value={cat} onChange={(e) => setCat(e.target.value as Category)}>
            <option value="chemise">Chemise</option>
            <option value="pantalon">Pantalon</option>
            <option value="jupe">Jupe</option>
          </Select>
          <Input label="Badge (optionnel)" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Nouveau, Best-seller…" />
        </div>

        <div>
          <span className="label">Tailles</span>
          <div className="flex flex-wrap gap-2">
            {ALL_SIZES.map((s) => (
              <ToggleChip key={s} active={sizes.includes(s)} onClick={() => setSizes(toggle(sizes, s))}>
                {s}
              </ToggleChip>
            ))}
          </div>
          {errors.sizes && <p className="mt-1.5 text-[12.5px] font-medium text-rouille-600">{errors.sizes}</p>}
        </div>
        <div>
          <span className="label">Niveaux</span>
          <div className="flex gap-2">
            {(['college', 'lycee'] as Niveau[]).map((n) => (
              <ToggleChip key={n} active={niveaux.includes(n)} onClick={() => setNiveaux(toggle(niveaux, n))}>
                {NIVEAU_LABEL[n]}
              </ToggleChip>
            ))}
          </div>
          {errors.niveaux && <p className="mt-1.5 text-[12.5px] font-medium text-rouille-600">{errors.niveaux}</p>}
        </div>

        <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Textarea label="Détails de construction" hint="Un détail par ligne." rows={4} value={construction} onChange={(e) => setConstruction(e.target.value)} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FilePick label="Photo de l'article" file={image} current={current?.image_url} onChange={setImage} />
          <FilePick label="Croquis technique" file={sketch} current={current?.sketch_url} onChange={setSketch} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={save.isPending}>
            {isNew ? 'Ajouter au catalogue' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-10 min-w-12 rounded-xl border px-3 text-[13.5px] font-semibold transition',
        active ? 'border-inverse bg-inverse text-on-inverse' : 'border-line bg-surface text-ink-soft hover:border-ink-muted',
      )}
    >
      {children}
    </button>
  );
}

function FilePick({ label, file, current, onChange }: { label: string; file: File | null; current?: string | null; onChange: (f: File | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const src = preview ?? current ?? null;
  return (
    <div>
      <span className="label">{label}</span>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line bg-surface p-3 transition hover:border-ink-muted">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-page">
          {src ? <img src={src} alt="" className="size-full object-contain" /> : <ImagePlus className="size-5 text-ink-muted" />}
        </span>
        <span className="min-w-0 text-[13px] text-ink-soft">
          <span className="block truncate font-medium">{file ? file.name : current ? 'Remplacer l’image' : 'Choisir une image'}</span>
          <span className="text-ink-muted">JPG, PNG ou WebP · 10 Mo max</span>
        </span>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ STOCK PAR TAILLE */
const LOW = 3;

function StockChips({ product: p, className }: { product: Product; className?: string }) {
  return (
    <div className={cn('flex max-w-[260px] flex-wrap gap-1', className)}>
      {p.sizes.map((sz) => {
        const n = p.stock ? (p.stock[sz] ?? 0) : null;
        return (
          <span
            key={sz}
            title={n === null ? 'Stock non suivi' : `${n} en stock`}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11.5px] font-medium',
              n === null ? 'border-line text-ink-soft' : n === 0 ? 'border-rouille-500/40 bg-rouille-50 text-rouille-600 line-through decoration-1 dark:bg-rouille-500/10' : n <= LOW ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300' : 'border-line text-ink-soft',
            )}
          >
            {sz}
            {n !== null && <span className="font-semibold tabular-nums no-underline opacity-80">{n}</span>}
          </span>
        );
      })}
    </div>
  );
}

function StockModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  return (
    <Modal open={!!product} onClose={onClose} eyebrow="Stock" title={product?.name}>
      {product && <StockForm key={product.id} product={product} onDone={onClose} />}
    </Modal>
  );
}

function StockForm({ product: p, onDone }: { product: Product; onDone: () => void }) {
  const [tracked, setTracked] = useState(p.stock != null);
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(p.sizes.map((s) => [s, p.stock?.[s] ?? 0])));
  const save = useAdminMutation(() => api.admin.setStock(p.id, tracked ? qty : null), {
    success: 'Stock mis à jour',
    invalidate: [qk.admin.products, qk.admin.lowStock],
  });
  const total = Object.values(qty).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-3.5">
        <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-rouille-500)]" checked={tracked} onChange={(e) => setTracked(e.target.checked)} />
        <span>
          <span className="block text-[14px] font-semibold text-ink">Suivre le stock de cet article</span>
          <span className="block text-[12.5px] text-ink-muted">
            Les tailles à 0 ne peuvent plus être commandées sur le site. Le stock baisse à chaque commande et remonte si elle est annulée.
          </span>
        </span>
      </label>

      <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3', !tracked && 'pointer-events-none opacity-40')}>
        {p.sizes.map((sz) => {
          const n = qty[sz] ?? 0;
          return (
            <div key={sz} className={cn('rounded-2xl border p-3', n === 0 ? 'border-rouille-500/40' : n <= LOW ? 'border-amber-300 dark:border-amber-500/40' : 'border-line')}>
              <div className="flex items-center justify-between text-[12px] text-ink-muted">
                Taille <strong className="text-[15px] text-ink">{sz}</strong>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <button type="button" onClick={() => setQty((q) => ({ ...q, [sz]: Math.max(0, n - 1) }))} className="grid size-8 place-items-center rounded-lg border border-line text-ink-soft hover:text-ink" aria-label={`Retirer 1 taille ${sz}`}>
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={n}
                  onChange={(e) => setQty((q) => ({ ...q, [sz]: Math.max(0, Math.min(9999, Number(e.target.value) || 0)) }))}
                  className="field h-8 min-w-0 flex-1 px-1 py-0 text-center font-semibold tabular-nums"
                  aria-label={`Stock taille ${sz}`}
                />
                <button type="button" onClick={() => setQty((q) => ({ ...q, [sz]: n + 1 }))} className="grid size-8 place-items-center rounded-lg border border-line text-ink-soft hover:text-ink" aria-label={`Ajouter 1 taille ${sz}`}>
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {tracked && (
        <div className="flex items-center gap-2 text-[12.5px] text-ink-muted">
          <span>Total : <strong className="text-ink">{total}</strong> pièce(s)</span>
          <span className="ml-auto">Réassort rapide :</span>
          {[5, 10].map((n) => (
            <button key={n} type="button" onClick={() => setQty((q) => Object.fromEntries(Object.entries(q).map(([k, v]) => [k, v + n])))} className="rounded-lg border border-line px-2 py-1 font-semibold text-ink hover:border-ink/25">
              +{n} partout
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={onDone}>
          Annuler
        </Button>
        <Button loading={save.isPending} onClick={() => save.mutate(undefined, { onSuccess: onDone })}>
          Enregistrer le stock
        </Button>
      </div>
    </div>
  );
}
