import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, MotionConfig, useScroll, useSpring } from 'motion/react';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';
import { CartDrawer } from '../cart/CartDrawer';
import { SearchPalette } from '../search/SearchPalette';
import { QuickView } from '../product/AddToCartDialog';
import { useUi } from '../../stores/ui';

export function Layout() {
  const { pathname, hash } = useLocation();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    // Ferme les panneaux ouverts lors d'un changement de page
    const ui = useUi.getState();
    ui.closeCart();
    ui.closeQuickView();
    ui.setSearch(false);

    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh flex-col">
        <motion.div className="fixed inset-x-0 top-0 z-[55] h-[3px] origin-left bg-gradient-to-r from-rouille-500 to-kaki-300" style={{ scaleX: progress }} aria-hidden />
        <a href="#contenu" className="sr-only z-[80] rounded-full bg-inverse px-4 py-2 text-on-inverse focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          Aller au contenu
        </a>
        <Header />
        <motion.main
          id="contenu"
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1"
        >
          <Outlet />
        </motion.main>
        <Footer />
        <div className="h-[calc(4rem+env(safe-area-inset-bottom))] sm:hidden" aria-hidden />
        <BottomNav />
        <CartDrawer />
        <SearchPalette />
        <QuickView />
      </div>
    </MotionConfig>
  );
}
