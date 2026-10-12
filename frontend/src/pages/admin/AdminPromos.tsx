import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Sparkles, TicketPercent, Trash2 } from 'lucide-react';
import { api, ApiError, type Promo, type PromoInput } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { fcfa } from '../../lib/format';
import { EmptyState, Skeleton } from '../../components/ui/misc';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { CellStack, Table, TableCard, Td, Th, THead, Tr } from '../../components/admin/DataTable';
import { cn } from '../../lib/cn';

export const promoValue = (p: Pick<Promo, 'type' | 'value'>) => (p.type === 'percent' ? `− ${p.value} %` : `− ${fcfa(p.value)}`);

function conditions(p: Promo) {
  const c: string[] = [];
  if (p.min_items) c.push(`dès ${p.min_items} articles`);
  if (p.min_total) c.push(`dès ${fcfa(p.min_total)}`);
  return c.length ? c.join(' · ') : 'Sans condition';
}

const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' }) : null);

function state(p: Promo): { label: string; tone: string } {
  const now = Date.now();
  if (!p.is_active) return { label: 'Désactivée', tone: 'bg-stone-200 text-stone-700 ring-stone-300' };
  if (p.starts_at && new Date(p.starts_at).getTime() > now) return { label: 'Programmée', tone: 'bg-sky-100 text-sky-900 ring-sky-200' };
  if (p.ends_at && new Date(p.ends_at).getTime() < now) return { label: 'Expirée', tone: 'bg-stone-200 text-stone-700 ring-stone-300' };
  if (p.max_uses && p.uses >= p.max_uses) return { label: 'Épuisée', tone: 'bg-amber-100 text-amber-900 ring-amber-200' };
  return { label: 'Active', tone: 'bg-emerald-100 text-emerald-900 ring-emerald-200' };
}

