import type { Order } from './api/types';
import { fcfa, formatPhone, NIVEAU_LABEL, PAYMENT_LABEL } from './format';

export const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || '242064455563';

/** Lien wa.me pré-rempli avec le récapitulatif de la commande */
export function orderWhatsAppLink(order: Order, customerName?: string) {
  const lines = order.items
    .map((i) => `• ${i.product_name} — taille ${i.size}, ${NIVEAU_LABEL[i.niveau]} × ${i.qty}`)
    .join('\n');
  const msg = [
    'Bonjour Kōlā,',
    `Je viens de passer la commande *${order.reference}*.`,
    '',
    lines,
    '',
    `Total : ${fcfa(order.total)}`,
    `Acompte (50 %) : ${fcfa(order.deposit)}`,
    `Solde à la livraison : ${fcfa(order.balance)}`,
    '',
    `Paiement : ${PAYMENT_LABEL[order.payment_method]} (${formatPhone(order.payment_phone)})`,
    order.delivery_city ? `Livraison : ${order.delivery_city}${order.delivery_address ? ` — ${order.delivery_address}` : ''}` : '',
    customerName ? `Client : ${customerName}` : '',
  ]
    .filter((l, i, arr) => l !== '' || arr[i - 1] !== '')
    .join('\n');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export const contactWhatsAppLink = (text = 'Bonjour Kōlā, j’ai une question.') =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
