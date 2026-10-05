import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { ORDER_STATUS } from '../../lib/format';
import type { OrderStatus } from '../../lib/api/types';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-surface-2', className)} />;
}

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const s = ORDER_STATUS[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', s.tone, className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </span>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-surface-2 text-ink-soft">{icon}</div>}
      <h3 className="text-xl">{title}</h3>
      {children && <p className="mt-2 max-w-sm text-[15px] text-ink-muted">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageHeader({ kicker, title, children, className }: { kicker?: string; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={cn('border-b border-line/70 bg-surface/50', className)}>
      <div className="container-k py-10 sm:py-14">
        {kicker && <div className="kicker mb-3">{kicker}</div>}
        <h1 className="max-w-3xl text-3xl leading-[1.1] sm:text-[44px]">{title}</h1>
        {children && <div className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft sm:text-base">{children}</div>}
      </div>
    </header>
  );
}

export function Logo({ variant = 'dark', className }: { variant?: 'dark' | 'light'; className?: string }) {
  return <img src={variant === 'dark' ? '/logo-dark.png' : '/logo-light.png'} alt="Kōlā Collection" className={cn('h-9 w-auto select-none', className)} draggable={false} />;
}

export function Chip({ active, children, onClick, className }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-9 rounded-full border px-4 text-[13px] font-medium transition',
        active ? 'border-inverse bg-inverse text-on-inverse' : 'border-line bg-surface text-ink-soft hover:border-ink-muted',
        className,
      )}
    >
      {children}
    </button>
  );
}
