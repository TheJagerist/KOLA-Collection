import { useCallback } from 'react';
import type { Niveau, Product } from '../lib/api/types';
import { useCart } from '../stores/cart';
import { useUi } from '../stores/ui';

/** Ajoute au panier, fait « sauter » l'icône panier et ouvre le mini-panier */
export function useAddToCart() {
  const add = useCart((s) => s.add);
  return useCallback(
    (product: Product, size: string, niveau: Niveau, qty = 1) => {
      add(
        { id: product.id, slug: product.slug, name: product.name, price: product.price, image_url: product.image_url, ensemble: product.ensemble, cat: product.cat, sizes: product.sizes },
        size,
        niveau,
        qty,
      );
      const ui = useUi.getState();
      ui.pulseCart();
      ui.openCart();
      navigator.vibrate?.(12);
    },
    [add],
  );
}
