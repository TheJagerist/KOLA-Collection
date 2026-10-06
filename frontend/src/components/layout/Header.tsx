import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useAnimationControls } from 'motion/react';
import { ArrowRight, Heart, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useCart, cartTotals } from '../../stores/cart';
import { useAuth } from '../../stores/auth';
import { useUi } from '../../stores/ui';
import { useFavorites } from '../../stores/favorites';
import { Logo } from '../ui/misc';
import { ThemeToggle } from './ThemeToggle';
import { Socials } from './Footer';
import { WhatsAppIcon } from '../ui/icons';
import { contactWhatsAppLink } from '../../lib/whatsapp';
import { cn } from '../../lib/cn';

const NAV = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/guide-des-tailles', label: 'Guide des tailles' },
  { to: '/a-propos', label: 'À propos' },
  { to: '/contact', label: 'Contact' },
];

const ANNOUNCEMENTS = [
  <>
    Ensemble, préparons la rentrée scolaire <strong className="ml-1 font-semibold text-kaki-300">2026–2027</strong>
  </>,
  'Livraison à Brazzaville et Pointe-Noire',
  'Paiement Airtel Money & MTN Mobile Money',
  '50 % à la commande, le solde à la livraison',
  'Uniformes conformes au règlement scolaire',
];

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const { pathname } = useLocation();
  const count = cartTotals(useCart((s) => s.lines)).count;
  const favCount = useFavorites((s) => s.ids.length);
  const user = useAuth((s) => s.user);
  const { openCart, setSearch, cartPulse } = useUi();
  const bag = useAnimationControls();

  useEffect(() => setOpen(false), [pathname]);

  // En-tête « intelligent » : se cache quand on descend, revient quand on remonte
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setHidden(y > 240 && y > lastY.current + 4);
      if (y < lastY.current - 4 || y < 240) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Petit rebond de l'icône panier à chaque ajout
  useEffect(() => {
    if (cartPulse) bag.start({ scale: [1, 1.25, 0.92, 1.06, 1], rotate: [0, -10, 8, -4, 0], transition: { duration: 0.6 } });
  }, [cartPulse, bag]);

  return (
    <>
      <div className="overflow-hidden bg-brun-900 text-creme-200" aria-label="Annonces">
        <div className="flex h-9 w-max animate-marquee items-center hover:[animation-play-state:paused]">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
              {ANNOUNCEMENTS.map((a, i) => (
                <span key={i} className="flex items-center text-[12.5px] tracking-wide whitespace-nowrap">
                  {a}
                  <span className="mx-8 text-kaki-300/50">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <motion.header
        animate={{ y: hidden && !open ? '-100%' : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'sticky top-0 z-40 border-b transition-colors duration-300',
          scrolled ? 'glass' : 'border-transparent bg-page',
        )}
      >
        <div className="container-k flex h-16 items-center justify-between gap-4 sm:h-[72px]">
          <Link to="/" aria-label="Kōlā Collection — accueil" className="shrink-0">
            <Logo className="h-8 dark:hidden sm:h-9" />
            <Logo variant="light" className="hidden h-8 dark:block sm:h-9" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn('relative rounded-full px-4 py-2 text-[14px] font-medium transition', isActive ? 'text-ink' : 'text-ink-soft hover:text-ink')
                }
              >
                {({ isActive }) => (
                  <>
                    {n.label}
                    {isActive && (
                      <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-surface-2" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setSearch(true)}
              className="hidden h-10 items-center gap-2 rounded-full border border-line bg-surface pr-2 pl-3.5 text-[13.5px] text-ink-muted transition hover:border-ink-muted hover:text-ink md:flex"
              aria-label="Rechercher"
            >
              <Search className="size-4" />
              <span className="pr-6">Rechercher</span>
              <kbd className="rounded-md border border-line bg-page px-1.5 py-0.5 font-sans text-[11px]">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            <IconLink onClick={() => setSearch(true)} label="Rechercher" className="md:hidden">
              <Search className="size-[19px]" />
            </IconLink>
            <ThemeToggle className="max-sm:hidden" />
            <IconLink to="/favoris" label={`Favoris (${favCount})`} className="max-sm:hidden" badge={favCount}>
              <Heart className="size-[19px]" />
            </IconLink>
            <IconLink to={user ? '/compte' : '/connexion'} label={user ? 'Mon compte' : 'Se connecter'}>
              {user ? (
                <span className="grid size-7 place-items-center rounded-full bg-rouille-500 text-[12px] font-bold text-white">{user.full_name.charAt(0).toUpperCase()}</span>
              ) : (
                <UserRound className="size-[19px]" />
              )}
            </IconLink>
            <motion.button
              animate={bag}
              onClick={openCart}
              className="relative hidden h-10 items-center gap-2 rounded-full bg-inverse pr-3 pl-3.5 text-[14px] font-medium text-on-inverse transition hover:opacity-90 sm:flex"
              aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`}
            >
              <ShoppingBag className="size-[18px]" />
              <span>Panier</span>
              <motion.span
                key={count}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
                className={cn('grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold', count ? 'bg-rouille-500 text-white' : 'bg-on-inverse/15')}
              >
                {count}
              </motion.span>
            </motion.button>
            <button className="grid size-10 place-items-center rounded-full text-ink transition hover:bg-surface-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
              <Menu className="size-6" />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-brun-950/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.5 }}
              onDragEnd={(_, i) => (i.offset.x > 100 || i.velocity.x > 500) && setOpen(false)}
              className="glass absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col border-l"
            >
              <div className="flex h-16 items-center justify-between border-b border-line px-5">
                <Logo className="h-7 dark:hidden" />
                <Logo variant="light" className="hidden h-7 dark:block" />
                <button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full text-ink hover:bg-surface-2" aria-label="Fermer le menu">
                  <X className="size-6" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-4">
                {[...NAV, { to: '/favoris', label: 'Mes favoris' }, { to: user ? '/compte' : '/connexion', label: user ? 'Mon compte' : 'Se connecter' }].map((n, i) => (
                  <motion.div key={n.to} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.04 }}>
                    <NavLink
                      to={n.to}
                      end={'end' in n ? n.end : false}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center justify-between rounded-2xl px-4 py-3.5 font-display text-xl transition',
                          isActive ? 'bg-surface-2 text-ink' : 'text-ink hover:bg-surface-2/60',
                        )
                      }
                    >
                      {n.label}
                      <ArrowRight className="size-4 opacity-40" />
                    </NavLink>
                  </motion.div>
                ))}
              </nav>
              {/* Remplace le footer sur mobile : contact, réseaux, mentions légales */}
              <div className="space-y-4 border-t border-line p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <a
                  href={contactWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3.5 transition active:scale-[0.98]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#25D366] text-white">
                    <WhatsAppIcon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-ink">Une question ?</span>
                    <span className="block text-[12.5px] text-ink-muted">On vous répond sur WhatsApp</span>
                  </span>
                </a>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-ink-soft">Apparence</span>
                  <ThemeToggle expanded />
                </div>
                <div className="flex items-center justify-between">
                  <Socials size="sm" />
                </div>
                <div className="flex items-center justify-between text-[12px] text-ink-muted">
                  <span>© {new Date().getFullYear()} Kōlā Collection</span>
                  <Link to="/mentions-legales" className="underline-offset-4 hover:underline">
                    Mentions légales
                  </Link>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function IconLink({ to, onClick, label, badge, className, children }: { to?: string; onClick?: () => void; label: string; badge?: number; className?: string; children: React.ReactNode }) {
  const cls = cn('relative grid size-10 place-items-center rounded-full text-ink transition hover:bg-surface-2 active:scale-90', className);
  const content = (
    <>
      {children}
      {!!badge && (
        <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-rouille-500 px-1 text-[10px] font-bold text-white">{badge}</span>
      )}
    </>
  );
  return to ? (
    <Link to={to} className={cls} aria-label={label} title={label}>
      {content}
    </Link>
  ) : (
    <button onClick={onClick} className={cls} aria-label={label} title={label}>
      {content}
    </button>
  );
}
