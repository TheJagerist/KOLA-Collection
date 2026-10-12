import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  Camera,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  MonitorSmartphone,
  Package,
  Palette,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { api, ApiError, type PasswordInput, type ProfileInput, type Role, type User } from '../../lib/api';
import { qk, useMyOrders } from '../../hooks/queries';
import { useAuth } from '../../stores/auth';
import { toast } from '../../stores/toast';
import { DELIVERY_CITIES, formatPhone } from '../../lib/format';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Field';
import { Avatar, resizeImage } from '../ui/Avatar';
import { ThemeToggle } from '../layout/ThemeToggle';

type Variant = 'client' | 'admin';
type Tab = 'infos' | 'livraison' | 'securite' | 'preferences';

const TABS: {
  id: Tab;
  label: string;
  Icon: typeof UserIcon;
  only?: Variant;
}[] = [
  { id: 'infos', label: 'Informations', Icon: UserIcon },
  { id: 'livraison', label: 'Livraison', Icon: MapPin, only: 'client' },
  { id: 'securite', label: 'Sécurité', Icon: ShieldCheck },
  { id: 'preferences', label: 'Préférences', Icon: Palette },
];

const ROLE_LABEL: Record<Role, string> = { parent: 'Parent', eleve: 'Élève' };

/**
 * Page profil commune au client (/profil) et à l'administrateur (/admin/profil).
 * Seul le contenu varie : statistiques, onglet « Livraison » (client) et raccourcis.
 */
