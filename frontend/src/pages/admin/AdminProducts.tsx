import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, ImagePlus, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { api, ApiError, type Category, type Ensemble, type Niveau, type Product, type ProductInput } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { CATEGORY_LABEL, ENSEMBLE_LABEL, fcfa, NIVEAU_LABEL } from '../../lib/format';
import { cn } from '../../lib/cn';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, Skeleton } from '../../components/ui/misc';
import { ProductImage } from '../../components/product/ProductImage';
import { Panel } from './AdminLayout';

export default function AdminProducts() {
  const { data, isLoading } = useQuery({ queryKey: qk.admin.products, queryFn: api.admin.listProducts });
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const del = useAdminMutation((id: number) => api.admin.deleteProduct(id), {
    success: (r) => (r.archived ? 'Article déjà commandé : archivé (historique conservé)' : 'Article supprimé'),
    invalidate: [qk.admin.products],
  });
  const restore = useAdminMutation((id: number) => api.admin.restoreProduct(id), { success: 'Article réactivé', invalidate: [qk.admin.products] });

  const active = (data ?? []).filter((p) => !p.is_archived);
  const archived = (data ?? []).filter((p) => p.is_archived);

  return (
    <div className="space-y-6">
      <Panel
        title={`Catalogue (${active.length})`}
        description="Articles de la collection active. Un article déjà commandé est archivé plutôt que supprimé, pour conserver l'historique."
        actions={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            Nouvel article
          </Button>
        }
      >
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <EmptyState title="Aucun article" action={<Button onClick={() => setEditing('new')}>Ajouter un article</Button>}>
            Cette collection est encore vide.
          </EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((p) => (
              <ProductRow key={p.id} product={p}>
                <Button size="sm" variant="outline" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(p)}>
                  Modifier
                </Button>
                <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" />} onClick={() => setToDelete(p)}>
                  Retirer
                </Button>
              </ProductRow>
            ))}
          </div>
        )}
      </Panel>

      {archived.length > 0 && (
        <Panel title={`Archivés (${archived.length})`} description="Masqués du catalogue public.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {archived.map((p) => (
              <ProductRow key={p.id} product={p} muted>
                <Button size="sm" variant="outline" icon={<RotateCcw className="size-3.5" />} loading={restore.isPending && restore.variables === p.id} onClick={() => restore.mutate(p.id)}>
                  Réactiver
                </Button>
              </ProductRow>
            ))}
          </div>
        </Panel>
      )}

      <ProductFormModal product={editing} onClose={() => setEditing(null)} />

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

function ProductRow({ product: p, muted, children }: { product: Product; muted?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('flex gap-4 rounded-2xl border border-line bg-surface p-3', muted && 'opacity-60')}>
      <ProductImage product={p} className="size-24 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="truncate font-semibold">{p.name}</div>
        <div className="text-[12.5px] text-ink-muted">
          {ENSEMBLE_LABEL[p.ensemble]} · {CATEGORY_LABEL[p.cat]} · {p.sizes.join(', ')}
        </div>
        <div className="mt-0.5 text-[14px] font-semibold text-rouille-600">{fcfa(p.price)}</div>
        <div className="mt-auto flex flex-wrap gap-1 pt-2">{children}</div>
      </div>
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
