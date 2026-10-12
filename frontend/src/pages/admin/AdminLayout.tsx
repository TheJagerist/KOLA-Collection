import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Bell,
  BellRing,
  ChevronRight,
  ClipboardList,
  TicketPercent,
  Truck,
  UsersRound,
  Volume2,
  VolumeX,
  ExternalLink,
  Images,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../stores/auth';
import { qk, useStorefront } from '../../hooks/queries';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { Logo } from '../../components/ui/misc';
import { Avatar } from '../../components/ui/Avatar';
import { ThemeToggle } from '../../components/layout/ThemeToggle';
import { can, roleOf, ROLE_LABEL, type Permission } from '../../lib/staff';
import { toast } from '../../stores/toast';
import type { Order, User } from '../../lib/api/types';

type NavItem = { to: string; label: string; Icon: typeof LayoutDashboard; end?: boolean; badge?: 'pending' | 'prep'; perm?: Permission };

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: 'Pilotage',
    items: [
      { to: '/admin', label: "Vue d'ensemble", Icon: LayoutDashboard, end: true, perm: 'orders' },
      { to: '/admin/commandes', label: 'Commandes', Icon: ReceiptText, badge: 'pending', perm: 'orders' },
      { to: '/admin/clients', label: 'Clients', Icon: Users, perm: 'customers' },
      { to: '/admin/rapports', label: 'Rapports', Icon: BarChart3, perm: 'reports' },
    ],
  },
  {
    title: 'Logistique',
    items: [
      { to: '/admin/preparation', label: 'Préparation', Icon: ClipboardList, badge: 'prep', perm: 'prep' },
      { to: '/admin/livraisons', label: 'Livraisons', Icon: Truck, perm: 'deliveries' },
    ],
  },
  {
    title: 'Boutique',
    items: [
      { to: '/admin/catalogue', label: 'Catalogue', Icon: Package, perm: 'catalogue' },
      { to: '/admin/promotions', label: 'Promotions', Icon: TicketPercent, perm: 'promos' },
      { to: '/admin/vitrine', label: "Vitrine d'accueil", Icon: Images, perm: 'storefront' },
      { to: '/admin/collections', label: 'Collections', Icon: LayoutGrid, perm: 'storefront' },
      { to: '/admin/equipe', label: 'Équipe', Icon: UsersRound, perm: 'team' },
    ],
  },
];

/** Page d'arrivée selon le rôle (un livreur arrive directement sur ses livraisons) */
export function homeFor(user: User | null) {
  return can(user, 'orders') ? '/admin' : '/admin/livraisons';
}

function allowedPath(user: User, path: string) {
  if (path === '/admin/profil') return true;
  const item = NAV.flatMap((g) => g.items).find((i) => i.to === path);
  return !item?.perm || can(user, item.perm);
}

const TITLES: Record<string, { title: string; sub: string }> = {
  '/admin': { title: "Vue d'ensemble", sub: "L'activité de la boutique en un coup d'œil" },
  '/admin/commandes': { title: 'Commandes', sub: 'Suivi des paiements et des livraisons' },
  '/admin/clients': { title: 'Clients', sub: 'Les familles qui commandent sur Kōlā' },
  '/admin/catalogue': { title: 'Catalogue', sub: 'Articles, prix, tailles et visuels' },
  '/admin/vitrine': { title: "Vitrine d'accueil", sub: "Textes et images de la page d'accueil" },
  '/admin/collections': { title: 'Collections', sub: 'Choisir la collection affichée sur le site' },
  '/admin/profil': { title: 'Mon profil', sub: 'Vos informations, votre sécurité et vos préférences' },
  '/admin/rapports': { title: 'Rapports', sub: 'Ventes, articles et encaissements par période' },
  '/admin/preparation': { title: 'Préparation', sub: 'Ce qu’il faut sortir du stock et emballer' },
  '/admin/livraisons': { title: 'Livraisons', sub: 'Tournées, créneaux et confirmations de remise' },
  '/admin/promotions': { title: 'Promotions', sub: 'Codes promo et remises famille' },
  '/admin/equipe': { title: 'Équipe', sub: 'Comptes de l’équipe et leurs accès' },
};

/** Liste des commandes partagée par la sidebar, la cloche et les alertes (rafraîchie toutes les 30 s) */
function useOrdersFeed() {
  const user = useAuth((st) => st.user);
  return useQuery({
    queryKey: qk.admin.orders,
    queryFn: () => api.admin.listOrders(),
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    enabled: can(user, 'orders'),
  });
}

export function usePendingCount() {
  const { data } = useOrdersFeed();
  return (data ?? []).filter((o) => o.status === 'en_attente').length;
}

function usePrepCount() {
  const { data } = useOrdersFeed();
  return (data ?? []).filter((o) => o.status === 'validee').length;
}

/* ------------------------------------------------------------------ ALERTES NOUVELLE COMMANDE */
const SOUND_KEY = 'kola-admin-sound';
const readSound = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
};