export function ProfileView({ variant }: { variant: Variant }) {
  const user = useAuth((s) => s.user)!;
  const [params, setParams] = useSearchParams();
  const tabs = TABS.filter((t) => !t.only || t.only === variant);
  const tab = (tabs.find((t) => t.id === params.get('onglet'))?.id ?? 'infos') as Tab;

  return (
    <div className="space-y-6">
      <ProfileHeader user={user} variant={variant} />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        {/* Navigation des sections */}
        <nav
          aria-label="Sections du profil"
          className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:sticky lg:top-24 lg:flex-col lg:rounded-[20px] lg:border lg:border-line lg:bg-surface lg:p-2"
        >
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() =>
                setParams(id === 'infos' ? {} : { onglet: id }, {
                  replace: true,
                })
              }
              className={cn(
                'relative flex h-11 shrink-0 items-center gap-2.5 rounded-xl px-4 text-[14px] font-medium whitespace-nowrap transition',
                tab === id ? 'text-ink' : 'text-ink-muted hover:text-ink',
              )}
              aria-current={tab === id ? 'page' : undefined}
            >
              {tab === id && (
                <motion.span
                  layoutId="profile-tab"
                  className="absolute inset-0 rounded-xl bg-surface-2 max-lg:border max-lg:border-line"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                />
              )}
              <Icon className={cn('relative size-[18px]', tab === id && 'text-rouille-600')} />
              <span className="relative">{label}</span>
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="min-w-0 space-y-6"
          >
            {tab === 'infos' && <InfosSection user={user} variant={variant} />}
            {tab === 'livraison' && <DeliverySection user={user} />}
            {tab === 'securite' && <SecuritySection user={user} />}
            {tab === 'preferences' && <PreferencesSection variant={variant} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ================================================================== EN-TÊTE */
function ProfileHeader({ user, variant }: { user: User; variant: Variant }) {
  const setUser = useAuth((s) => s.setUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Choisissez une image (JPG, PNG ou WebP).');
    setUploading(true);
    try {
      setUser(await api.uploadAvatar(await resizeImage(file)));
      toast.success('Photo de profil mise à jour');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.firstError() : "La photo n'a pas pu être envoyée.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeAvatar = async () => {
    try {
      setUser(await api.deleteAvatar());
      toast.success('Photo supprimée');
    } catch {
      toast.error('Impossible de supprimer la photo.');
    }
  };

  const completion = profileCompletion(user, variant);
  const since = new Date(user.created_at).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="overflow-hidden rounded-[28px] border border-line bg-surface">
      {/* Bandeau */}
      <div className="relative h-28 overflow-hidden bg-brun-900 sm:h-36">
        <div aria-hidden className="absolute -top-20 -left-10 size-72 rounded-full bg-rouille-500/45 blur-3xl" />
        <div aria-hidden className="absolute -right-10 -bottom-24 size-72 rounded-full bg-ciel-400/30 blur-3xl" />
        <div aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:14px_14px]" />
        <div className="absolute right-0 bottom-0 left-0 h-1 bg-gradient-to-r from-rouille-500 via-kaki-300 to-nuit-800" />
      </div>

      <div className="px-5 pb-6 sm:px-8">
        <div className="-mt-12 flex items-end justify-between gap-3 sm:-mt-14">
          <div className="group relative">
            <Avatar user={user} className="size-24 text-3xl ring-4 ring-surface sm:size-28" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Changer la photo de profil"
            >
              {uploading ? <span className="size-6 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Camera className="size-6" />}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute right-0 bottom-0 grid size-9 place-items-center rounded-full border-2 border-surface bg-inverse text-on-inverse shadow-md sm:hidden"
              aria-label="Changer la photo"
            >
              <Camera className="size-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <div className="flex flex-wrap justify-end gap-2 pb-1">
            {user.avatar_url && (
              <Button variant="ghost" size="sm" onClick={removeAvatar} icon={<Trash2 className="size-4" />}>
                Retirer la photo
              </Button>
            )}
            {variant === 'client' ? (
              <Link
                to="/compte"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/15 px-4 text-[13px] font-semibold text-ink transition hover:bg-ink/5"
              >
                <Package className="size-4" /> Mes commandes
              </Link>
            ) : (
              <Link
                to="/admin"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/15 px-4 text-[13px] font-semibold text-ink transition hover:bg-ink/5"
              >
                <LayoutDashboard className="size-4" /> Tableau de bord
              </Link>
            )}
          </div>
        </div>
        <div className="mt-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl leading-tight text-ink sm:text-3xl">{user.full_name}</h1>
              {user.is_admin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rouille-500 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase">
                  <BadgeCheck className="size-3.5" /> Admin
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[13.5px] text-ink-muted">
              {user.username && <>@{user.username} · </>}
              {user.is_admin ? 'Administrateur' : ROLE_LABEL[user.role]} · membre depuis {since}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          {variant === 'client' ? <ClientStats /> : <AdminStats />}
          <Completion value={completion.value} missing={completion.missing} />
        </div>
      </div>
    </section>
  );
}

function profileCompletion(user: User, variant: Variant) {
  const checks: [boolean, string][] = [
    [!!user.full_name, 'votre nom'],
    [!!user.avatar_url, 'une photo'],
    [!!user.phone, 'votre téléphone'],
    [!!user.email, 'votre e-mail'],
    ...(variant === 'client' ? ([[!!user.default_city && !!user.default_address, 'une adresse de livraison']] as [boolean, string][]) : []),
  ];
  const done = checks.filter(([ok]) => ok).length;
  return {
    value: Math.round((done / checks.length) * 100),
    missing: checks.filter(([ok]) => !ok).map(([, l]) => l),
  };
}

function Completion({ value, missing }: { value: number; missing: string[] }) {
  return (
    <div className="rounded-2xl bg-surface-2/60 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-ink-soft">Profil complété</span>
        <span className="font-display text-xl font-semibold text-ink tabular-nums">{value} %</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
        <motion.div
          className={cn('h-full rounded-full', value === 100 ? 'bg-emerald-500' : 'bg-rouille-500')}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="mt-2 text-[12px] leading-snug text-ink-muted">
        {missing.length ? `Ajoutez ${missing.slice(0, 2).join(' et ')}${missing.length > 2 ? '…' : '.'}` : 'Tout est à jour, merci !'}
      </p>
    </div>
  );
}

function StatGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((s) => (
        <div key={s.label} className="rounded-2xl border border-line p-4">
          <div className="font-display text-lg font-semibold whitespace-nowrap text-ink tabular-nums sm:text-2xl">{s.value}</div>
          <div className="mt-0.5 text-[12px] text-ink-muted sm:text-[12.5px]">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function ClientStats() {
  const { data } = useMyOrders();
  const list = data ?? [];
  const valid = list.filter((o) => o.status !== 'annulee');
  return (
    <StatGrid
      items={[
        { label: 'Commandes', value: String(list.length) },
        {
          label: 'En cours',
          value: String(list.filter((o) => ['en_attente', 'validee', 'transit'].includes(o.status)).length),
        },
        {
          label: 'Total dépensé (FCFA)',
          value: new Intl.NumberFormat('fr-FR', {
            notation: 'compact',
            maximumFractionDigits: 1,
          }).format(valid.reduce((s, o) => s + o.total, 0)),
        },
      ]}
    />
  );
}

function AdminStats() {
  const { data } = useQuery({
    queryKey: qk.admin.orders,
    queryFn: () => api.admin.listOrders(),
    staleTime: 30_000,
  });
  const list = data ?? [];
  const clients = new Set(list.map((o) => o.customer?.id)).size;
  return (
    <StatGrid
      items={[
        {
          label: 'À traiter',
          value: String(list.filter((o) => o.status === 'en_attente').length),
        },
        {
          label: 'Livrées',
          value: String(list.filter((o) => o.status === 'livre').length),
        },
        { label: 'Clients', value: String(clients) },
      ]}
    />
  );
}

/* ================================================================== CARTE DE SECTION */
function Card({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-line bg-surface">
      <div className="p-5 sm:p-7">
        <h2 className="font-display text-xl text-ink">{title}</h2>
        {description && <p className="mt-1 max-w-xl text-[13.5px] text-ink-muted">{description}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2/40 px-5 py-3.5 sm:px-7">{footer}</div>}
    </section>
  );
}

/** Formulaire partiel : n'envoie que les champs modifiés */
function useProfileForm<T extends Record<string, string>>(initial: T) {
  const setUser = useAuth((s) => s.setUser);
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => Object.keys(values).some((k) => values[k] !== initial[k]), [values, initial]);

  const set = (k: keyof T) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k as string]: '' }));
  };

  const submit = async (e: FormEvent, success = 'Profil mis à jour') => {
    e.preventDefault();
    const changed = Object.fromEntries(
      Object.entries(values)
        .filter(([k, v]) => v !== initial[k])
        .map(([k, v]) => [k, v === '' ? null : v]),
    ) as ProfileInput;
    if (!Object.keys(changed).length) return;
    setSaving(true);
    try {
      setUser(await api.updateProfile(changed));
      toast.success(success);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
        toast.error(err.firstError());
      } else toast.error('Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  return {
    values,
    set,
    errors,
    saving,
    dirty,
    submit,
    reset: () => (setValues(initial), setErrors({})),
  };
}

/* ================================================================== INFORMATIONS */
function InfosSection({ user, variant }: { user: User; variant: Variant }) {
  const initial = useMemo(
    () => ({
      full_name: user.full_name ?? '',
      username: user.username ?? '',
      email: user.email ?? '',
      phone: user.phone ? formatPhone(user.phone).replace('+242 ', '') : '',
      role: user.role,
    }),
    [user],
  );
  const f = useProfileForm(initial);

  return (
    <form onSubmit={(e) => f.submit(e)} noValidate>
      <Card
        title="Informations personnelles"
        description={variant === 'admin' ? 'Ces informations identifient votre compte administrateur.' : 'Elles apparaissent sur vos commandes et vos reçus.'}
        footer={
          <>
            <AnimatePresence>
              {f.dirty && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mr-auto text-[12.5px] text-ink-muted">
                  Modifications non enregistrées
                </motion.span>
              )}
            </AnimatePresence>
            <Button type="button" variant="ghost" size="sm" onClick={f.reset} disabled={!f.dirty || f.saving}>
              Annuler
            </Button>
            <Button type="submit" size="sm" loading={f.saving} disabled={!f.dirty} icon={<Check className="size-4" />}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Nom complet" name="full_name" value={f.values.full_name} onChange={f.set('full_name')} error={f.errors.full_name} autoComplete="name" />
          <div>
            <label htmlFor="username" className="label">
              Nom d'utilisateur
            </label>
            <div
              className={cn(
                'flex overflow-hidden rounded-xl border bg-surface focus-within:border-rouille-500 focus-within:ring-4 focus-within:ring-rouille-500/10',
                f.errors.username ? 'border-rouille-500' : 'border-line',
              )}
            >
              <span className="grid place-items-center border-r border-line bg-surface-2/60 px-3 text-ink-muted">@</span>
              <input
                id="username"
                className="h-12 w-full bg-transparent px-3 text-[15px] text-ink outline-none"
                value={f.values.username}
                onChange={f.set('username')}
                autoComplete="username"
              />
            </div>
            <p className={cn('mt-1.5 text-[12.5px]', f.errors.username ? 'font-medium text-rouille-600' : 'text-ink-muted')}>
              {f.errors.username || 'Sert à vous connecter.'}
            </p>
          </div>
          <Input
            label="E-mail (facultatif)"
            name="email"
            type="email"
            value={f.values.email}
            onChange={f.set('email')}
            error={f.errors.email}
            autoComplete="email"
            placeholder="vous@exemple.cg"
          />
          <div>
            <label htmlFor="phone" className="label">
              Téléphone WhatsApp
            </label>
            <div
              className={cn(
                'flex overflow-hidden rounded-xl border bg-surface focus-within:border-rouille-500 focus-within:ring-4 focus-within:ring-rouille-500/10',
                f.errors.phone ? 'border-rouille-500' : 'border-line',
              )}
            >
              <span className="grid place-items-center border-r border-line bg-surface-2/60 px-3 text-[14px] font-medium text-ink-soft">+242</span>
              <input
                id="phone"
                inputMode="tel"
                className="h-12 w-full bg-transparent px-3 text-[15px] text-ink outline-none"
                value={f.values.phone}
                onChange={f.set('phone')}
                placeholder="06 444 55 66"
                autoComplete="tel-national"
              />
            </div>
            <p className={cn('mt-1.5 text-[12.5px]', f.errors.phone ? 'font-medium text-rouille-600' : 'text-ink-muted')}>
              {f.errors.phone || (variant === 'admin' ? 'Pour être joint par l’équipe.' : 'Pour recevoir vos reçus et le suivi de livraison.')}
            </p>
          </div>
          {variant === 'client' && (
            <Select label="Je suis" name="role" value={f.values.role} onChange={f.set('role')} error={f.errors.role} wrapClassName="sm:col-span-2 sm:max-w-xs">
              <option value="parent">Parent — je commande pour mes enfants</option>
              <option value="eleve">Élève — je commande pour moi</option>
            </Select>
          )}
        </div>
      </Card>
    </form>
  );
}

/* ================================================================== LIVRAISON */
function DeliverySection({ user }: { user: User }) {
  const initial = useMemo(
    () => ({
      default_city: user.default_city ?? '',
      default_address: user.default_address ?? '',
    }),
    [user],
  );
  const f = useProfileForm(initial);

  return (
    <form onSubmit={(e) => f.submit(e, 'Adresse enregistrée')} noValidate>
      <Card
        title="Adresse de livraison"
        description="Elle sera pré-remplie à chaque commande. Vous pourrez toujours la changer au moment de payer."
        footer={
          <>
            <Button type="button" variant="ghost" size="sm" onClick={f.reset} disabled={!f.dirty || f.saving}>
              Annuler
            </Button>
            <Button type="submit" size="sm" loading={f.saving} disabled={!f.dirty} icon={<Check className="size-4" />}>
              Enregistrer l'adresse
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <div>
            <span className="label">Ville</span>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Ville">
              {DELIVERY_CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={f.values.default_city === c}
                  onClick={() =>
                    f.set('default_city')({
                      target: { value: f.values.default_city === c ? '' : c },
                    })
                  }
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border p-4 text-left transition',
                    f.values.default_city === c ? 'border-inverse bg-surface-2/60 ring-1 ring-inverse' : 'border-line hover:border-ink/30',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-9 place-items-center rounded-xl',
                      f.values.default_city === c ? 'bg-inverse text-on-inverse' : 'bg-surface-2 text-ink-soft',
                    )}
                  >
                    <MapPin className="size-4" />
                  </span>
                  <span className="font-semibold text-ink">{c}</span>
                </button>
              ))}
            </div>
            {f.errors.default_city && <p className="mt-1.5 text-[12.5px] font-medium text-rouille-600">{f.errors.default_city}</p>}
          </div>
          <Textarea
            label="Adresse"
            name="default_address"
            value={f.values.default_address}
            onChange={f.set('default_address')}
            error={f.errors.default_address}
            placeholder="Quartier, rue, point de repère (ex. derrière l'église Saint-Pierre)"
            rows={3}
          />
        </div>
      </Card>
    </form>
  );
}

