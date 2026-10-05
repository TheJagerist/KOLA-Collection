import { useLocation, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import type { Order } from '../lib/api';
import { useMyOrder } from '../hooks/queries';
import { useAuth } from '../stores/auth';
import { orderWhatsAppLink } from '../lib/whatsapp';
import { fcfa, formatPhone, NIVEAU_LABEL, PAYMENT_LABEL } from '../lib/format';
import { ButtonLink } from '../components/ui/Button';
import { Skeleton } from '../components/ui/misc';
import { WhatsAppIcon } from '../components/ui/icons';

export default function OrderConfirmation() {
  const { reference = '' } = useParams();
  const state = useLocation().state as { order?: Order } | null;
  const query = useMyOrder(reference);
  const order = state?.order ?? query.data;
  const user = useAuth((s) => s.user);

  return (
    <div className="container-k max-w-2xl py-14 sm:py-20">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-700"
      >
        <Check className="size-10" strokeWidth={2.5} />
      </motion.div>
      <h1 className="mt-6 text-center text-4xl sm:text-5xl">Commande enregistrée</h1>

      {!order ? (
        <Skeleton className="mt-10 h-64 rounded-[28px]" />
      ) : (
        <>
          <p className="mx-auto mt-4 max-w-lg text-center text-[15.5px] leading-relaxed text-ink-soft">
            Merci ! Envoyez-nous votre commande <strong className="text-ink">{order.reference}</strong> sur WhatsApp : nous vous indiquerons comment
            régler l'acompte de <strong className="text-ink">{fcfa(order.deposit)}</strong>.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={orderWhatsAppLink(order, user?.full_name)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-7 text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(37,211,102,0.8)] transition hover:bg-[#1ebe5a]"
            >
              <WhatsAppIcon className="size-5" />
              Envoyer sur WhatsApp
            </a>
            <ButtonLink to="/compte" size="lg" variant="outline">
              Suivre ma commande
            </ButtonLink>
          </div>

          <div className="mt-12 rounded-[28px] border border-line bg-surface p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Récapitulatif</h2>
              <span className="font-mono text-[13px] text-ink-muted">{order.reference}</span>
            </div>
            <ul className="mt-5 divide-y divide-line">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-4 py-3 text-[14.5px]">
                  <span>
                    {i.qty} × {i.product_name}
                    <span className="block text-[13px] text-ink-muted">
                      Taille {i.size} · {NIVEAU_LABEL[i.niveau]}
                    </span>
                  </span>
                  <span className="font-medium">{fcfa(i.line_total)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[14.5px]">
              <Row label="Total" value={fcfa(order.total)} strong />
              <Row label="Acompte (50 %)" value={fcfa(order.deposit)} accent />
              <Row label="Solde à la livraison" value={fcfa(order.balance)} />
              <Row label="Paiement" value={`${PAYMENT_LABEL[order.payment_method]} · ${formatPhone(order.payment_phone)}`} />
              {order.delivery_city && <Row label="Livraison" value={`${order.delivery_city} — ${order.delivery_address}`} />}
            </dl>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'text-base font-semibold' : ''} ${accent ? 'font-semibold text-rouille-600' : ''}`}>
      <dt className={strong || accent ? '' : 'text-ink-muted'}>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
