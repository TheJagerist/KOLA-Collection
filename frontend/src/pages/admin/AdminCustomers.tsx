import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, Mail, MapPin, Phone, Search, StickyNote, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { fcfa, formatPhone } from '../../lib/format';
import { EmptyState, Skeleton, StatusBadge } from '../../components/ui/misc';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { WhatsAppIcon } from '../../components/ui/icons';
import { timeAgo } from './AdminDashboard';
import { Avatar } from '../../components/ui/Avatar';
import { CellStack, downloadCsv, Pagination, Table, TableCard, Td, Th, THead, Tr, usePagination, useSort } from '../../components/admin/DataTable';

/** Clients : tous les comptes clients (même sans commande) et les clients saisis par téléphone */
export default function AdminCustomers() {
  const { data, isLoading } = useQuery({ queryKey: qk.admin.customers, queryFn: () => api.admin.customers() });
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const customers = useMemo(() => data ?? [], [data]);

  const filtered = customers.filter((c) => {
    const s = q.trim().toLowerCase();
    const d = s.replace(/\D/g, '');
    return !s || c.full_name.toLowerCase().includes(s) || c.username?.toLowerCase().includes(s) || (d.length >= 3 && c.phone?.includes(d));
  });
  const { sorted, by } = useSort(filtered, { key: 'spent', dir: 'desc' }, {
    name: (c) => c.full_name,
    orders: (c) => c.orders_count,
    spent: (c) => c.total_spent,
    last: (c) => c.last_order_at ?? '',
  });
  const pager = usePagination(sorted, 12, q);
  const buyers = customers.filter((c) => c.orders_count > 0);
  const total = buyers.reduce((s, c) => s + c.total_spent, 0);
  const repeat = buyers.filter((c) => c.orders_count > 1).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Mini label="Clients" value={String(customers.length)} hint={`${buyers.length} ont déjà commandé`} />
        <Mini label="Clients fidèles" value={buyers.length ? `${Math.round((repeat / buyers.length) * 100)} %` : '—'} hint="plus d'une commande" />
        <Mini label="Dépense moyenne" value={buyers.length ? fcfa(Math.round(total / buyers.length)) : '—'} />
      </div>

      <TableCard
        toolbar={
          <>
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
              <input className="field h-10 py-0 pl-9" placeholder="Nom, identifiant ou téléphone…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un client" />
            </div>
            <button
              onClick={() =>
                downloadCsv(`clients-kola-${new Date().toISOString().slice(0, 10)}.csv`, [
                  ['Client', 'Identifiant', 'Téléphone', 'E-mail', 'Ville', 'Commandes', 'Dépensé (FCFA)', 'Dernière commande', 'Note interne'],
                  ...sorted.map((c) => [
                    c.full_name,
                    c.username,
                    c.phone ? formatPhone(c.phone) : '',
                    c.email,
                    c.city,
                    c.orders_count,
                    c.total_spent,
                    c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('fr-FR') : '',
                    c.admin_note,
                  ]),
                ])
              }
              disabled={!customers.length}
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3.5 text-[13px] font-semibold text-ink transition hover:border-ink/25 disabled:opacity-40"
            >
              <FileSpreadsheet className="size-4" /> Exporter
            </button>
          </>
        }
        footer={!isLoading && filtered.length > 0 ? <Pagination {...pager} unit="client" /> : undefined}
      >
        {isLoading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<Users className="size-6" />} title="Aucun client trouvé" />
          </div>
        ) : (
          <Table minWidth={720}>
            <THead>
              <Th sort={by('name')}>Client</Th>
              <Th>Téléphone</Th>
              <Th>Ville</Th>
              <Th align="right" sort={by('orders')}>
                Commandes
              </Th>
              <Th align="right" sort={by('spent')}>
                Dépensé
              </Th>
              <Th align="right" sort={by('last')}>
                Dernière commande
              </Th>
            </THead>
            <tbody>
              {pager.rows.map((c) => (
                <Tr key={c.id} onClick={() => setOpenId(c.id)} active={openId === c.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar user={c} className="size-9 text-[12px]" />
                      <CellStack title={c.full_name} sub={c.username ? `@${c.username}` : c.has_account ? undefined : 'Client par téléphone'} />
                      {c.admin_note && <StickyNote className="size-3.5 shrink-0 text-amber-600" aria-label="Note interne" />}
                      {c.pending_count > 0 && (
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-500/15 dark:text-amber-300">{c.pending_count} à encaisser</span>
                      )}
                    </div>
                  </Td>
                  <Td className="text-ink-soft">{c.phone ? formatPhone(c.phone) : '—'}</Td>
                  <Td className="text-ink-soft">{c.city ?? '—'}</Td>
                  <Td align="right" className="text-ink tabular-nums">
                    {c.orders_count}
                  </Td>
                  <Td align="right" className="font-semibold text-ink tabular-nums">
                    {fcfa(c.total_spent)}
                  </Td>
                  <Td align="right" className="text-ink-muted">
                    {c.last_order_at ? timeAgo(c.last_order_at) : 'Jamais'}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </TableCard>

      <Sheet open={openId !== null} onClose={() => setOpenId(null)} title="Fiche client" className="sm:max-w-lg">
        {openId !== null && <CustomerDrawer id={openId} />}
      </Sheet>
    </div>
  );
}

const CAT_LABEL: Record<string, string> = { chemise: 'Chemise', pantalon: 'Pantalon', jupe: 'Jupe', article: 'Article' };

function CustomerDrawer({ id }: { id: number }) {
  const { data: c, isLoading } = useQuery({ queryKey: qk.admin.customer(id), queryFn: () => api.admin.customer(id) });
  const navigate = useNavigate();
  const [note, setNote] = useState<string | null>(null);
  const save = useAdminMutation((v: string) => api.admin.updateCustomerNote(id, v.trim() || null), {
    success: 'Note enregistrée',
    invalidate: [qk.admin.customer(id), qk.admin.customers],
  });

  if (isLoading || !c) {
    return (
      <div className="space-y-3 pb-6">
        <Skeleton className="h-20" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  const value = note ?? c.admin_note ?? '';
  const wa = c.phone ? `https://wa.me/242${c.phone}?text=${encodeURIComponent(`Bonjour ${c.full_name.split(' ')[0]}, c'est Kōlā Collection.`)}` : null;

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-4">
        <Avatar user={c} className="size-16 text-[18px]" />
        <div className="min-w-0">
          <div className="truncate font-display text-xl text-ink">{c.full_name}</div>
          <div className="text-[13px] text-ink-muted">
            {c.username ? `@${c.username} · ` : ''}
            {c.has_account ? `client depuis ${new Date(c.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}` : 'Client par téléphone'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Commandes" value={String(c.orders_count)} />
        <Stat label="Dépensé" value={fcfa(c.total_spent)} />
        <Stat label="À encaisser" value={String(c.pending_count)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {c.phone ? (
          <a href={`tel:+242${c.phone}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink/15 text-[13.5px] font-semibold text-ink hover:bg-ink/5">
            <Phone className="size-4" /> {formatPhone(c.phone)}
          </a>
        ) : (
          <span className="inline-flex h-11 items-center justify-center rounded-full border border-dashed border-line text-[13px] text-ink-muted">Pas de téléphone</span>
        )}
        {wa ? (
          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] text-[13.5px] font-semibold text-white hover:bg-[#1ebe5a]">
            <WhatsAppIcon className="size-4" /> WhatsApp
          </a>
        ) : (
          <span />
        )}
      </div>

      {(c.email || c.city) && (
        <div className="space-y-1.5 text-[13.5px] text-ink-soft">
          {c.email && (
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-ink-muted" /> {c.email}
            </div>
          )}
          {c.city && (
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-ink-muted" /> {c.city}
            </div>
          )}
        </div>
      )}

      <section>
        <div className="mb-2 text-[11.5px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Tailles habituelles</div>
        {c.usual_sizes.length ? (
          <div className="flex flex-wrap gap-2">
            {c.usual_sizes.map((s) => (
              <span key={`${s.cat}-${s.size}`} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-[13px]">
                <span className="text-ink-muted">{CAT_LABEL[s.cat] ?? s.cat}</span>
                <strong className="text-ink">{s.size}</strong>
                <span className="text-[11.5px] text-ink-muted">×{s.qty}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-ink-muted">Pas encore d’historique.</p>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11.5px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Note interne</span>
          <span className="text-[11.5px] text-ink-muted">Jamais visible par le client</span>
        </div>
        <textarea
          className="field min-h-20 resize-y text-[13.5px]"
          value={value}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          placeholder="Ex. 3 enfants au lycée Savorgnan, préfère être appelée après 17 h…"
        />
        {note !== null && note !== (c.admin_note ?? '') && (
          <Button size="sm" className="mt-2" loading={save.isPending} onClick={() => save.mutate(note, { onSuccess: () => setNote(null) })}>
            Enregistrer la note
          </Button>
        )}
      </section>

      <section>
        <div className="mb-2 text-[11.5px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Historique des commandes</div>
        {c.orders.length ? (
          <ul className="divide-y divide-line/70 rounded-2xl border border-line">
            {c.orders.map((o) => (
              <li key={o.id}>
                <button onClick={() => navigate(`/admin/commandes?q=${o.reference}`)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-surface-2/50">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[12.5px] font-semibold text-ink">{o.reference}</div>
                    <div className="text-[12px] text-ink-muted">
                      {new Date(o.created_at).toLocaleDateString('fr-FR')} · {o.items.reduce((n, i) => n + i.qty, 0)} article(s)
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[13.5px] font-semibold text-ink tabular-nums">{fcfa(o.total)}</span>
                    <StatusBadge status={o.status} short className="px-2 py-0.5 text-[10.5px]" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-muted">Aucune commande pour l’instant.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2/60 px-2 py-3">
      <div className="truncate font-display text-[15px] font-semibold text-ink tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-ink-muted">{label}</div>
    </div>
  );
}

function Mini({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[20px] border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(28,20,13,0.04)] sm:p-5">
      <div className="text-[12.5px] text-ink-muted">{label}</div>
      <div className="mt-1 font-display text-lg font-semibold text-ink tabular-nums sm:text-2xl">{value}</div>
      {hint && <div className="text-[11.5px] text-ink-muted max-sm:hidden">{hint}</div>}
    </div>
  );
}
