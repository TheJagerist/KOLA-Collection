import { create } from 'zustand';
import type { Product } from '../lib/api/types';

interface UiState {
  cartOpen: boolean;
  searchOpen: boolean;
  quickView: Product | null;
  /** Incrémenté à chaque ajout au panier : déclenche l'animation de l'icône */
  cartPulse: number;
  openCart: () => void;
  closeCart: () => void;
  setSearch: (open: boolean) => void;
  openQuickView: (p: Product) => void;
  closeQuickView: () => void;
  pulseCart: () => void;
}

export const useUi = create<UiState>((set) => ({
  cartOpen: false,
  searchOpen: false,
  quickView: null,
  cartPulse: 0,
  openCart: () => set({ cartOpen: true, quickView: null }),
  closeCart: () => set({ cartOpen: false }),
  setSearch: (searchOpen) => set({ searchOpen }),
  openQuickView: (quickView) => set({ quickView }),
  closeQuickView: () => set({ quickView: null }),
  pulseCart: () => set((s) => ({ cartPulse: s.cartPulse + 1 })),
}));
