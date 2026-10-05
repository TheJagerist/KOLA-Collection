import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { LayoutGrid, Package, ReceiptText, Store } from 'lucide-react';
import { useAuth } from '../../stores/auth';
import { useStorefront } from '../../hooks/queries';
import { cn } from '../../lib/cn';

const TABS = [
  { to: '/admin', label: 'Commandes', Icon: ReceiptText, end: true },
  { to: '/admin/catalogue', label: 'Catalogue', Icon: Package },
  { to: '/admin/vitrine', label: 'Vitrine', Icon: Store },
  { to: '/admin/collections', label: 'Collections', Icon: LayoutGrid },
];

export default function AdminLayout() {
  const { user, status } = useAuth();
  const { data } = useStorefront();

  if (status !== 'ready') return null;
  if (!user) return <Navigate to="/connexion?next=/admin" replace />;
  if (!user.is_admin) return <Navigate to="/compte" replace />;

  return (
    <div className="min-h-[70vh] bg-surface/40">
      <div className="border-b border-line bg-surface">
        <div className="container-k pt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="kicker mb-2">Administration</div>
              <h1 className="text-3xl sm:text-4xl">Tableau de bord</h1>
            </div>
            {data?.collection && (
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[12.5px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                Collection active : {data.collection.name}
              </span>
            )}
          </div>
          <nav className="-mb-px mt-6 flex gap-1 overflow-x-auto">
            {TABS.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 border-b-2 px-4 py-3 text-[14px] font-medium whitespace-nowrap transition',
                    isActive ? 'border-rouille-500 text-ink' : 'border-transparent text-ink-muted hover:text-ink',
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <div className="container-k py-8 sm:py-10">
        <Outlet />
      </div>
    </div>
  );
}

export function Panel({ title, description, actions, children, className }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[24px] border border-line bg-surface p-5 sm:p-7', className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-[13.5px] text-ink-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
