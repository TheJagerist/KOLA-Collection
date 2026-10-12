import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Plus, Send, Trash2 } from 'lucide-react';
import { api, ApiError, type MobileMoneyAccount, type ShopSettings } from '../../lib/api';
import { useAdminMutation } from '../../hooks/queries';
import { fcfa } from '../../lib/format';
import { Skeleton } from '../../components/ui/misc';
import { Button } from '../../components/ui/Button';
import { WhatsAppIcon } from '../../components/ui/icons';
import { Panel } from './AdminLayout';
import { toast } from '../../stores/toast';

const OPS = [
  { key: 'mtn', label: 'MTN Mobile Money', hint: 'Numéros 06…', ussdHint: 'ex. *105#' },
  { key: 'airtel', label: 'Airtel Money', hint: 'Numéros 05…', ussdHint: 'ex. *128#' },
] as const;

const spaced = (n: string) => n.replace(/^242/, '').replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');

/** Admin → Paramètres (gérant) : paiement Mobile Money et WhatsApp */
export default function AdminSettings() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api.admin.settings() });
  const [f, setF] = useState<ShopSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (data)
      setF({
        payment: {
          ...data.payment,
          mtn: { ...data.payment.mtn, number: spaced(data.payment.mtn.number) },
          airtel: { ...data.payment.airtel, number: spaced(data.payment.airtel.number) },
        },
        whatsapp: { shop_number: spaced(data.whatsapp.shop_number), alerts: data.whatsapp.alerts.map((a) => ({ ...a, phone: spaced(a.phone) })) },
      });
  }, [data]);

  const save = useAdminMutation((v: ShopSettings) => api.admin.updateSettings(v), { success: 'Paramètres enregistrés', invalidate: [['admin', 'settings'], ['payments-config']] });
  const test = useAdminMutation(() => api.admin.testWhatsApp(), { success: 'Message d’essai envoyé à l’équipe' });

  if (isLoading || !f) return <Skeleton className="h-96" />;

  const err = (k: string) => errors[k]?.[0];
  const setOp = (op: 'mtn' | 'airtel', v: Partial<MobileMoneyAccount>) => setF({ ...f, payment: { ...f.payment, [op]: { ...f.payment[op], ...v } } });
  const alerts = f.whatsapp.alerts;
  const setAlerts = (a: ShopSettings['whatsapp']['alerts']) => setF({ ...f, whatsapp: { ...f.whatsapp, alerts: a } });

  const submit = () => {
    setErrors({});
    save.mutate(f, {
      onError: (e) => {
        if (e instanceof ApiError) {
          setErrors(e.errors);
          toast.error(e.firstError());
        }
      },
    });
  };

  return (
    <div className="space-y-5">
      <Panel
        title="Paiement de l’acompte par Mobile Money"
        description="Les clients voient ces numéros après leur commande, avec le montant exact, les frais et les étapes. Ils déclarent ensuite leur envoi : vous êtes prévenu et validez après vérification."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {OPS.map(({ key, label, hint, ussdHint }) => (
            <div key={key} className="rounded-2xl border border-line p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold text-ink">{label}</span>
                <span className="text-[12px] text-ink-muted">{hint}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <L label="Numéro qui reçoit" error={err(`payment.${key}.number`)}>
                  <input className="field h-10 py-0" inputMode="tel" placeholder="06 444 55 66" value={f.payment[key].number} onChange={(e) => setOp(key, { number: e.target.value })} />
                </L>
                <L label="Nom du compte">
                  <input className="field h-10 py-0" placeholder="Kōlā Collection" value={f.payment[key].name} onChange={(e) => setOp(key, { name: e.target.value })} />
                </L>
                <L label="Code USSD du menu" hint={ussdHint}>
                  <input className="field h-10 py-0 font-mono" value={f.payment[key].ussd} onChange={(e) => setOp(key, { ussd: e.target.value })} />
                </L>
                <L label="Frais estimés (%)" hint={f.payment[key].fee_percent ? `Sur un acompte de 10 000 : ≈ ${fcfa(Math.ceil(100 * f.payment[key].fee_percent / 5) * 5)}` : '0 = pas d’estimation affichée'}>
                  <input className="field h-10 py-0" type="number" min={0} max={20} step={0.1} value={f.payment[key].fee_percent} onChange={(e) => setOp(key, { fee_percent: Number(e.target.value) })} />
                </L>
              </div>
            </div>
          ))}
        </div>
        <L label="Message affiché au client (frais, délais de vérification…)" className="mt-4">
          <textarea className="field min-h-20 resize-y text-[14px]" maxLength={600} value={f.payment.note} onChange={(e) => setF({ ...f, payment: { ...f.payment, note: e.target.value } })} />
        </L>
      </Panel>

      <Panel title="WhatsApp" description="Le numéro de la boutique pour les messages des clients, et les alertes automatiques envoyées à l’équipe à chaque nouvelle commande ou paiement déclaré.">
        <L label="Numéro WhatsApp de la boutique" error={err('whatsapp.shop_number')} className="sm:max-w-sm">
          <input className="field h-10 py-0" inputMode="tel" placeholder="06 444 55 66" value={f.whatsapp.shop_number} onChange={(e) => setF({ ...f, whatsapp: { ...f.whatsapp, shop_number: e.target.value } })} />
        </L>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold text-ink">Alertes automatiques de l’équipe</div>
              <p className="text-[12.5px] text-ink-muted">Chaque personne reçoit un message WhatsApp dès qu’une commande arrive.</p>
            </div>
            {alerts.length < 5 && (
              <Button size="sm" variant="outline" icon={<Plus className="size-4" />} onClick={() => setAlerts([...alerts, { name: '', phone: '', apikey: '' }])}>
                Ajouter
              </Button>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-4 text-[13.5px] text-ink-muted">Aucun destinataire : les alertes s’affichent seulement dans le tableau de bord (son + notification).</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a, i) => (
                <li key={i} className="grid items-start gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <input className="field h-10 py-0" placeholder="Nom (ex. Gérant)" value={a.name ?? ''} onChange={(e) => setAlerts(alerts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <div>
                    <input className="field h-10 py-0" inputMode="tel" placeholder="06 444 55 66" value={a.phone} onChange={(e) => setAlerts(alerts.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} />
                    {err(`whatsapp.alerts.${i}.phone`) && <p className="mt-1 text-[12px] text-rouille-600">{err(`whatsapp.alerts.${i}.phone`)}</p>}
                  </div>
                  <div>
                    <input className="field h-10 py-0 font-mono" placeholder="Clé CallMeBot" value={a.apikey} onChange={(e) => setAlerts(alerts.map((x, j) => (j === i ? { ...x, apikey: e.target.value } : x)))} />
                    {err(`whatsapp.alerts.${i}.apikey`) && <p className="mt-1 text-[12px] text-rouille-600">{err(`whatsapp.alerts.${i}.apikey`)}</p>}
                  </div>
                  <button type="button" onClick={() => setAlerts(alerts.filter((_, j) => j !== i))} className="grid size-10 place-items-center rounded-lg text-ink-muted hover:bg-rouille-50 hover:text-rouille-600 dark:hover:bg-rouille-500/10" aria-label="Retirer">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <details className="mt-3 rounded-2xl bg-surface-2/50 p-4 text-[13px] text-ink-soft">
            <summary className="cursor-pointer font-semibold text-ink">Comment obtenir la clé (2 minutes, gratuit)</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Sur le téléphone qui doit recevoir les alertes, enregistrez le contact CallMeBot indiqué sur leur site.</li>
              <li>
                Envoyez-lui sur WhatsApp le message : <code className="rounded bg-surface px-1">I allow callmebot to send me messages</code>
              </li>
              <li>Vous recevez une clé (« apikey ») : collez-la ici avec le numéro, puis enregistrez.</li>
            </ol>
            <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-rouille-600 hover:underline">
              Instructions CallMeBot <ExternalLink className="size-3" />
            </a>
          </details>
        </div>
      </Panel>

      <div className="sticky bottom-4 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border border-line bg-surface/90 p-3 backdrop-blur">
        {alerts.length > 0 && (
          <Button variant="outline" loading={test.isPending} onClick={() => test.mutate(undefined)} icon={<WhatsAppIcon className="size-4" />}>
            Envoyer un message d’essai
          </Button>
        )}
        <Button onClick={submit} loading={save.isPending} icon={<Send className="size-4" />}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function L({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 block text-[12.5px] font-medium text-ink-muted">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] font-medium text-rouille-600">{error}</span> : hint ? <span className="mt-1 block text-[12px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}
