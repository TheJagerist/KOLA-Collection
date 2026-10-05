import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { qk, useAdminMutation, useStorefront } from '../../hooks/queries';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Field';
import { EmptyState, Skeleton } from '../../components/ui/misc';
import { Panel } from './AdminLayout';

export default function AdminStorefront() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <HomepageForm />
      <CarouselManager />
    </div>
  );
}

function HomepageForm() {
  const { data, isLoading } = useStorefront();
  const [form, setForm] = useState({ hero_eyebrow: '', hero_title: '', hero_lede: '', cta_primary_label: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (data?.homepage)
      setForm({
        hero_eyebrow: data.homepage.hero_eyebrow ?? '',
        hero_title: data.homepage.hero_title ?? '',
        hero_lede: data.homepage.hero_lede ?? '',
        cta_primary_label: data.homepage.cta_primary_label ?? '',
      });
  }, [data?.homepage]);

  const save = useAdminMutation(api.admin.updateHomepage, { success: "Contenu de l'accueil mis à jour" });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.hero_title.trim()) return setError('Le titre est obligatoire.');
    setError('');
    save.mutate({ ...form, hero_title: form.hero_title.trim() });
  };
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Panel title="Contenu de l'accueil" description="Textes du grand bandeau d'accueil pour la collection active.">
      {isLoading ? (
        <Skeleton className="h-80" />
      ) : !data?.collection ? (
        <EmptyState title="Aucune collection active">Activez une collection pour éditer l'accueil.</EmptyState>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input label="Accroche" value={form.hero_eyebrow} onChange={set('hero_eyebrow')} placeholder="L'uniforme de la rentrée…" />
          <Input label="Titre principal" value={form.hero_title} onChange={set('hero_title')} error={error} />
          <Textarea label="Texte descriptif" rows={4} value={form.hero_lede} onChange={set('hero_lede')} />
          <Input label="Libellé du bouton principal" value={form.cta_primary_label} onChange={set('cta_primary_label')} placeholder="Voir le catalogue" />
          <Button type="submit" loading={save.isPending}>
            Enregistrer
          </Button>
        </form>
      )}
    </Panel>
  );
}

function CarouselManager() {
  const { data, isLoading } = useQuery({ queryKey: qk.admin.carousel, queryFn: api.admin.listCarousel });
  const fileRef = useRef<HTMLInputElement>(null);
  const opts = { invalidate: [qk.admin.carousel] as const };
  const add = useAdminMutation(api.admin.addCarouselImages, { ...opts, success: 'Images ajoutées' });
  const remove = useAdminMutation(api.admin.deleteCarouselImage, { ...opts, success: 'Image retirée' });
  const reorder = useAdminMutation(api.admin.reorderCarousel, opts);

  const move = (i: number, dir: -1 | 1) => {
    if (!data) return;
    const ids = data.map((x) => x.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    reorder.mutate(ids);
  };

  return (
    <Panel
      title="Carrousel de l'accueil"
      description="Images qui défilent en fond du bandeau d'accueil. Idéalement 4 images ou plus, au format portrait ou paysage."
      actions={
        <>
          <Button size="sm" variant="dark" icon={<ImagePlus className="size-4" />} loading={add.isPending} onClick={() => fileRef.current?.click()}>
            Ajouter
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) add.mutate(files);
              e.target.value = '';
            }}
          />
        </>
      }
    >
      {isLoading ? (
        <Skeleton className="h-60" />
      ) : !data?.length ? (
        <EmptyState title="Aucune image">Le bandeau s'affichera sur fond uni.</EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {data.map((img, i) => (
            <figure key={img.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="relative aspect-[4/3]">
                <img src={img.image_url} alt="" className="size-full object-cover" />
                <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-full bg-brun-900/80 text-[11px] font-bold text-creme-50">{i + 1}</span>
              </div>
              <figcaption className="flex items-center justify-between p-1.5">
                <span className="flex">
                  <IconBtn label="Reculer" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)}>
                    <ArrowLeft className="size-4" />
                  </IconBtn>
                  <IconBtn label="Avancer" disabled={i === data.length - 1 || reorder.isPending} onClick={() => move(i, 1)}>
                    <ArrowRight className="size-4" />
                  </IconBtn>
                </span>
                <IconBtn label="Retirer" danger onClick={() => remove.mutate(img.id)}>
                  <Trash2 className="size-4" />
                </IconBtn>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </Panel>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-lg transition disabled:opacity-30 ${danger ? 'text-rouille-600 hover:bg-rouille-50' : 'text-ink-soft hover:bg-page'}`}
    >
      {children}
    </button>
  );
}
