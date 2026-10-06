import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToasts } from '../../stores/toast';
import { cn } from '../../lib/cn';

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'error' ? AlertCircle : Info;
          return (
            <motion.button
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              onClick={() => dismiss(t.id)}
              className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-brun-900/80 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 text-left text-sm text-creme-100 shadow-xl"
            >
              <Icon className={cn('size-5 shrink-0', t.tone === 'success' ? 'text-emerald-400' : t.tone === 'error' ? 'text-rouille-400' : 'text-kaki-300')} />
              {t.message}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
