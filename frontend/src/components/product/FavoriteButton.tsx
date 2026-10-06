import { motion, AnimatePresence } from 'motion/react';
import { Heart } from 'lucide-react';
import { useFavorites } from '../../stores/favorites';
import { toast } from '../../stores/toast';
import { cn } from '../../lib/cn';

export function FavoriteButton({ productId, name, className, size = 'md' }: { productId: number; name: string; className?: string; size?: 'md' | 'lg' }) {
  const active = useFavorites((s) => s.ids.includes(productId));
  const toggle = useFavorites((s) => s.toggle);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Retirer ${name} des favoris` : `Ajouter ${name} aux favoris`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = toggle(productId);
        toast.show(added ? 'Ajouté à vos favoris' : 'Retiré de vos favoris');
      }}
      className={cn(
        'glass-photo relative grid place-items-center rounded-full text-ink transition hover:scale-105 active:scale-90',
        size === 'lg' ? 'size-12' : 'size-10',
        className,
      )}
    >
      <motion.span key={String(active)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
        <Heart className={cn(size === 'lg' ? 'size-5' : 'size-[18px]', active && 'fill-rouille-500 text-rouille-500')} />
      </motion.span>
      <AnimatePresence>
        {active && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0.7 }}
            animate={{ scale: 1.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-rouille-500"
          />
        )}
      </AnimatePresence>
    </button>
  );
}
