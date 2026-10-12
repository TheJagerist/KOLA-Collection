import { useEffect, useMemo, useState, type ReactNode, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Briques de tableau de l'administration : même rendu sur toutes les pages
 * (en-tête discret, lignes aérées, colonnes qui ne passent pas à la ligne, pagination).
 */

export function TableCard({ toolbar, footer, children, className }: { toolbar?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[20px] border border-line bg-surface shadow-[0_1px_2px_rgba(28,20,13,0.04)]', className)}>
      {toolbar && <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3.5 sm:px-5">{toolbar}</div>}
      {children}
      {footer && <div className="border-t border-line px-4 py-3 sm:px-5">{footer}</div>}
    </section>
  );
}

export function Table({ children, className, minWidth, noScroll }: { children: ReactNode; className?: string; minWidth?: number; noScroll?: boolean }) {
  return (
    <div className={noScroll ? undefined : 'overflow-x-auto'}>
      <table className={cn('w-full border-collapse text-left text-[13.5px]', className)} style={minWidth ? { minWidth } : undefined}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-line bg-surface-2/45">{children}</tr>
    </thead>
  );
}

type SortDir = 'asc' | 'desc';

export function Th({
  children,
  align = 'left',
  className,
  sort,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center'; sort?: { active: boolean; dir: SortDir; onClick: () => void } }) {
  const content = sort ? (
    <button
      type="button"
      onClick={sort.onClick}
      className={cn('inline-flex items-center gap-1 uppercase transition hover:text-ink', sort.active && 'text-ink', align === 'right' && 'flex-row-reverse')}
    >
      {children}
      {sort.active ? sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-40" />}
    </button>
  ) : (
    <span className="inline-flex items-center gap-1">{children}</span>
  );
  return (
    <th
      scope="col"
      className={cn(
        'h-11 px-3 text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-ink-muted uppercase first:pl-5 last:pr-5',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...rest}
    >
      {content}
    </th>
  );
}

export function Tr({ children, onClick, className, active }: { children: ReactNode; onClick?: () => void; className?: string; active?: boolean }) {
  return (
    <tr
      onClick={onClick}
      className={cn('border-b border-line/70 transition last:border-0', onClick && 'cursor-pointer', active ? 'bg-surface-2/60' : 'hover:bg-surface-2/40', className)}
    >
      {children}
    </tr>
  );
}

export function Td({ children, align = 'left', className, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <td
      className={cn('h-[68px] px-3 align-middle whitespace-nowrap first:pl-5 last:pr-5', align === 'right' && 'text-right', align === 'center' && 'text-center', className)}
      {...rest}
    >
      {children}
    </td>
  );
}

/** Texte principal + ligne secondaire dans une cellule */
export function CellStack({ title, sub, mono }: { title: ReactNode; sub?: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0 leading-tight">
      <div className={cn('truncate font-medium text-ink', mono && 'font-mono text-[12.5px] font-semibold tracking-tight')}>{title}</div>
      {sub && <div className="mt-1 truncate text-[12px] text-ink-muted">{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ TRI */
export function useSort<T, K extends string>(list: T[], initial: { key: NoInfer<K>; dir: SortDir }, getters: Record<K, (row: T) => string | number>) {
  const [sort, setSort] = useState<{ key: K; dir: SortDir }>(initial);
  const sorted = useMemo(() => {
    const get = getters[sort.key];
    return [...list].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fr');
      return sort.dir === 'asc' ? r : -r;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, sort]);
  const by = (key: K) => ({
    active: sort.key === key,
    dir: sort.dir,
    onClick: () => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })),
  });
  return { sorted, by };
}

/* ------------------------------------------------------------------ PAGINATION */
export function usePagination<T>(list: T[], pageSize = 15, resetKey?: unknown) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  useEffect(() => setPage(1), [resetKey]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const from = (page - 1) * pageSize;
  return { rows: list.slice(from, from + pageSize), page, pageCount, setPage, from: list.length ? from + 1 : 0, to: Math.min(from + pageSize, list.length), total: list.length };
}

export function Pagination({ page, pageCount, setPage, from, to, total, unit = 'résultat' }: ReturnType<typeof usePagination> & { unit?: string }) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
      <span className="text-ink-muted">
        {total === 0 ? `Aucun ${unit}` : `${from}–${to} sur ${total} ${unit}${total > 1 ? 's' : ''}`}
      </span>
      {pageCount > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <PageBtn onClick={() => setPage(page - 1)} disabled={page === 1} label="Page précédente">
            <ChevronLeft className="size-4" />
          </PageBtn>
          {pages.map((p, i) => (
            <span key={p} className="flex items-center gap-1">
              {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-ink-muted">…</span>}
              <PageBtn onClick={() => setPage(p)} active={p === page} label={`Page ${p}`}>
                {p}
              </PageBtn>
            </span>
          ))}
          <PageBtn onClick={() => setPage(page + 1)} disabled={page === pageCount} label="Page suivante">
            <ChevronRight className="size-4" />
          </PageBtn>
        </nav>
      )}
    </div>
  );
}

function PageBtn({ children, onClick, disabled, active, label }: { children: ReactNode; onClick: () => void; disabled?: boolean; active?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'grid h-8 min-w-8 place-items-center rounded-lg px-2 font-medium tabular-nums transition disabled:opacity-30',
        active ? 'bg-inverse text-on-inverse' : 'text-ink-soft hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ EXPORT CSV */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // « ; » + BOM : s'ouvre directement et proprement dans Excel en français
  const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
