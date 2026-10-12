import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronRight, Eye, EyeOff, Fingerprint, GraduationCap, KeyRound, Loader2, Mail, MessageSquareText, ReceiptText, Smartphone, UserRound, Users } from 'lucide-react';
import { api, API_MODE, ApiError, setToken, type AuthResponse, type LoginCodeSent, type Role } from '../lib/api';
import { passkeysSupported, signInWithPasskey } from '../lib/passkey';
import { Logo } from '../components/ui/misc';
import { useAuth } from '../stores/auth';
import { toast } from '../stores/toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { GoogleIcon } from '../components/ui/icons';
import { cn } from '../lib/cn';

function useNext() {
  const [params] = useSearchParams();
  const next = params.get('next');
  return next && next.startsWith('/') ? next : '/compte';
}

export default function AuthPage() {
  const { pathname } = useLocation();
  const mode = pathname === '/inscription' ? 'signup' : 'login';
  const user = useAuth((s) => s.user);
  const next = useNext();
  const [params] = useSearchParams();

  // Point de redirection unique après connexion / inscription
  if (user) return <Navigate to={user.is_admin && next === '/compte' ? '/admin' : next} replace />;

  const q = params.toString() ? `?${params}` : '';

  return (
    <section className="container-k py-8 sm:py-14">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[32px] border border-line bg-surface shadow-[0_30px_80px_-40px_rgba(61,46,31,0.35)] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative hidden min-h-[640px] flex-col justify-between overflow-hidden bg-brun-900 p-10 text-creme-100 lg:flex">
          <img src={mode === 'signup' ? '/images/ensemble-fille.webp' : '/images/ensemble-garcon.webp'} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-b from-brun-900/30 via-brun-900/55 to-brun-900" />
          <div className="relative">
            <Logo variant="light" className="h-10" />
            <h2 className="mt-10 text-[40px] leading-[1.08] text-creme-50">{mode === 'signup' ? 'Préparez la rentrée en quelques minutes.' : 'Heureux de vous revoir.'}</h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-creme-200/80">
              {mode === 'signup' ? 'Un compte pour commander, suivre la livraison et retrouver vos reçus.' : 'Connectez-vous comme vous préférez : mot de passe, code reçu par SMS ou e-mail, ou simplement votre empreinte.'}
            </p>
          </div>
          <ul className="relative space-y-3.5">
            {(
              [
                [Fingerprint, 'Empreinte ou Face ID sur votre téléphone'],
                [MessageSquareText, 'Code de connexion par SMS ou e-mail'],
                [ReceiptText, 'Reçus et suivi de commande par e-mail'],
              ] as const
            ).map(([Icon, t]) => (
              <li key={t} className="flex items-center gap-3 text-[14.5px]">
                <span className="grid size-8 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur">
                  <Icon className="size-4 text-rouille-400" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </aside>

        <div className="p-6 sm:p-10">
          <div className="mb-8 grid grid-cols-2 rounded-full bg-surface-2 p-1">
            {(['login', 'signup'] as const).map((m) => (
              <Link
                key={m}
                to={(m === 'signup' ? '/inscription' : '/connexion') + q}
                replace
                className={cn('relative h-10 rounded-full text-center text-[14px] leading-10 font-semibold transition', mode === m ? 'text-ink' : 'text-ink-muted hover:text-ink')}
              >
                {mode === m && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-full bg-surface shadow-sm ring-1 ring-line" />}
                <span className="relative">{m === 'signup' ? 'Créer un compte' : 'Se connecter'}</span>
              </Link>
            ))}
          </div>
          {mode === 'signup' ? <SignupForm /> : <LoginForm />}
        </div>
      </div>
    </section>
  );
}

/** Bouton masqué tant que la connexion Google n'est pas configurée côté Laravel (VITE_GOOGLE_AUTH=true pour l'afficher) */
const GOOGLE_ENABLED = import.meta.env.VITE_GOOGLE_AUTH === 'true';

function GoogleButton() {
  if (!GOOGLE_ENABLED) return null;
  const onClick = () => {
    if (API_MODE === 'mock') {
      toast.show('Connexion Google disponible une fois l’API Laravel branchée.');
      return;
    }
    window.location.href = api.googleRedirectUrl();
  };
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-surface text-[14.5px] font-semibold text-ink transition hover:border-ink-muted"
      >
        <GoogleIcon className="size-5" />
        Continuer avec Google
      </button>
      <div className="my-6 flex items-center gap-4 text-[12.5px] text-ink-muted">
        <span className="h-px flex-1 bg-line" />
        ou avec votre identifiant
        <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}

function PasswordInput({
  value,
  onChange,
  error,
  label,
  autoComplete,
  name = 'password',
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label: string;
  autoComplete: string;
  name?: string;
  hint?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        label={label}
        name={name}
        hint={hint}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        autoComplete={autoComplete}
        className="pr-12"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-[30px] right-2 grid size-9 place-items-center rounded-full text-ink-muted hover:text-ink"
        aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function SignupForm() {
  const signIn = useAuth((s) => s.signIn);
  const [role, setRole] = useState<Role>('parent');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    const ph = phone.replace(/\D/g, '').replace(/^(00)?242/, '');
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.full_name = 'Indiquez votre nom et prénom.';
    if (!/^[a-z0-9._-]{3,20}$/.test(u)) errs.username = '3 à 20 caractères : lettres, chiffres, point, tiret ou underscore.';
    if (password.length < 8) errs.password = '8 caractères minimum.';
    if (!confirm) errs.password_confirmation = 'Retapez votre mot de passe.';
    else if (confirm !== password) errs.password_confirmation = 'Les deux mots de passe ne correspondent pas.';
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) errs.email = 'Adresse e-mail invalide.';
    if (!ph) errs.phone = 'Indiquez votre numéro de téléphone.';
    else if (!/^0\d{8}$/.test(ph)) errs.phone = 'Numéro à 9 chiffres, ex. 06 444 55 66.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const res = await api.register({ full_name: fullName.trim(), username: u, password, password_confirmation: confirm, role, phone: ph, email: email.trim() || null });
      toast.success(`Bienvenue ${res.user.full_name.split(' ')[0]} !`);
      signIn(res.token, res.user, { offerPasskey: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const e2 = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]]));
        // « confirmed » est rapporté sur le champ mot de passe par Laravel : on l'affiche sous la confirmation
        if (e2.password && /correspondent/.test(e2.password)) {
          e2.password_confirmation = e2.password;
          delete e2.password;
        }
        setErrors(e2);
      } else toast.error(err instanceof Error ? err.message : 'Inscription impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="text-3xl">Créer mon compte</h1>
      <p className="mt-1 mb-6 text-[14.5px] text-ink-muted">Quelques informations pour démarrer.</p>

      <div className="mb-6 grid grid-cols-2 gap-3">
        {(
          [
            { v: 'parent', t: 'Parent', d: 'Je commande pour mes enfants', Icon: Users },
            { v: 'eleve', t: 'Élève', d: 'Je commande pour moi', Icon: GraduationCap },
          ] as const
        ).map(({ v, t, d, Icon }) => (
          <button
            key={v}
            type="button"
            onClick={() => setRole(v)}
            className={cn('rounded-2xl border-2 p-4 text-left transition', role === v ? 'border-inverse bg-surface' : 'border-line hover:border-ink-muted')}
          >
            <Icon className={cn('size-5', role === v ? 'text-rouille-500' : 'text-ink-muted')} />
            <div className="mt-2 font-semibold">{t}</div>
            <div className="text-[12.5px] leading-snug text-ink-muted">{d}</div>
          </button>
        ))}
      </div>

      <GoogleButton />

      <div className="space-y-4">
        <Input label="Nom et prénom" name="full_name" placeholder="Ex. Nathalie Mbemba" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.full_name} autoComplete="name" />
        <Input
          label="Nom d'utilisateur"
          name="username"
          placeholder="Ex. nathalie242"
          maxLength={20}
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          hint="3 à 20 caractères : lettres, chiffres, point, tiret ou underscore."
          autoComplete="username"
        />
        <div className="relative">
          <Input
            label="Téléphone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="06 444 55 66"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
            hint="Pour la livraison, WhatsApp et la connexion par code SMS."
            autoComplete="tel-national"
            className="pl-[68px]"
            required
          />
          <span className="pointer-events-none absolute top-[30px] left-px grid h-[46px] w-[56px] place-items-center rounded-l-xl border-r border-line bg-surface-2/60 text-[14px] font-medium text-ink-soft">+242</span>
        </div>
        <Input
          label="E-mail (facultatif)"
          name="email"
          type="email"
          inputMode="email"
          placeholder="vous@exemple.cg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          hint="Pour recevoir vos reçus et le suivi de commande par e-mail."
          autoComplete="email"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput label="Mot de passe" value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" hint="8 caractères minimum." />
          <PasswordInput
            label="Confirmer le mot de passe"
            name="password_confirmation"
            value={confirm}
            onChange={setConfirm}
            error={errors.password_confirmation}
            autoComplete="new-password"
            hint={confirm && confirm === password ? <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ Les mots de passe correspondent</span> : undefined}
          />
        </div>
      </div>
      <Button type="submit" size="lg" className="mt-7 w-full" loading={loading}>
        Créer mon compte
      </Button>
      <p className="mt-4 text-center text-[12.5px] text-ink-muted">Vous pourrez activer la connexion par empreinte juste après.</p>
    </form>
  );
}

type Method = 'password' | 'code';

/** Icône selon ce que la personne tape : e-mail, téléphone ou nom d'utilisateur */
function loginKind(v: string): 'email' | 'phone' | 'username' | null {
  const t = v.trim();
  if (!t) return null;
  if (t.includes('@')) return 'email';
  if (/^[\d\s().+-]+$/.test(t) && t.replace(/\D/g, '').length >= 3) return 'phone';
  return 'username';
}

function LoginForm() {
  const signIn = useAuth((s) => s.signIn);
  const [login, setLogin] = useState('');
  const [method, setMethod] = useState<Method>('password');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<LoginCodeSent | null>(null);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [canPasskey, setCanPasskey] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const kind = loginKind(login);

  useEffect(() => {
    setCanPasskey(passkeysSupported());
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const welcome = (res: AuthResponse, offer: boolean) => {
    toast.success(`Bon retour, ${res.user.full_name.split(' ')[0]} !`);
    signIn(res.token, res.user, { offerPasskey: offer });
  };
  const fail = (err: unknown, fallback: string) => setError(err instanceof ApiError ? err.firstError() : fallback);

  const withPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) return setError('Saisissez votre identifiant et votre mot de passe.');
    setLoading(true);
    setError('');
    try {
      welcome(await api.login({ login: login.trim(), password }), true);
    } catch (err) {
      fail(err, 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!login.trim()) return setError('Saisissez votre e-mail, votre téléphone ou votre nom d’utilisateur.');
    setLoading(true);
    setError('');
    try {
      const r = await api.requestLoginCode(login.trim());
      setSent(r);
      setCode('');
      setCooldown(45);
    } catch (err) {
      fail(err, 'Envoi du code impossible.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (value = code) => {
    if (value.length !== 6) return setError('Le code contient 6 chiffres.');
    setLoading(true);
    setError('');
    try {
      welcome(await api.verifyLoginCode(login.trim(), value), true);
    } catch (err) {
      fail(err, 'Code incorrect.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const withPasskey = async () => {
    setPasskeyLoading(true);
    setError('');
    try {
      welcome(await signInWithPasskey(), false);
    } catch (err) {
      if (!(err instanceof ApiError && err.message === 'Opération annulée.')) fail(err, 'Connexion par empreinte impossible.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const KindIcon = kind === 'email' ? Mail : kind === 'phone' ? Smartphone : UserRound;

  return (
    <div>
      <h1 className="text-3xl">Se connecter</h1>
      <p className="mt-1 mb-6 text-[14.5px] text-ink-muted">Choisissez la méthode la plus pratique pour vous.</p>

      {canPasskey && (
        <>
          <button
            type="button"
            onClick={withPasskey}
            disabled={passkeyLoading}
            className="group flex w-full items-center gap-4 rounded-2xl border border-line bg-surface-2/50 p-3.5 text-left transition hover:border-ink/25 hover:bg-surface-2 disabled:opacity-60"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-inverse text-on-inverse">
              {passkeyLoading ? <Loader2 className="size-5 animate-spin" /> : <Fingerprint className="size-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">Empreinte, Face ID ou code de l’appareil</span>
              <span className="block text-[12.5px] text-ink-muted">Sans mot de passe — si vous l’avez activé sur cet appareil</span>
            </span>
            <ChevronRight className="size-4 text-ink-muted transition group-hover:translate-x-0.5" />
          </button>
          <Divider>ou</Divider>
        </>
      )}

      <GoogleButton />

      {!sent ? (
        <form onSubmit={method === 'password' ? withPassword : sendCode} noValidate>
          <div className="relative">
            <Input
              label="E-mail, téléphone ou nom d'utilisateur"
              name="login"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="vous@exemple.cg ou 06 444 55 66"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              className="pl-11"
            />
            <KindIcon className="pointer-events-none absolute top-[42px] left-3.5 size-[18px] text-ink-muted" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 text-[13px] font-semibold" role="tablist" aria-label="Méthode de connexion">
            {(
              [
                ['password', 'Mot de passe', KeyRound],
                ['code', 'Code par SMS / e-mail', MessageSquareText],
              ] as const
            ).map(([m, l, Icon]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={method === m}
                onClick={() => (setMethod(m), setError(''))}
                className={cn('inline-flex h-9 items-center justify-center gap-1.5 rounded-lg whitespace-nowrap transition max-sm:text-[12.5px]', method === m ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink')}
              >
                <Icon className="size-3.5" />
                {m === 'code' ? (
                  <>
                    <span className="sm:hidden">Code SMS / e-mail</span>
                    <span className="max-sm:hidden">{l}</span>
                  </>
                ) : (
                  l
                )}
              </button>
            ))}
          </div>

          {method === 'password' ? (
            <div className="mt-5">
              <PasswordInput label="Mot de passe" value={password} onChange={setPassword} autoComplete="current-password" />
              <button type="button" onClick={() => (setMethod('code'), setError(''))} className="mt-2 text-[13px] font-semibold text-rouille-600 hover:underline">
                Mot de passe oublié ? Recevoir un code
              </button>
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-surface-2/60 px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">
              Nous vous envoyons un code à 6 chiffres{' '}
              {kind === 'phone' ? 'par SMS' : kind === 'email' ? 'par e-mail' : 'sur l’e-mail ou le téléphone de votre compte'}. Aucun mot de passe à retenir.
            </p>
          )}

          {error && <ErrorBox>{error}</ErrorBox>}
          <Button type="submit" size="lg" className="mt-6 w-full" loading={loading}>
            {method === 'password' ? 'Se connecter' : 'Recevoir mon code'}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
          noValidate
        >
          <div className="flex items-start gap-3 rounded-2xl border border-line p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rouille-50 text-rouille-600 dark:bg-rouille-500/15">
              {sent.channel === 'sms' ? <Smartphone className="size-5" /> : <Mail className="size-5" />}
            </span>
            <div className="min-w-0 text-[13.5px]">
              <div className="font-semibold text-ink">Code envoyé {sent.channel === 'sms' ? 'par SMS' : 'par e-mail'}</div>
              <div className="truncate text-ink-muted">{sent.destination} · valable 10 minutes</div>
            </div>
          </div>

          <label className="label mt-6" htmlFor="otp-0">
            Code à 6 chiffres
          </label>
          <OtpInput
            value={code}
            onChange={(v) => {
              setCode(v);
              setError('');
              if (v.length === 6) verify(v);
            }}
            disabled={loading}
          />
          {sent.dev_code && (
            <p className="mt-3 rounded-xl border border-dashed border-amber-400/60 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              Développement : pas d’envoi réel, votre code est <button type="button" className="font-mono font-bold underline" onClick={() => (setCode(sent.dev_code!), verify(sent.dev_code!))}>{sent.dev_code}</button>
            </p>
          )}
          {error && <ErrorBox>{error}</ErrorBox>}

          <Button type="submit" size="lg" className="mt-6 w-full" loading={loading} disabled={code.length !== 6}>
            Valider
          </Button>
          <div className="mt-4 flex items-center justify-between text-[13px]">
            <button type="button" onClick={() => (setSent(null), setError(''))} className="font-medium text-ink-muted hover:text-ink">
              ← Changer d’identifiant
            </button>
            <button type="button" onClick={() => sendCode()} disabled={cooldown > 0 || loading} className="font-semibold text-rouille-600 hover:underline disabled:text-ink-muted disabled:no-underline">
              {cooldown > 0 ? `Renvoyer dans ${cooldown} s` : 'Renvoyer le code'}
            </button>
          </div>
        </form>
      )}

      {API_MODE === 'mock' && (
        <p className="mt-6 rounded-xl bg-surface-2/70 px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
          <strong>Mode démo</strong> — client : <code>nathalie242</code> / <code>kola1234</code> · admin : <code>admin</code> / <code>admin1234</code>
        </p>
      )}
    </div>
  );
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-4 text-[12.5px] text-ink-muted">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-4 rounded-xl bg-rouille-50 px-4 py-3 text-[13.5px] font-medium text-rouille-600 dark:bg-rouille-500/10">
      {children}
    </p>
  );
}

/** 6 cases pour le code ; le collage d'un code complet et la saisie automatique SMS sont pris en charge */
function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    refs.current[Math.min(value.length, 5)]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const set = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '');
    if (d.length > 1) {
      const v = (value.slice(0, i) + d).slice(0, 6);
      onChange(v);
      refs.current[Math.min(v.length, 5)]?.focus();
      return;
    }
    const chars = value.split('');
    chars[i] = d;
    const v = chars.join('').slice(0, 6);
    onChange(v);
    if (d && i < 5) refs.current[i + 1]?.focus();
  };
  return (
    <div className="flex gap-2 sm:gap-2.5" onPaste={(e) => (e.preventDefault(), set(0, e.clipboardData.getData('text')))}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ''}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) {
              onChange(value.slice(0, i - 1));
              refs.current[i - 1]?.focus();
            }
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? 6 : 1}
          disabled={disabled}
          aria-label={`Chiffre ${i + 1}`}
          className="field h-14 w-0 flex-1 px-0 text-center font-mono text-2xl font-semibold tabular-nums"
        />
      ))}
    </div>
  );
}

/** Retour du flux Google OAuth : /auth/callback?token=... */
export function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const signIn = useAuth((s) => s.signIn);

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');
    if (!token) {
      toast.error(error || 'Connexion Google annulée.');
      navigate('/connexion', { replace: true });
      return;
    }
    setToken(token);
    api
      .me()
      .then((user) => {
        signIn(token, user);
        navigate('/compte', { replace: true });
      })
      .catch(() => {
        toast.error('Connexion Google impossible.');
        navigate('/connexion', { replace: true });
      });
  }, [params, navigate, signIn]);

  return <div className="container-k py-32 text-center text-ink-muted">Connexion en cours…</div>;
}
