import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UsersRound } from 'lucide-react';
import { api, ApiError, type StaffMember, type StaffRole } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { useAuth } from '../../stores/auth';
import { ROLE_HINT, ROLE_LABEL, ROLE_TONE } from '../../lib/staff';
import { formatPhone } from '../../lib/format';
import { EmptyState, Skeleton } from '../../components/ui/misc';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { CellStack, Table, TableCard, Td, Th, THead, Tr } from '../../components/admin/DataTable';
import { IconBtn } from './AdminPromos';
import { cn } from '../../lib/cn';

const ROLES: StaffRole[] = ['gerant', 'preparateur', 'livreur'];

export default function AdminTeam() {
  const me = useAuth((s) => s.user);
  const { data, isLoading } = useQuery({ queryKey: qk.admin.team, queryFn: () => api.admin.team() });
  const [editing, setEditing] = useState<StaffMember | 'new' | null>(null);
  const [removing, setRemoving] = useState<StaffMember | null>(null);
  const remove = useAdminMutation((id: number) => api.admin.removeStaff(id), { success: 'Accès retiré', invalidate: [qk.admin.team, qk.admin.couriers] });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r} className="rounded-[20px] border border-line bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', ROLE_TONE[r])}>{ROLE_LABEL[r]}</span>
              <span className="font-display text-2xl font-semibold text-ink tabular-nums">{data?.filter((m) => m.staff_role === r).length ?? '–'}</span>
            </div>
            <p className="mt-2 text-[12.5px] text-ink-muted">{ROLE_HINT[r]}</p>
          </div>
        ))}
      </div>

      <TableCard
        toolbar={
          <>
            <span className="text-[13.5px] text-ink-muted">{data?.length ?? 0} membre(s)</span>
            <button
              onClick={() => setEditing('new')}
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-rouille-500 px-3.5 text-[13px] font-semibold text-white transition hover:bg-rouille-600"
            >
              <Plus className="size-4" /> Ajouter un membre
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
            <EmptyState icon={<UsersRound className="size-6" />} title="Aucun membre" />
          </div>
        ) : (
          <Table minWidth={640}>
            <THead>
              <Th>Membre</Th>
              <Th>Rôle</Th>
              <Th>Téléphone</Th>
              <Th>Depuis</Th>
              <Th align="right">Actions</Th>
            </THead>
            <tbody>
              {data.map((m) => (
                <Tr key={m.id} onClick={() => setEditing(m)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar user={m} className="size-9 text-[12px]" />
                      <CellStack title={<>{m.full_name}{m.id === me?.id && <span className="ml-1.5 text-[11.5px] font-normal text-ink-muted">(vous)</span>}</>} sub={m.username ? `@${m.username}` : undefined} />
                    </div>
                  </Td>
                  <Td>
                    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', ROLE_TONE[m.staff_role])}>{ROLE_LABEL[m.staff_role]}</span>
                  </Td>
                  <Td className="text-ink-soft">{m.phone ? formatPhone(m.phone) : '—'}</Td>
                  <Td className="text-ink-muted">{new Date(m.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</Td>
                  <Td align="right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      <IconBtn onClick={() => setEditing(m)} label="Modifier">
                        <Pencil className="size-4" />
                      </IconBtn>
                      {m.id !== me?.id && (
                        <IconBtn onClick={() => setRemoving(m)} label="Retirer l'accès" danger>
                          <Trash2 className="size-4" />
                        </IconBtn>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </TableCard>

      <Modal open={editing !== null} onClose={() => setEditing(null)} eyebrow="Équipe" title={editing === 'new' ? 'Ajouter un membre' : 'Modifier le membre'}>
        {editing !== null && <StaffForm key={editing === 'new' ? 'new' : editing.id} member={editing === 'new' ? null : editing} self={editing !== 'new' && editing.id === me?.id} onDone={() => setEditing(null)} />}
      </Modal>

      <Modal open={!!removing} onClose={() => setRemoving(null)} eyebrow="Équipe" title="Retirer l'accès ?">
        <p className="text-[15px] text-ink-soft">
          {removing?.full_name} ne pourra plus se connecter à l’administration. Ses commandes et son historique restent visibles.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => setRemoving(null)}>
            Retour
          </Button>
          <Button loading={remove.isPending} onClick={() => removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}>
            Retirer l’accès
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function StaffForm({ member, self, onDone }: { member: StaffMember | null; self: boolean; onDone: () => void }) {
  const [fullName, setFullName] = useState(member?.full_name ?? '');
  const [username, setUsername] = useState(member?.username ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [role, setRole] = useState<StaffRole>(member?.staff_role ?? 'preparateur');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const save = useAdminMutation(
    () => {
      const ph = phone.replace(/\D/g, '').replace(/^(00)?242/, '') || null;
      return member
        ? api.admin.updateStaff(member.id, { full_name: fullName.trim(), staff_role: role, phone: ph, ...(password ? { password, password_confirmation: confirm } : {}) })
        : api.admin.createStaff({ full_name: fullName.trim(), username: username.trim().toLowerCase(), password, password_confirmation: confirm, staff_role: role, phone: ph });
    },
    { success: member ? 'Membre mis à jour' : 'Membre ajouté', invalidate: [qk.admin.team, qk.admin.couriers] },
  );
  const err = (k: string) => errors[k]?.[0];
  const mismatch = (password || confirm) && confirm !== password;
  // Laravel rapporte « confirmed » sur le champ mot de passe : on l'affiche sous la confirmation
  const pwErr = err('password');
  const pwIsMismatch = pwErr && /correspondent/.test(pwErr);

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const local: Record<string, string[]> = {};
        if (!phone.replace(/\D/g, '')) local.phone = ['Indiquez le téléphone du membre.'];
        if (!member && password.length < 8) local.password = ['8 caractères minimum.'];
        if ((password || !member) && confirm !== password) local.password_confirmation = ['Les deux mots de passe ne correspondent pas.'];
        setErrors(local);
        if (Object.keys(local).length) return;
        save.mutate(undefined, { onSuccess: onDone, onError: (x) => x instanceof ApiError && setErrors(x.errors) });
      }}
    >
      <L label="Nom complet" error={err('full_name')}>
        <input className="field h-11 py-0" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={120} />
      </L>
      <div className="grid grid-cols-2 gap-3">
        <L label="Identifiant de connexion" error={err('username')}>
          <input className="field h-11 py-0" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={!!member} placeholder="ex. junior" />
        </L>
        <L label="Téléphone" error={err('phone')}>
          <input className="field h-11 py-0" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 123 45 67" required />
        </L>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[12.5px] font-medium text-ink-muted">Rôle</legend>
        <div className="space-y-2">
          {ROLES.map((r) => (
            <label key={r} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition', role === r ? 'border-ink/40 bg-surface-2/50' : 'border-line', self && 'cursor-not-allowed opacity-60')}>
              <input type="radio" name="role" className="mt-1 accent-[var(--color-rouille-500)]" checked={role === r} onChange={() => setRole(r)} disabled={self} />
              <span>
                <span className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                  {r === 'gerant' && <ShieldCheck className="size-4 text-rouille-600" />} {ROLE_LABEL[r]}
                </span>
                <span className="block text-[12.5px] text-ink-muted">{ROLE_HINT[r]}</span>
              </span>
            </label>
          ))}
        </div>
        {self && <p className="mt-1.5 text-[12px] text-ink-muted">Vous ne pouvez pas changer votre propre rôle.</p>}
        {err('staff_role') && <p className="mt-1.5 text-[12px] font-medium text-rouille-600">{err('staff_role')}</p>}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <L label={member ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe provisoire'} error={pwIsMismatch ? undefined : pwErr} hint="8 caractères minimum.">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
            <input className="field h-11 py-0 pl-9" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required={!member} />
          </div>
        </L>
        <L
          label="Confirmer le mot de passe"
          error={err('password_confirmation') ?? (pwIsMismatch ? pwErr : undefined)}
          hint={confirm && !mismatch ? '✓ Identiques' : undefined}
        >
          <input className="field h-11 py-0" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required={!member || !!password} disabled={!!member && !password} />
        </L>
      </div>
      <p className="-mt-1 text-[12px] text-ink-muted">À transmettre à la personne : elle pourra le changer dans son profil.</p>

      <div className="grid gap-2 pt-1 sm:grid-cols-2">
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

function L({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-medium text-ink-muted">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] font-medium text-rouille-600">{error}</span> : hint ? <span className="mt-1 block text-[12px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}