/** Petit « ding » à deux notes, sans fichier audio */
function ding() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1318.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.5);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* audio indisponible */
  }
}

function useNewOrderAlerts() {
  const { data } = useOrdersFeed();
  const seen = useRef<number | null>(null);
  const [unseen, setUnseen] = useState<Order[]>([]);
  const [sound, setSoundState] = useState(readSound);
  const navigate = useNavigate();

  useEffect(() => {
    if (!data) return;
    const maxId = data.reduce((m, o) => Math.max(m, o.id), 0);
    if (seen.current === null) {
      seen.current = maxId; // premier chargement : rien n'est « nouveau »
      return;
    }
    const fresh = data.filter((o) => o.id > seen.current! && o.source !== 'manuel');
    seen.current = Math.max(seen.current, maxId);
    if (!fresh.length) return;
    setUnseen((u) => [...fresh, ...u]);
    if (readSound()) ding();
    const first = fresh[0];
    const text = fresh.length === 1 ? `${first.customer?.full_name ?? 'Un client'} · ${first.reference}` : `${fresh.length} nouvelles commandes`;
    toast.success(`Nouvelle commande — ${text}`);
    if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      const n = new Notification('Kōlā · nouvelle commande', { body: text, icon: '/favicon.svg', tag: 'kola-order' });
      n.onclick = () => {
        window.focus();
        navigate(fresh.length === 1 ? `/admin/commandes?q=${first.reference}` : '/admin/commandes?statut=en_attente');
      };
    }
  }, [data, navigate]);

  // Compteur dans l'onglet du navigateur
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, '');
    document.title = unseen.length ? `(${unseen.length}) ${base}` : base;
  }, [unseen.length]);

  const setSound = (on: boolean) => {
    setSoundState(on);
    try {
      localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
    } catch {
      /* stockage indisponible */
    }
    if (on) ding();
  };

  return { unseen, clear: () => setUnseen([]), sound, setSound };
}

type Alerts = ReturnType<typeof useNewOrderAlerts>;

export default function AdminLayout() {
  const { user, status } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const alerts = useNewOrderAlerts();

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  if (status !== 'ready') return <div className="min-h-dvh bg-page" />;
  if (!user) return <Navigate to="/connexion?next=/admin" replace />;
  if (!user.is_admin) return <Navigate to="/compte" replace />;
  const path = pathname.replace(/\/$/, '') || '/admin';
  if (!allowedPath(user, path)) return <Navigate to={homeFor(user)} replace />;

  const meta = TITLES[pathname.replace(/\/$/, '')] ?? TITLES['/admin'];

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-page lg:pl-[272px]">
        {/* Sidebar bureau */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] lg:block">
          <Sidebar />
        </aside>

        {/* Sidebar mobile (tiroir) */}
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-[284px] max-w-[85vw] lg:hidden"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              >
                <Sidebar onClose={() => setOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <Topbar title={meta.title} sub={meta.sub} onMenu={() => setOpen(true)} alerts={alerts} />

        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[1400px] px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-8"
        >
          <Outlet />
        </motion.main>
      </div>
    </MotionConfig>
  );
}

