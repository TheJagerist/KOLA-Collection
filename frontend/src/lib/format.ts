import type { Category, Ensemble, Niveau, Order, OrderStatus, PaymentMethod, Product } from './api/types';

const nf = new Intl.NumberFormat('fr-FR');

export const fcfa = (n: number) => `${nf.format(n)} FCFA`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

export const formatPhone = (p: string) => `+242 ${p.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4')}`;

export const NIVEAU_LABEL: Record<Niveau, string> = { college: 'Collège', lycee: 'Lycée' };
export const ENSEMBLE_LABEL: Record<Ensemble, string> = { garcon: 'Garçon', fille: 'Fille' };
export const CATEGORY_LABEL: Record<Category, string> = { chemise: 'Chemise', pantalon: 'Pantalon', jupe: 'Jupe' };
export const CATEGORY_PLURAL: Record<Category, string> = { chemise: 'Chemises', pantalon: 'Pantalons', jupe: 'Jupes' };
export const PAYMENT_LABEL: Record<PaymentMethod, string> = { airtel: 'Airtel Money', mtn: 'MTN Mobile Money' };

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string; step: number }> = {
  en_attente: { label: 'En attente de paiement', tone: 'bg-amber-100 text-amber-900 ring-amber-200', step: 0 },
  validee: { label: 'Validée', tone: 'bg-sky-100 text-sky-900 ring-sky-200', step: 1 },
  transit: { label: 'En livraison', tone: 'bg-violet-100 text-violet-900 ring-violet-200', step: 2 },
  livre: { label: 'Livrée', tone: 'bg-emerald-100 text-emerald-900 ring-emerald-200', step: 3 },
  annulee: { label: 'Annulée', tone: 'bg-stone-200 text-stone-700 ring-stone-300', step: -1 },
};

export const DELIVERY_CITIES = ['Brazzaville', 'Pointe-Noire'] as const;

/** Libellé court « Garçon · haut », « Fille · jupe »… */
export function productKicker(p: Pick<Product, 'ensemble' | 'cat'>) {
  return `${ENSEMBLE_LABEL[p.ensemble]} · ${p.cat === 'chemise' ? 'haut' : CATEGORY_LABEL[p.cat].toLowerCase()}`;
}

/** « Tailles 10 à 14, M » */
export function sizeRange(sizes: string[]) {
  const nums = sizes.filter((s) => /^\d+$/.test(s));
  const letters = sizes.filter((s) => !/^\d+$/.test(s));
  const parts: string[] = [];
  if (nums.length) parts.push(nums.length > 1 ? `${nums[0]} à ${nums[nums.length - 1]}` : nums[0]);
  if (letters.length) parts.push(letters.join(', '));
  return `Tailles ${parts.join(', ')}`;
}

/** Teinte de remplacement quand un article n'a pas encore de photo */
export function productTint(p: Pick<Product, 'ensemble' | 'cat'>) {
  if (p.ensemble === 'garcon') return 'from-kaki-200 to-kaki-400';
  return p.cat === 'chemise' ? 'from-ciel-100 to-ciel-300' : 'from-nuit-500 to-nuit-800';
}

/* ------------------------------------------------------------------
   Statut du PAIEMENT (distinct du statut logistique de la commande)
   en_attente → Impayé · validée / en livraison → Acompte payé · livrée → Payé
   ------------------------------------------------------------------ */
export type PaymentState = 'impaye' | 'acompte' | 'paye' | 'annule';

export function paymentState(o: Pick<Order, 'status' | 'balance_paid'>): PaymentState {
  if (o.status === 'annulee') return 'annule';
  if (o.status === 'livre' || o.balance_paid) return 'paye';
  if (o.status === 'en_attente') return 'impaye';
  return 'acompte';
}

export const PAYMENT_STATE: Record<PaymentState, { label: string; tone: string; color: string }> = {
  impaye: { label: 'Impayé', tone: 'bg-rouille-50 text-rouille-600 ring-rouille-500/30', color: '#c9622e' },
  acompte: { label: 'Acompte payé', tone: 'bg-sky-100 text-sky-900 ring-sky-200', color: '#0369a1' },
  paye: { label: 'Payé', tone: 'bg-emerald-100 text-emerald-900 ring-emerald-200', color: '#047857' },
  annule: { label: 'Annulée', tone: 'bg-stone-200 text-stone-700 ring-stone-300', color: '#78716c' },
};

/** Montant déjà encaissé et reste à payer */
export function paidAmounts(o: Pick<Order, 'status' | 'balance_paid' | 'total' | 'deposit'>) {
  const s = paymentState(o);
  const paid = s === 'paye' ? o.total : s === 'acompte' ? o.deposit : 0;
  return { paid, due: s === 'annule' ? 0 : o.total - paid };
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
