import { AnimatePresence, motion } from 'motion/react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePref } from '../../stores/theme';
import { cn } from '../../lib/cn';

const OPTIONS: { v: ThemePref; label: string; Icon: typeof Sun }[] = [
  { v: 'light', label: 'Clair', Icon: Sun },
  { v: 'dark', label: 'Sombre', Icon: Moon },
  { v: 'system', label: 'Auto', Icon: Monitor },
];

export function ThemeToggle({ expanded, className }: { expanded?: boolean; className?: string }) {
  const { pref, setPref } = useTheme();

  if (expanded) {
    return (
      <div className={cn('inline-flex rounded-full bg-surface-2 p-1', className)} role="radiogroup" aria-label="Thème">
        {OPTIONS.map(({ v, label, Icon }) => (
          <button
            key={v}
            role="radio"
            aria-checked={pref === v}
            onClick={() => setPref(v)}
            className={cn('relative flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition', pref === v ? 'text-ink' : 'text-ink-muted')}
          >
            {pref === v && <motion.span layoutId="theme-pill" className="absolute inset-0 rounded-full bg-surface shadow-sm" />}
            <Icon className="relative size-3.5" />
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>
    );
  }

  const idx = OPTIONS.findIndex((o) => o.v === pref);
  const current = OPTIONS[idx];
  const next = OPTIONS[(idx + 1) % OPTIONS.length];
  return (
    <button
      onClick={() => setPref(next.v)}
      className={cn('grid size-10 place-items-center overflow-hidden rounded-full text-ink transition hover:bg-surface-2 active:scale-90', className)}
      aria-label={`Thème : ${current.label}. Passer en ${next.label.toLowerCase()}`}
      title={`Thème : ${current.label}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={current.v} initial={{ y: 14, rotate: -40, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} exit={{ y: -14, rotate: 40, opacity: 0 }} transition={{ duration: 0.2 }}>
          <current.Icon className="size-[19px]" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
