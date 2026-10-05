import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, Eye, EyeOff, GraduationCap, Users } from 'lucide-react';
import { api, API_MODE, ApiError, setToken, type Role } from '../lib/api';
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
    <section className="container-k py-10 sm:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[32px] border border-line bg-surface shadow-[0_30px_80px_-40px_rgba(61,46,31,0.35)] lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-nuit-900 p-10 text-creme-100 lg:flex">
          <div className="absolute inset-0 bg-[url('/images/contact.webp')] bg-cover bg-center opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-nuit-900/40 to-nuit-900" />
          <div className="relative">
            <h2 className="text-4xl leading-tight text-creme-50">Un compte pour commander en toute simplicité.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-creme-200/75">Suivez vos commandes, retrouvez vos tailles et commandez plus vite à chaque rentrée.</p>
          </div>
          <ul className="relative space-y-3">
            {['Suivi de commande en un coup d’œil', 'Tailles et niveaux mémorisés', 'Paiement Airtel Money / MTN MoMo'].map((t) => (
              <li key={t} className="flex items-center gap-3 text-[14.5px]">
                <span className="grid size-6 place-items-center rounded-full bg-rouille-500">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </aside>

        <div className="p-6 sm:p-10">
          <div className="mb-8 grid grid-cols-2 rounded-full bg-surface-2 p-1">
            {(['signup', 'login'] as const).map((m) => (
              <Link
                key={m}
                to={(m === 'signup' ? '/inscription' : '/connexion') + q}
                replace
                className={cn('relative h-10 rounded-full text-center text-[14px] leading-10 font-semibold transition', mode === m ? 'text-ink' : 'text-ink-muted')}
              >
                {mode === m && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-full bg-surface shadow-sm" />}
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

function GoogleButton() {
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
        ou avec un nom d'utilisateur
        <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}

function PasswordInput({ value, onChange, error, label, autoComplete }: { value: string; onChange: (v: string) => void; error?: string; label: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        label={label}
        name="password"
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.full_name = 'Indiquez votre nom et prénom.';
    if (!/^[a-z0-9._-]{3,20}$/.test(u)) errs.username = '3 à 20 caractères : lettres, chiffres, point, tiret ou underscore.';
    if (password.length < 8) errs.password = '8 caractères minimum.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const res = await api.register({ full_name: fullName.trim(), username: u, password, role });
      toast.success(`Bienvenue ${res.user.full_name.split(' ')[0]} !`);
      signIn(res.token, res.user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
      else toast.error(err instanceof Error ? err.message : 'Inscription impossible.');
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
        <PasswordInput label="Mot de passe" value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" />
      </div>
      <Button type="submit" size="lg" className="mt-7 w-full" loading={loading}>
        Créer mon compte
      </Button>
    </form>
  );
}

function LoginForm() {
  const signIn = useAuth((s) => s.signIn);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Saisissez votre nom d'utilisateur et votre mot de passe.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.login({ username: username.trim().toLowerCase(), password });
      toast.success(`Bon retour, ${res.user.full_name.split(' ')[0]} !`);
      signIn(res.token, res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.firstError() : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="text-3xl">Se connecter</h1>
      <p className="mt-1 mb-6 text-[14.5px] text-ink-muted">Retrouvez votre compte Kōlā.</p>
      <GoogleButton />
      <div className="space-y-4">
        <Input label="Nom d'utilisateur" name="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        <PasswordInput label="Mot de passe" value={password} onChange={setPassword} autoComplete="current-password" />
      </div>
      {error && <p className="mt-4 rounded-xl bg-rouille-50 px-4 py-3 text-[13.5px] font-medium text-rouille-600">{error}</p>}
      <Button type="submit" size="lg" className="mt-7 w-full" loading={loading}>
        Se connecter
      </Button>
      {API_MODE === 'mock' && (
        <p className="mt-5 rounded-xl bg-surface-2/70 px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
          <strong>Mode démo</strong> — client : <code>nathalie242</code> / <code>kola1234</code> · admin : <code>admin</code> / <code>admin1234</code>
        </p>
      )}
    </form>
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
