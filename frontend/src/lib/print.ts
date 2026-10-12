import type { Order } from './api/types';
import { fcfa, formatDate, formatPhone, NIVEAU_LABEL, PAYMENT_LABEL } from './format';

/**
 * Impression (bons de préparation, récapitulatif du jour) :
 * on génère une page HTML autonome dans une iframe cachée puis on lance l'impression.
 * Format A4, lisible en noir et blanc.
 */
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const CSS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font: 12.5px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1c140d; margin: 0; }
  h1 { font-size: 20px; margin: 0; }
  h2 { font-size: 15px; margin: 0 0 6px; }
  .muted { color: #6b5d4f; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1c140d; padding-bottom: 10px; margin-bottom: 14px; }
  .head img { height: 34px; }
  .ref { font: 700 16px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .box { border: 1px solid #d9cfc3; border-radius: 8px; padding: 10px 12px; }
  .label { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #6b5d4f; font-weight: 700; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #6b5d4f; border-bottom: 1px solid #1c140d; padding: 6px 6px; }
  td { border-bottom: 1px solid #e7dfd5; padding: 8px 6px; vertical-align: top; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .check { width: 22px; } .check span { display: inline-block; width: 14px; height: 14px; border: 1.5px solid #1c140d; border-radius: 3px; }
  .big { font-size: 15px; font-weight: 700; }
  .totals { margin-left: auto; width: 280px; margin-top: 10px; }
  .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
  .due { border-top: 1.5px solid #1c140d; margin-top: 4px; padding-top: 6px !important; font-weight: 700; font-size: 14px; }
  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; }
  .sign div { border-top: 1px dashed #6b5d4f; padding-top: 6px; font-size: 11px; color: #6b5d4f; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .note { background: #f6f1ea; border-radius: 6px; padding: 8px 10px; margin-top: 10px; }
`;

function printHtml(title: string, body: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`);
  doc.close();
  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1500);
  };
  // On attend le logo pour qu'il apparaisse à l'impression
  const imgs = [...doc.images];
  if (!imgs.length) return go();
  let left = imgs.length;
  const done = () => --left <= 0 && go();
  imgs.forEach((i) => (i.complete ? done() : ((i.onload = done), (i.onerror = done))));
}

const logo = () => `<img src="${location.origin}/logo-dark.png" alt="Kōlā Collection">`;

function slip(o: Order) {
  const count = o.items.reduce((n, i) => n + i.qty, 0);
  const due = o.status === 'annulee' ? 0 : o.balance_paid || o.status === 'livre' ? 0 : o.status === 'en_attente' ? o.total : o.balance;
  return `<section class="page">
    <div class="head">
      <div>${logo()}<div class="muted" style="margin-top:6px">Bon de préparation & de livraison</div></div>
      <div style="text-align:right"><div class="ref">${esc(o.reference)}</div><div class="muted">Commande du ${esc(formatDate(o.created_at))}</div>
      ${o.delivery_date ? `<div class="big" style="margin-top:4px">Livraison : ${esc(new Date(o.delivery_date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}${o.delivery_slot ? ` · ${esc(o.delivery_slot)}` : ''}</div>` : ''}</div>
    </div>
    <div class="grid">
      <div class="box"><div class="label">Client</div><div class="big">${esc(o.customer?.full_name ?? 'Client')}</div>
        <div>${esc(formatPhone(o.payment_phone))} · ${esc(PAYMENT_LABEL[o.payment_method])}</div></div>
      <div class="box"><div class="label">Livraison</div><div class="big">${esc(o.delivery_city ?? 'Retrait en boutique')}</div>
        <div>${esc(o.delivery_address ?? '')}</div>${o.courier ? `<div class="muted" style="margin-top:4px">Livreur : ${esc(o.courier.full_name)}</div>` : ''}</div>
    </div>
    <table>
      <thead><tr><th class="check"></th><th>Article</th><th>Taille</th><th>Niveau</th><th class="num">Qté</th><th class="num">Prix</th></tr></thead>
      <tbody>${o.items
        .map(
          (i) => `<tr><td class="check"><span></span></td><td><strong>${esc(i.product_name)}</strong></td><td class="big">${esc(i.size)}</td><td>${esc(NIVEAU_LABEL[i.niveau])}</td><td class="num big">${i.qty}</td><td class="num">${esc(fcfa(i.line_total))}</td></tr>`,
        )
        .join('')}</tbody>
    </table>
    <div class="totals">
      <div><span>${count} article(s)</span><span>${esc(fcfa(o.subtotal ?? o.total))}</span></div>
      ${o.discount ? `<div><span>Remise${o.promo_label ? ` (${esc(o.promo_label)})` : ''}</span><span>− ${esc(fcfa(o.discount))}</span></div>` : ''}
      <div><span>Total</span><span>${esc(fcfa(o.total))}</span></div>
      <div class="due"><span>À encaisser à la livraison</span><span>${esc(fcfa(due))}</span></div>
    </div>
    <div class="sign"><div>Préparé par</div><div>Reçu par le client (nom et signature)</div></div>
  </section>`;
}

export function printSlips(orders: Order[]) {
  if (!orders.length) return;
  printHtml(orders.length === 1 ? `Bon ${orders[0].reference}` : `Bons de préparation (${orders.length})`, orders.map(slip).join(''));
}

export interface PrepLine {
  name: string;
  size: string;
  niveau: string;
  qty: number;
}

/** Récapitulatif : ce qu'il faut sortir du stock pour un lot de commandes */
export function printPrepSummary(lines: PrepLine[], orders: Order[], title = 'Récapitulatif de préparation') {
  const total = lines.reduce((n, l) => n + l.qty, 0);
  const body = `<section>
    <div class="head"><div>${logo()}<h1 style="margin-top:8px">${esc(title)}</h1></div>
      <div style="text-align:right" class="muted">${esc(new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }))}<br>${orders.length} commande(s) · ${total} article(s)</div></div>
    <table><thead><tr><th class="check"></th><th>Article</th><th>Taille</th><th>Niveau</th><th class="num">Quantité</th></tr></thead>
    <tbody>${lines
      .map((l) => `<tr><td class="check"><span></span></td><td><strong>${esc(l.name)}</strong></td><td class="big">${esc(l.size)}</td><td>${esc(l.niveau)}</td><td class="num big">${l.qty}</td></tr>`)
      .join('')}</tbody></table>
    <h2 style="margin-top:22px">Commandes du lot</h2>
    <table><thead><tr><th>Référence</th><th>Client</th><th>Ville</th><th class="num">Articles</th></tr></thead>
    <tbody>${orders
      .map((o) => `<tr><td style="font-family:monospace">${esc(o.reference)}</td><td>${esc(o.customer?.full_name ?? '')}</td><td>${esc(o.delivery_city ?? 'Retrait')}</td><td class="num">${o.items.reduce((n, i) => n + i.qty, 0)}</td></tr>`)
      .join('')}</tbody></table>
  </section>`;
  printHtml(title, body);
}
