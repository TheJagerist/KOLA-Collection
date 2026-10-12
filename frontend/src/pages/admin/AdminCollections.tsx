import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { qk, useAdminMutation } from '../../hooks/queries';
import { formatDate } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/misc';
import { Panel } from './AdminLayout';

export default function AdminCollections() {
  const { data, isLoading } = useQuery({ queryKey: qk.admin.collections, queryFn: api.admin.listCollections });
  const [name, setName] = useState('');
  const invalidate = [qk.admin.collections, qk.admin.products, qk.admin.carousel] as const;

  const create = useAdminMutation(api.admin.createCollection, { success: 'Collection créée', invalidate });
  const activate = useAdminMutation(api.admin.activateCollection, {
    success: (c) => `« ${c.name} » est maintenant la collection active`,
    invalidate,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(name.trim(), { onSuccess: () => setName('') });
  };

  return (
    <Panel
      title="Collections"
      description="Une seule collection est visible à la fois sur le site. L'activer bascule le catalogue, les textes et le carrousel de l'accueil."
      className="max-w-3xl"
    >
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {data?.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-[12.5px] text-ink-muted">
                  /{c.slug} · créée le {formatDate(c.created_at)}
                </div>
              </div>
              {c.is_active ? (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12.5px] font-semibold text-emerald-800">
                  <CheckCircle2 className="size-4" /> Active
                </span>
              ) : (
                <Button size="sm" variant="outline" loading={activate.isPending && activate.variables === c.id} onClick={() => activate.mutate(c.id)}>
                  Activer
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-5 flex gap-2">
        <input className="field" placeholder="Nom de la nouvelle collection" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="dark" loading={create.isPending} icon={<Plus className="size-4" />}>
          Créer
        </Button>
      </form>
    </Panel>
  );
}