/* ================================================================== SÉCURITÉ */
function SecuritySection({ user }: { user: User }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const empty: PasswordInput = {
    current_password: '',
    password: '',
    password_confirmation: '',
  };
  const [v, setV] = useState(empty);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const hasPassword = user.has_password !== false;
  const strength = passwordStrength(v.password);

  const set = (k: keyof PasswordInput) => (e: { target: { value: string } }) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: '' }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (hasPassword && !v.current_password) local.current_password = 'Indiquez votre mot de passe actuel.';
    if (v.password.length < 8) local.password = 'Au moins 8 caractères.';
    else if (v.password !== v.password_confirmation) local.password_confirmation = 'Les deux mots de passe ne correspondent pas.';
    if (Object.keys(local).length) return setErrors(local);
    setSaving(true);
    try {
      await api.updatePassword(v);
      setV(empty);
      toast.success('Mot de passe modifié. Vos autres appareils ont été déconnectés.');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, val]) => [k, val[0]])));
        toast.error(err.firstError());
      } else toast.error('Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const logoutOthers = async () => {
    setRevoking(true);
    try {
      const { revoked } = await api.logoutOthers();
      toast.success(revoked > 0 ? `${revoked} autre(s) appareil(s) déconnecté(s)` : 'Aucun autre appareil connecté');
    } catch {
      toast.error('Une erreur est survenue.');
    } finally {
      setRevoking(false);
    }
  };

  const pwField = (k: keyof PasswordInput, label: string, auto: string) => (
    <div>
      <label htmlFor={k} className="label">
        {label}
      </label>
      <div
        className={cn(
          'flex overflow-hidden rounded-xl border bg-surface focus-within:border-rouille-500 focus-within:ring-4 focus-within:ring-rouille-500/10',
          errors[k] ? 'border-rouille-500' : 'border-line',
        )}
      >
        <input
          id={k}
          type={show ? 'text' : 'password'}
          className="h-12 w-full bg-transparent px-4 text-[15px] text-ink outline-none"
          value={v[k]}
          onChange={set(k)}
          autoComplete={auto}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="grid w-12 place-items-center text-ink-muted hover:text-ink"
          aria-label={show ? 'Masquer' : 'Afficher'}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {errors[k] && <p className="mt-1.5 text-[12.5px] font-medium text-rouille-600">{errors[k]}</p>}
    </div>
  );

  return (
    <>
      <form onSubmit={submit} noValidate>
        <Card
          title={hasPassword ? 'Changer de mot de passe' : 'Créer un mot de passe'}
          description={
            hasPassword
              ? 'Par sécurité, vos autres appareils seront déconnectés.'
              : 'Votre compte a été créé avec Google : ajoutez un mot de passe pour vous connecter aussi avec votre nom d’utilisateur.'
          }
          footer={
            <Button type="submit" size="sm" loading={saving} icon={<KeyRound className="size-4" />}>
              {hasPassword ? 'Modifier le mot de passe' : 'Créer le mot de passe'}
            </Button>
          }
        >
          <div className="grid gap-5 sm:max-w-md">
            {hasPassword && pwField('current_password', 'Mot de passe actuel', 'current-password')}
            <div>
              {pwField('password', 'Nouveau mot de passe', 'new-password')}
              {v.password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={cn('h-1.5 flex-1 rounded-full transition', i < strength.score ? strength.color : 'bg-surface-2')} />
                    ))}
                  </div>
                  <p className="mt-1 text-[12px] text-ink-muted">{strength.label}</p>
                </div>
              )}
            </div>
            {pwField('password_confirmation', 'Confirmer le nouveau mot de passe', 'new-password')}
          </div>
        </Card>
      </form>

      <Card title="Appareils connectés" description="Vous avez prêté votre téléphone ou utilisé un ordinateur public ? Déconnectez tous les autres appareils.">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" size="sm" onClick={logoutOthers} loading={revoking} icon={<MonitorSmartphone className="size-4" />}>
            Déconnecter les autres appareils
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate('/', { replace: true });
            }}
            icon={<LogOut className="size-4" />}
          >
            Me déconnecter
          </Button>
        </div>
      </Card>
    </>
  );
}