export default function AdminPromos() {
  const { data, isLoading } = useQuery({ queryKey: qk.admin.promos, queryFn: () => api.admin.promos() });
  const [editing, setEditing] = useState<Promo | 'new' | null>(null);
  const [removing, setRemoving] = useState<Promo | null>(null);

  const toggle = useAdminMutation((p: Promo) => api.admin.updatePromo(p.id, { ...strip(p), is_active: !p.is_active }), {
    success: (p) => (p.is_active ? 'Promotion activée' : 'Promotion désactivée'),
    invalidate: [qk.admin.promos],
  });
  const del = useAdminMutation((id: number) => api.admin.deletePromo(id), { success: 'Promotion supprimée', invalidate: [qk.admin.promos] });

  return (
    <div className="space-y-5">
      <div className="rounded-[20px] border border-line bg-surface-2/40 p-4 text-[13.5px] text-ink-soft sm:p-5">
        <strong className="text-ink">Comment ça marche :</strong> un <strong className="text-ink">code promo</strong> est saisi par le client au moment de commander. Une{' '}
        <strong className="text-ink">remise automatique</strong> (sans code — ex. remise famille dès 3 articles) s'applique toute seule quand les conditions sont remplies. Les remises ne se cumulent pas : la
        plus avantageuse pour le client est retenue.
      </div>

      <TableCard
        toolbar={
          <>
            <span className="text-[13.5px] text-ink-muted">{data?.length ?? 0} promotion(s)</span>
            <button
              onClick={() => setEditing('new')}
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-rouille-500 px-3.5 text-[13px] font-semibold text-white transition hover:bg-rouille-600"
            >
              <Plus className="size-4" /> Nouvelle promotion
            </button>
          </>
        }
      >
        {isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : !data?.length ? (
          <div className="p-5">
            <EmptyState icon={<TicketPercent className="size-6" />} title="Aucune promotion" action={<Button onClick={() => setEditing('new')}>Créer une promotion</Button>}>
              Créez un code pour la rentrée ou une remise famille automatique.
            </EmptyState>
          </div>
        ) : (
          <Table minWidth={780}>
            <THead>
              <Th>Promotion</Th>
              <Th>Remise</Th>
              <Th>Conditions</Th>
              <Th>Période</Th>
              <Th align="right">Utilisations</Th>
              <Th>État</Th>
              <Th align="right">Actions</Th>
            </THead>
            <tbody>
              {data.map((p) => {
                const st = state(p);
                return (
                  <Tr key={p.id} onClick={() => setEditing(p)}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', p.automatic ? 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300' : 'bg-rouille-50 text-rouille-600 dark:bg-rouille-500/15')}>
                          {p.automatic ? <Sparkles className="size-4" /> : <TicketPercent className="size-4" />}
                        </span>
                        <CellStack title={p.code ? <span className="font-mono tracking-wide">{p.code}</span> : 'Automatique'} sub={p.label} />
                      </div>
                    </Td>
                    <Td className="font-semibold text-ink">{promoValue(p)}</Td>
                    <Td className="text-ink-soft">{conditions(p)}</Td>
                    <Td className="text-ink-soft">
                      {p.starts_at || p.ends_at ? `${shortDate(p.starts_at) ?? '…'} → ${shortDate(p.ends_at) ?? '…'}` : 'Permanente'}
                    </Td>
                    <Td align="right" className="text-ink tabular-nums">
                      {p.uses}
                      {p.max_uses ? <span className="text-ink-muted"> / {p.max_uses}</span> : ''}
                    </Td>
                    <Td>
                      <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', st.tone)}>{st.label}</span>
                    </Td>
                    <Td align="right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Switch checked={p.is_active} onChange={() => toggle.mutate(p)} label={p.is_active ? 'Désactiver' : 'Activer'} />
                        <IconBtn onClick={() => setEditing(p)} label="Modifier">
                          <Pencil className="size-4" />
                        </IconBtn>
                        <IconBtn onClick={() => setRemoving(p)} label="Supprimer" danger>
                          <Trash2 className="size-4" />
                        </IconBtn>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </TableCard>

      <PromoForm promo={editing} onClose={() => setEditing(null)} />

      <Modal open={!!removing} onClose={() => setRemoving(null)} eyebrow="Suppression" title="Supprimer la promotion ?">
        <p className="text-[15px] text-ink-soft">
          {removing?.code ? `Le code ${removing.code}` : 'Cette remise automatique'} ne pourra plus être utilisé. Les commandes déjà passées gardent leur remise.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => setRemoving(null)}>
            Retour
          </Button>
          <Button loading={del.isPending} onClick={() => removing && del.mutate(removing.id, { onSuccess: () => setRemoving(null) })}>
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const strip = (p: Promo): PromoInput => ({
  code: p.code,
  label: p.label,
  type: p.type,
  value: p.value,
  min_items: p.min_items,
  min_total: p.min_total,
  is_active: p.is_active,
  starts_at: p.starts_at,
  ends_at: p.ends_at,
  max_uses: p.max_uses,
});

const EMPTY: PromoInput = { code: '', label: '', type: 'percent', value: 10, min_items: 0, min_total: 0, is_active: true, starts_at: null, ends_at: null, max_uses: null };

function PromoForm({ promo, onClose }: { promo: Promo | 'new' | null; onClose: () => void }) {
  const open = promo !== null;
  const initial = promo && promo !== 'new' ? strip(promo) : EMPTY;
  return (
    <Modal open={open} onClose={onClose} eyebrow="Promotions" title={promo === 'new' ? 'Nouvelle promotion' : 'Modifier la promotion'} className="sm:max-w-xl">
      {open && <PromoFields key={promo === 'new' ? 'new' : promo.id} id={promo === 'new' ? null : promo.id} initial={initial} onDone={onClose} />}
    </Modal>
  );
}

function PromoFields({ id, initial, onDone }: { id: number | null; initial: PromoInput; onDone: () => void }) {
  const [f, setF] = useState({ ...initial, starts_at: initial.starts_at?.slice(0, 10) ?? '', ends_at: initial.ends_at?.slice(0, 10) ?? '' });
  const [auto, setAuto] = useState(id !== null && !initial.code);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = useAdminMutation(
    () => {
      const payload: PromoInput = {
        ...f,
        code: auto ? null : (f.code ?? '').trim().toUpperCase() || null,
        label: f.label.trim(),
        starts_at: f.starts_at || null,
        ends_at: f.ends_at ? `${f.ends_at}T23:59:59` : null,
      };
      return id ? api.admin.updatePromo(id, payload) : api.admin.createPromo(payload);
    },
    { success: id ? 'Promotion mise à jour' : 'Promotion créée', invalidate: [qk.admin.promos] },
  );
  const err = (k: string) => errors[k]?.[0];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErrors({});
        save.mutate(undefined, { onSuccess: onDone, onError: (x) => x instanceof ApiError && setErrors(x.errors) });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-1 text-[13px] font-medium">
        {[
          [false, 'Code promo', TicketPercent],
          [true, 'Remise automatique', Sparkles],
        ].map(([v, l, I]) => {
          const Icon = I as typeof Sparkles;
          return (
            <button key={String(v)} type="button" onClick={() => setAuto(v as boolean)} className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg py-2 transition', auto === v ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted')}>
              <Icon className="size-3.5" /> {l as string}
            </button>
          );
        })}
      </div>

      {!auto && (
        <F label="Code" error={err('code')} hint="Ce que le client tape, ex. RENTREE26">
          <input className="field h-11 py-0 font-mono uppercase" value={f.code ?? ''} onChange={(e) => set('code', e.target.value.toUpperCase())} required={!auto} maxLength={40} />
        </F>
      )}
      <F label="Libellé" error={err('label')} hint="Affiché au client, ex. « Remise famille » ou « Offre de rentrée »">
        <input className="field h-11 py-0" value={f.label} onChange={(e) => set('label', e.target.value)} required maxLength={120} />
      </F>

      <div className="grid grid-cols-[1fr_1.2fr] gap-3">
        <F label="Type">
          <select className="field h-11 py-0" value={f.type} onChange={(e) => set('type', e.target.value as PromoInput['type'])}>
            <option value="percent">Pourcentage</option>
            <option value="amount">Montant fixe</option>
          </select>
        </F>
        <F label={f.type === 'percent' ? 'Remise (%)' : 'Remise (FCFA)'} error={err('value')}>
          <input className="field h-11 py-0" type="number" min={1} max={f.type === 'percent' ? 90 : 1000000} value={f.value} onChange={(e) => set('value', Number(e.target.value))} required />
        </F>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <F label="Articles minimum" hint="0 = pas de minimum">
          <input className="field h-11 py-0" type="number" min={0} max={100} value={f.min_items} onChange={(e) => set('min_items', Number(e.target.value))} />
        </F>
        <F label="Montant minimum (FCFA)">
          <input className="field h-11 py-0" type="number" min={0} step={500} value={f.min_total} onChange={(e) => set('min_total', Number(e.target.value))} />
        </F>
        <F label="Début (facultatif)">
          <input className="field h-11 py-0" type="date" value={f.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
        </F>
        <F label="Fin (facultatif)" error={err('ends_at')}>
          <input className="field h-11 py-0" type="date" value={f.ends_at} min={f.starts_at || undefined} onChange={(e) => set('ends_at', e.target.value)} />
        </F>
        <F label="Utilisations max" hint="Vide = illimité">
          <input className="field h-11 py-0" type="number" min={1} value={f.max_uses ?? ''} onChange={(e) => set('max_uses', e.target.value ? Number(e.target.value) : null)} />
        </F>
        <label className="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-line px-3 py-3">
          <input type="checkbox" className="size-4 accent-[var(--color-rouille-500)]" checked={f.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          <span className="text-[13.5px] text-ink">Active</span>
        </label>
      </div>

      <div className="grid gap-2 pt-2 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" loading={save.isPending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

function F({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-medium text-ink-muted">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] font-medium text-rouille-600">{error}</span> : hint ? <span className="mt-1 block text-[12px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onChange}
      className={cn('relative h-6 w-10 shrink-0 rounded-full transition', checked ? 'bg-emerald-500' : 'bg-line')}
    >
      <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition', checked && 'translate-x-4')} />
    </button>
  );
}

export function IconBtn({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn('grid size-9 place-items-center rounded-lg border border-line bg-surface text-ink-soft transition hover:border-ink/25 hover:text-ink', danger && 'hover:border-rouille-500/40 hover:text-rouille-600')}
    >
      {children}
    </button>
  );
}
