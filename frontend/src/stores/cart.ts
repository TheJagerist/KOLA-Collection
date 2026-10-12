import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Niveau, Product } from '../lib/api/types';

/** Ligne de panier : on garde un instantané du produit pour l'affichage hors-ligne,
 *  mais le prix facturé est TOUJOURS recalculé par l'API. */
export interface CartLine {
  key: string; // productId|size|niveau
  product: Pick<Product, 'id' | 'slug' | 'name' | 'price' | 'image_url' | 'ensemble' | 'cat' | 'sizes'>;
  size: string;
  niveau: Niveau;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  add: (product: CartLine['product'], size: string, niveau: Niveau, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  syncPrices: (products: Product[]) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (product, size, niveau, qty = 1) =>
        set((s) => {
          const key = `${product.id}|${size}|${niveau}`;
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return { lines: s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + qty) } : l)) };
          }
          return { lines: [...s.lines, { key, product, size, niveau, qty }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({ lines: s.lines.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(20, qty)) } : l)) })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
      syncPrices: (products) =>
        set((s) => ({
          lines: s.lines.map((l) => {
            const p = products.find((x) => x.id === l.product.id);
            return p ? { ...l, product: { ...l.product, price: p.price, name: p.name, image_url: p.image_url } } : l;
          }),
        })),
    }),
    { name: 'kola.cart', version: 1 },
  ),
);

export function cartTotals(lines: CartLine[]) {
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const deposit = Math.round(total * 0.5);
  return { count: lines.reduce((s, l) => s + l.qty, 0), total, deposit, balance: total - deposit };
}
