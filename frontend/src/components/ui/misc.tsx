import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { ORDER_STATUS, PAYMENT_STATE, paymentState } from '../../lib/format';
import type { Order, OrderStatus } from '../../lib/api/types';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-surface-2', className)} />;
}

const STATUS_SHORT: Record<OrderStatus, string> = { en_attente: 'En attente', validee: 'Validée', transit: 'En livraison', livre: 'Livrée', annulee: 'Annulée' };

export function StatusBadge({ status, className, short }: { status: OrderStatus; className?: string; short?: boolean }) {
  const s = ORDER_STATUS[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset', s.tone, className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {short ? STATUS_SHORT[status] : s.label}
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

/** Statut du paiement : Impayé / Acompte payé / Payé / Annulée */
export function PaymentBadge({ order, className }: { order: Pick<Order, 'status' | 'balance_paid'>; className?: string }) {
  const s = PAYMENT_STATE[paymentState(order)];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide whitespace-nowrap uppercase ring-1 ring-inset', s.tone, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

/**
 * Le serveur (API Laravel) ne répond pas ou renvoie une erreur.
 * En développement, on rappelle comment démarrer l'API.
 */
export function ServerError({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const status = (error as { status?: number } | null)?.status ?? 0;
  const down = status === 0 || status >= 500;
  return (
    <div className={cn('flex flex-col items-center rounded-3xl border border-dashed border-rouille-500/40 bg-rouille-50/40 text-center dark:bg-rouille-500/5', compact ? 'px-5 py-8' : 'px-6 py-14')}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-rouille-50 text-2xl dark:bg-rouille-500/15">⚠️</div>
      <h3 className="text-xl">{down ? 'Le serveur ne répond pas' : 'Impossible de charger les articles'}</h3>
      <p className="mt-2 max-w-md text-[15px] text-ink-muted">
        {down ? 'Les articles n’ont pas pu être chargés. Vérifiez votre connexion puis réessayez.' : (error as Error)?.message}
      </p>
      {import.meta.env.DEV && down && (
        <p className="mt-3 max-w-md rounded-xl bg-surface px-4 py-2.5 text-left font-mono text-[12.5px] text-ink-soft">
          Dev : l’API Laravel n’est pas démarrée.
          <br />→ Docker Desktop ouvert, puis <strong>docker compose up -d</strong>
        </p>
      )}
      {onRetry && (
        <button onClick={onRetry} className="mt-6 h-11 rounded-full border border-ink/15 px-5 text-[14px] font-semibold text-ink transition hover:bg-ink/5">
          Réessayer
        </button>
      )}
    </div>
  );
}
