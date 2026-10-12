/**
 * Génération du reçu (image PNG et PDF) côté navigateur.
 * Module chargé à la demande (import()) : jsPDF et html-to-image ne pèsent
 * rien tant que personne ne clique sur « Télécharger le reçu ».
 */
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { Order } from './api/types';
import { Receipt, RECEIPT_WIDTH } from '../components/receipt/Receipt';
import { fcfa, paidAmounts, PAYMENT_STATE, paymentState } from './format';

interface Who {
  customerName?: string;
  customerUsername?: string | null;
}

async function renderPng(order: Order, who: Who = {}): Promise<Blob> {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-${RECEIPT_WIDTH + 200}px;top:0;width:${RECEIPT_WIDTH}px;pointer-events:none;z-index:-1`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<Receipt order={order} {...who} />));
    const node = host.firstElementChild as HTMLElement;
    // Attendre le logo et les polices avant la capture
    await Promise.all(
      [...node.querySelectorAll('img')].map((img) => (img.complete ? Promise.resolve() : new Promise((r) => ((img.onload = r), (img.onerror = r))))),
    );
    await document.fonts.ready;
    const fontEmbedCSS = await fontCss();
    const opts = { pixelRatio: 2, backgroundColor: '#fffdf9', cacheBust: true, ...(fontEmbedCSS ? { fontEmbedCSS } : {}) };
    let blob: Blob | null = null;
    try {
      blob = await toBlob(node, opts);
    } catch {
      blob = await toBlob(node, { ...opts, skipFonts: true }); // polices distantes inaccessibles : on garde le rendu
    }
    if (!blob) throw new Error('Impossible de générer le reçu.');
    return blob;
  } finally {
    root.unmount();
    host.remove();
  }
}

/**
 * Polices du site (Google Fonts) intégrées au reçu.
 * html-to-image ne peut pas lire la feuille de style d'un autre domaine : on la télécharge
 * nous-mêmes (sous-ensembles latins uniquement) et on transforme chaque police en data URL.
 */
let fontCache: Promise<string> | null = null;
function fontCss() {
  fontCache ??= (async () => {
    try {
      const link = document.querySelector<HTMLLinkElement>('link[href*="fonts.googleapis.com/css"]');
      if (!link) return '';
      const css = await (await fetch(link.href)).text();
      const blocks = css.split(/(?=\/\* )/).filter((b) => /^\/\* latin(-ext)? \*\//.test(b));
      const out = await Promise.all(
        blocks.map(async (b) => {
          const m = b.match(/url\((https:[^)]+)\)/);
          if (!m) return b;
          const blob = await (await fetch(m[1])).blob();
          const data = await new Promise<string>((r) => {
            const fr = new FileReader();
            fr.onload = () => r(fr.result as string);
            fr.readAsDataURL(blob);
          });
          return b.replace(m[1], data);
        }),
      );
      return out.join('\n');
    } catch {
      return '';
    }
  })();
  return fontCache;
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function pngToPdf(png: Blob): Promise<Blob> {
  const dataUrl = await new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(png);
  });
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const w = 210;
  const h = (img.height / img.width) * w;
  pdf.addImage(dataUrl, 'PNG', 0, 0, w, Math.min(h, 297));
  pdf.setProperties({ title: 'Reçu Kōlā Collection', author: 'Kōlā Collection' });
  return pdf.output('blob');
}

const fileBase = (o: Order) => `Recu-Kola-${o.reference}`;

/** Télécharge le reçu au format PDF (A4) */
export async function downloadReceiptPdf(order: Order, who?: Who) {
  const png = await renderPng(order, who);
  save(await pngToPdf(png), `${fileBase(order)}.pdf`);
}

/** Télécharge le reçu en image (pratique pour WhatsApp) */
export async function downloadReceiptImage(order: Order, who?: Who) {
  save(await renderPng(order, who), `${fileBase(order)}.png`);
}

/** Numéro WhatsApp du client (Congo : 242 + 9 chiffres, le 0 est conservé) */
export const customerWaNumber = (o: Order) => `242${o.payment_phone.replace(/\D/g, '').replace(/^242/, '')}`;

export function receiptMessage(order: Order) {
  const state = paymentState(order);
  const { paid, due } = paidAmounts(order);
  const name = order.customer?.full_name?.split(' ')[0];
  const lines = [
    `Bonjour${name ? ` ${name}` : ''} 👋`,
    '',
    state === 'impaye'
      ? `Voici le bon de votre commande *${order.reference}*. Merci de régler l'acompte de *${fcfa(order.deposit)}* pour lancer la préparation.`
      : `Nous avons bien reçu votre paiement pour la commande *${order.reference}*. Merci !`,
    '',
    `Statut : *${PAYMENT_STATE[state].label}*`,
    `Total : ${fcfa(order.total)}`,
    `Déjà payé : ${fcfa(paid)}`,
    due > 0 ? `Reste à payer à la livraison : *${fcfa(due)}*` : 'Reste à payer : 0 FCFA ✅',
    '',
    'Votre reçu est en pièce jointe. Vous pouvez aussi le retrouver ici :',
    `${window.location.origin}/commande/confirmation/${order.reference}`,
    '',
    '— Kōlā Collection',
  ];
  return lines.join('\n');
}

/**
 * Envoie le reçu au client sur WhatsApp.
 * - Téléphone (Android / iPhone) : partage natif de l'image → l'admin choisit WhatsApp et le client.
 * - Ordinateur : WhatsApp ne permet pas de joindre un fichier par lien. On télécharge le PDF
 *   et on ouvre la conversation du client avec le message déjà rédigé ; il reste à glisser le fichier.
 * Retourne le mode utilisé pour afficher la bonne consigne.
 */
export async function sendReceiptWhatsApp(order: Order): Promise<'shared' | 'manual' | 'cancelled'> {
  const text = receiptMessage(order);
  const waUrl = `https://wa.me/${customerWaNumber(order)}?text=${encodeURIComponent(text)}`;
  const touch = window.matchMedia('(pointer: coarse)').matches;

  // Ordinateur : on ouvre WhatsApp tout de suite (encore dans le clic, sinon la pop-up est bloquée)
  const win = touch ? null : window.open('about:blank', '_blank');
  const png = await renderPng(order);
  const file = new File([png], `${fileBase(order)}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };

  if (touch && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }

  save(await pngToPdf(png), `${fileBase(order)}.pdf`);
  if (win) {
    win.opener = null;
    win.location.href = waUrl;
  } else {
    window.open(waUrl, '_blank', 'noopener');
  }
  return 'manual';
}
