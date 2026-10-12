import type { Order } from '../../lib/api/types';
import { fcfa, formatDateTime, formatPhone, NIVEAU_LABEL, paidAmounts, PAYMENT_LABEL, PAYMENT_STATE, paymentState } from '../../lib/format';
import { WHATSAPP_NUMBER } from '../../lib/whatsapp';

/**
 * Reçu Kōlā — format A4 (794 px de large à 96 dpi).
 * Couleurs fixes (pas de thème clair/sombre) : le rendu est identique partout,
 * à l'écran, en PDF et en image envoyée sur WhatsApp.
 */
export const RECEIPT_WIDTH = 794;

const C = {
  ink: '#2f2318',
  soft: '#5c4a34',
  muted: '#8a7a63',
  line: '#e7dccb',
  paper: '#fffdf9',
  tint: '#f7f2e9',
  rouille: '#c9622e',
  brun: '#241a11',
};
const display = "'Fraunces', Georgia, serif";
const sans = "'Work Sans', system-ui, sans-serif";

export function Receipt({ order, customerName, customerUsername }: { order: Order; customerName?: string; customerUsername?: string | null }) {
  const state = paymentState(order);
  const st = PAYMENT_STATE[state];
  const { paid, due } = paidAmounts(order);
  const name = order.customer?.full_name ?? customerName ?? 'Client';
  const username = order.customer?.username ?? customerUsername;
  const title = state === 'paye' ? 'Reçu de paiement' : state === 'acompte' ? "Reçu d'acompte" : 'Bon de commande';

  return (
    <div style={{ width: RECEIPT_WIDTH, background: C.paper, color: C.ink, fontFamily: sans, fontSize: 13, lineHeight: 1.5, position: 'relative', overflow: 'hidden' }}>
      {/* Bandeau */}
      <div style={{ background: C.brun, color: '#f7f2e9', padding: '36px 48px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <img src="/logo-light.png" alt="Kōlā Collection" style={{ height: 42, width: 'auto', display: 'block' }} crossOrigin="anonymous" />
          <div style={{ marginTop: 14, fontSize: 11.5, color: '#d9cdae', lineHeight: 1.6 }}>
            Uniformes scolaires · Brazzaville & Pointe-Noire
            <br />
            WhatsApp {formatPhone(WHATSAPP_NUMBER.replace(/^242/, ''))}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: display, fontSize: 30, fontWeight: 600, letterSpacing: -0.5, color: '#fff' }}>{title}</div>
          <div style={{ marginTop: 6, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 14, color: '#efe7d8' }}>N° {order.reference}</div>
          <div style={{ marginTop: 2, fontSize: 11.5, color: '#d9cdae' }}>Commande du {formatDateTime(order.created_at)}</div>
        </div>
      </div>
      <div style={{ height: 5, background: `linear-gradient(90deg, ${C.rouille}, #c4b48a 55%, #6fa8d2 80%, #1b2a4a)` }} />

      <div style={{ padding: '30px 48px 0' }}>
        {/* Statut du paiement */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', borderRadius: 16, background: C.tint }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.6, textTransform: 'uppercase', color: C.muted }}>Statut du paiement</div>
            <div style={{ marginTop: 2, fontSize: 13, color: C.soft }}>
              {state === 'impaye' && `Acompte de ${fcfa(order.deposit)} à régler pour lancer la préparation.`}
              {state === 'acompte' && `Acompte reçu. Solde de ${fcfa(due)} à régler à la livraison.`}
              {state === 'paye' && 'Commande entièrement réglée. Merci !'}
              {state === 'annule' && 'Cette commande a été annulée.'}
            </div>
          </div>
          <div
            style={{
              border: `2.5px solid ${st.color}`,
              color: st.color,
              borderRadius: 10,
              padding: '6px 16px',
              fontFamily: display,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              transform: 'rotate(-4deg)',
              whiteSpace: 'nowrap',
            }}
          >
            {st.label}
          </div>
        </div>

        {/* Client / livraison / paiement */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 26 }}>
          <Block title="Client">
            <strong style={{ fontSize: 14, color: C.ink }}>{name}</strong>
            {username && <div style={{ color: C.muted }}>@{username}</div>}
            <div>{formatPhone(order.payment_phone)}</div>
          </Block>
          <Block title="Livraison">
            {order.delivery_city ? (
              <>
                <strong style={{ fontSize: 14, color: C.ink }}>{order.delivery_city}</strong>
                <div>{order.delivery_address}</div>
              </>
            ) : (
              <div>Retrait en boutique</div>
            )}
          </Block>
          <Block title="Paiement">
            <strong style={{ fontSize: 14, color: C.ink }}>{PAYMENT_LABEL[order.payment_method]}</strong>
            <div>{formatPhone(order.payment_phone)}</div>
            <div style={{ color: C.muted }}>Acompte 50 % · solde à la livraison</div>
          </Block>
        </div>

        {/* Articles */}
        <table style={{ width: '100%', marginTop: 28, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: C.muted }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '0 0 10px', borderBottom: `1.5px solid ${C.ink}` }}>Article</th>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '0 0 10px', borderBottom: `1.5px solid ${C.ink}` }}>Taille · niveau</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '0 0 10px', borderBottom: `1.5px solid ${C.ink}` }}>Qté</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '0 0 10px', borderBottom: `1.5px solid ${C.ink}` }}>Prix unit.</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '0 0 10px', borderBottom: `1.5px solid ${C.ink}` }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i, idx) => (
              <tr key={idx}>
                <td style={{ padding: '12px 0', borderBottom: `1px solid ${C.line}`, fontWeight: 500 }}>{i.product_name}</td>
                <td style={{ padding: '12px 0', borderBottom: `1px solid ${C.line}`, color: C.soft }}>
                  {i.size} · {NIVEAU_LABEL[i.niveau]}
                </td>
                <td style={{ padding: '12px 0', borderBottom: `1px solid ${C.line}`, textAlign: 'right' }}>{i.qty}</td>
                <td style={{ padding: '12px 0', borderBottom: `1px solid ${C.line}`, textAlign: 'right', color: C.soft }}>{fcfa(i.unit_price)}</td>
                <td style={{ padding: '12px 0', borderBottom: `1px solid ${C.line}`, textAlign: 'right', fontWeight: 600 }}>{fcfa(i.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <div style={{ width: 320 }}>
            {!!order.discount && (
              <>
                <Line label="Sous-total" value={fcfa(order.subtotal ?? order.total + order.discount)} />
                <Line label={`Remise${order.promo_label ? ` (${order.promo_label})` : ''}`} value={`− ${fcfa(order.discount)}`} />
              </>
            )}
            <Line label="Total de la commande" value={fcfa(order.total)} bold />
            <Line label="Acompte (50 %)" value={fcfa(order.deposit)} />
            <Line label="Solde à la livraison" value={fcfa(order.balance)} />
            <div style={{ height: 1, background: C.line, margin: '8px 0' }} />
            <Line label="Déjà payé" value={fcfa(paid)} color="#047857" />
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: 12,
                background: due > 0 ? C.brun : '#ecfdf5',
                color: due > 0 ? '#fff' : '#047857',
              }}
            >
              <span style={{ fontWeight: 600 }}>Reste à payer</span>
              <span style={{ fontFamily: display, fontSize: 20, fontWeight: 600 }}>{fcfa(due)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pied */}
      <div style={{ margin: '36px 48px 0', padding: '18px 0 30px', borderTop: `1px dashed ${C.line}`, display: 'flex', justifyContent: 'space-between', gap: 24, fontSize: 11.5, color: C.muted }}>
        <div style={{ maxWidth: 440 }}>
          <div style={{ fontFamily: display, fontSize: 16, color: C.ink, marginBottom: 4 }}>Merci pour votre confiance !</div>
          Conservez ce reçu : il vous sera demandé à la livraison. Pour toute question, écrivez-nous sur WhatsApp en indiquant la référence {order.reference}.
        </div>
        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          Document émis le
          <br />
          {formatDateTime(new Date().toISOString())}
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1.6, textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>{title}</div>
      <div style={{ color: C.soft, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function Line({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: bold ? 600 : 400, color: color ?? (bold ? C.ink : C.soft), fontSize: bold ? 14 : 13 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