/* ------------------------------------------------------------------ SIDEBAR */
function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, signOut } = useAuth();
  const { data } = useStorefront();
  const pending = usePendingCount();
  const prep = usePrepCount();
  const navigate = useNavigate();
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || can(user, i.perm)) })).filter((g) => g.items.length);
  const role = roleOf(user);

  return (
    <div className="flex h-full flex-col border-r border-white/[0.06] bg-brun-900 text-creme-100">
      <div className="flex h-[72px] items-center justify-between gap-2 px-6">
        <Link to={homeFor(user)} className="flex items-center gap-3">
          <Logo variant="light" className="h-8" />
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-creme-200 uppercase">Admin</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full text-creme-200 hover:bg-white/10" aria-label="Fermer le menu">
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-4 pt-4" aria-label="Administration">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="mb-2 px-3 text-[10.5px] font-semibold tracking-[0.16em] text-creme-200/45 uppercase">{group.title}</div>
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, Icon, end, badge }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition',
                        isActive ? 'bg-white/[0.09] text-white' : 'text-creme-200/70 hover:bg-white/[0.05] hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <motion.span layoutId="admin-nav" className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-rouille-400" />}
                        <Icon className={cn('size-[18px] shrink-0', isActive ? 'text-rouille-400' : 'text-creme-200/50 group-hover:text-creme-200')} />
                        <span className="flex-1">{label}</span>
                        {badge === 'pending' && pending > 0 && (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rouille-500 px-1.5 text-[11px] font-semibold text-white tabular-nums">{pending}</span>
                        )}
                        {badge === 'prep' && prep > 0 && (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white/15 px-1.5 text-[11px] font-semibold text-white tabular-nums">{prep}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-3 p-4">
        {data?.collection && can(user, 'storefront') && (
          <Link to="/admin/collections" className="block rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 transition hover:bg-white/[0.09]">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-creme-200/55 uppercase">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              En ligne
            </div>
            <div className="mt-1.5 text-[14px] font-semibold text-white">{data.collection.name}</div>
          </Link>
        )}
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/12 text-[13px] font-medium text-creme-100 transition hover:bg-white/[0.06]"
        >
          Voir la boutique <ExternalLink className="size-3.5" />
        </a>
        <div className="flex items-center gap-1 rounded-2xl">
          <NavLink
            to="/admin/profil"
            className={({ isActive }) => cn('flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-white/[0.06]', isActive && 'bg-white/[0.09]')}
            title="Mon profil"
          >
            <Avatar user={user} className="size-10 text-[13px]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold text-white">{user?.full_name}</div>
              <div className="truncate text-[12px] text-creme-200/55">{role ? ROLE_LABEL[role] : 'Mon profil'}</div>
            </div>
          </NavLink>
          <button
            onClick={async () => {
              await signOut();
              navigate('/connexion');
            }}
            className="grid size-9 place-items-center rounded-full text-creme-200/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <LogOut className="size-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ TOPBAR */
function Topbar({ title, sub, onMenu, alerts }: { title: string; sub: string; onMenu: () => void; alerts: Alerts }) {
  const navigate = useNavigate();
  const user = useAuth((st) => st.user);
  const pending = usePendingCount();
  const [q, setQ] = useState('');
  const canOrders = can(user, 'orders');

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-page/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <button onClick={onMenu} className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink lg:hidden" aria-label="Ouvrir le menu">
          <Menu className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[12px] text-ink-muted max-sm:hidden">
            Administration <ChevronRight className="size-3" /> <span className="text-ink-soft">{title}</span>
          </div>
          <h1 className="truncate font-display text-xl leading-tight text-ink sm:text-[22px]">{title}</h1>
          <p className="sr-only">{sub}</p>
        </div>

        {canOrders && <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/admin/commandes${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
          }}
          className="relative hidden md:block"
          role="search"
        >
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une commande, un client…"
            aria-label="Rechercher une commande"
            className="h-10 w-72 rounded-xl border border-line bg-surface pr-3 pl-10 text-[13.5px] text-ink placeholder:text-ink-muted focus:border-ink/30 focus:outline-none xl:w-80"
          />
        </form>}

        <ThemeToggle className="max-sm:hidden" />

        {canOrders && <AlertBell alerts={alerts} pending={pending} />}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ CLOCHE */
function AlertBell({ alerts, pending }: { alerts: Alerts; pending: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'denied'));
  const count = alerts.unseen.length;

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const go = (to: string) => {
    setOpen(false);
    alerts.clear();
    navigate(to);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn('relative grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink transition hover:border-ink/25', count > 0 && 'border-rouille-500/50')}
        aria-label={`${count} nouvelle(s) commande(s), ${pending} en attente de paiement`}
        aria-expanded={open}
        title="Alertes"
      >
        {count > 0 ? <BellRing className="size-[18px] animate-[wiggle_1s_ease-in-out_2] text-rouille-600" /> : <Bell className="size-[18px]" />}
        {(count || pending) > 0 && (
          <span className={cn('absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10.5px] font-semibold text-white ring-2 ring-page', count ? 'bg-rouille-500' : 'bg-ink-muted')}>
            {count || pending}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-surface text-[13.5px] shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-semibold text-ink">Alertes</span>
            <button
              onClick={() => alerts.setSound(!alerts.sound)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-ink-muted hover:bg-surface-2 hover:text-ink"
              title={alerts.sound ? 'Couper le son' : 'Activer le son'}
            >
              {alerts.sound ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />} Son {alerts.sound ? 'activé' : 'coupé'}
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {alerts.unseen.length ? (
              alerts.unseen.slice(0, 8).map((o) => (
                <button key={o.id} onClick={() => go(`/admin/commandes?q=${o.reference}`)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2/60">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-rouille-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{o.customer?.full_name ?? 'Client'}</span>
                    <span className="block font-mono text-[11.5px] text-ink-muted">{o.reference}</span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-4 py-5 text-center text-ink-muted">Aucune nouvelle commande depuis l’ouverture.</p>
            )}
          </div>
          <div className="space-y-1 border-t border-line p-2">
            <button onClick={() => go('/admin/commandes?statut=en_attente')} className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-2">
              <span className="text-ink">À encaisser</span>
              <span className="rounded-md bg-surface-2 px-1.5 text-[12px] font-semibold text-ink tabular-nums">{pending}</span>
            </button>
            {perm === 'default' && (
              <button
                onClick={async () => setPerm(await Notification.requestPermission())}
                className="w-full rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-rouille-600 hover:bg-surface-2"
              >
                Recevoir aussi les alertes quand l’onglet est en arrière-plan
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ BRIQUES PARTAGÉES */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-[20px] border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,20,13,0.04)] sm:p-6', className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-[13px] text-ink-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