function passwordStrength(p: string) {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  const levels = [
    { label: 'Trop court (8 caractères minimum)', color: 'bg-rouille-500' },
    { label: 'Faible', color: 'bg-rouille-500' },
    { label: 'Correct', color: 'bg-amber-400' },
    { label: 'Bon', color: 'bg-emerald-400' },
    { label: 'Excellent', color: 'bg-emerald-500' },
  ];
  return {
    score: Math.max(score, p.length ? 1 : 0),
    ...levels[p.length < 8 ? 0 : score],
  };
}

/* ================================================================== PRÉFÉRENCES */
function PreferencesSection({ variant }: { variant: Variant }) {
  return (
    <>
      <Card title="Apparence" description="Choisissez l'affichage clair, sombre, ou automatique selon votre appareil.">
        <ThemeToggle expanded />
      </Card>
      <Card title="Raccourcis">
        <div className="grid gap-3 sm:grid-cols-2">
          {(variant === 'client'
            ? [
                {
                  to: '/compte',
                  label: 'Mes commandes et reçus',
                  Icon: Package,
                },
                { to: '/favoris', label: 'Mes favoris', Icon: BadgeCheck },
                {
                  to: '/guide-des-tailles',
                  label: 'Guide des tailles',
                  Icon: UserIcon,
                },
                { to: '/contact', label: 'Contacter Kōlā', Icon: MapPin },
              ]
            : [
                {
                  to: '/admin/commandes?statut=en_attente',
                  label: 'Commandes à traiter',
                  Icon: Package,
                },
                {
                  to: '/admin/catalogue',
                  label: 'Gérer le catalogue',
                  Icon: LayoutDashboard,
                },
                {
                  to: '/admin/clients',
                  label: 'Voir les clients',
                  Icon: UserIcon,
                },
                { to: '/', label: 'Voir la boutique', Icon: MapPin },
              ]
          ).map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-2xl border border-line p-4 text-[14px] font-medium text-ink transition hover:border-ink/30 hover:bg-surface-2/40"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-rouille-600">
                <Icon className="size-4" />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}
