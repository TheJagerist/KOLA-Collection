import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Home, LayoutGrid, Search, ShoppingBag } from 'lucide-react';
import { useUi } from '../../stores/ui';
import { cartTotals, useCart } from '../../stores/cart';
import { useFavorites } from '../../stores/favorites';
import { cn } from '../../lib/cn';

/** Pages où la barre du bas laisse la place à une action principale (achat, paiement…) */
const HIDDEN_ON = [/^\/produit\//, /^\/commande/, /^\/admin/, /^\/connexion/, /^\/inscription/];

export function BottomNav() {
  const { pathname } = useLocation();
  const { setSearch, openCart, cartPulse } = useUi();
  const count = cartTotals(useCart((s) => s.lines)).count;
  const favs = useFavorites((s) => s.ids.length);
  if (HIDDEN_ON.some((r) => r.test(pathname))) return null;

  const item = 'relative flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition active:scale-90';

  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] sm:hidden"
      aria-label="Navigation mobile"
    >
      <div className="flex h-16 items-stretch">
        {[
          { to: '/', label: 'Accueil', Icon: Home, end: true },
          { to: '/catalogue', label: 'Catalogue', Icon: LayoutGrid },
        ].map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cn(item, isActive ? 'text-rouille-600 dark:text-rouille-400' : 'text-ink-muted')}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="bnav" className="absolute top-0 h-0.5 w-8 rounded-full bg-rouille-500" />}
                <Icon className="size-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
        <button onClick={() => setSearch(true)} className={cn(item, 'text-ink-muted')}>
          <span className="-mt-6 grid size-12 place-items-center rounded-full bg-rouille-500 text-white shadow-[0_8px_20px_-6px_rgba(201,98,46,0.8)] ring-4 ring-page">
            <Search className="size-5" />
          </span>
          Rechercher
        </button>
        <NavLink to="/favoris" className={({ isActive }) => cn(item, isActive ? 'text-rouille-600 dark:text-rouille-400' : 'text-ink-muted')}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="bnav" className="absolute top-0 h-0.5 w-8 rounded-full bg-rouille-500" />}
              <span className="relative">
                <Heart className="size-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
                {favs > 0 && <Badge n={favs} />}
              </span>
              Favoris
            </>
          )}
        </NavLink>
        <button onClick={openCart} className={cn(item, 'text-ink-muted')} aria-label={`Panier, ${count} articles`}>
          <motion.span key={cartPulse} animate={cartPulse ? { scale: [1, 1.3, 0.9, 1], rotate: [0, -12, 8, 0] } : undefined} transition={{ duration: 0.5 }} className="relative">
            <ShoppingBag className="size-[22px]" strokeWidth={1.8} />
            {count > 0 && <Badge n={count} />}
          </motion.span>
          Panier
        </button>
      </div>
    </nav>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <motion.span
      key={n}
      initial={{ scale: 0.3 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 14 }}
      className="absolute -top-1.5 -right-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rouille-500 px-1 text-[10px] font-bold text-white ring-2 ring-page"
    >
      {n}
    </motion.span>
  );
}
