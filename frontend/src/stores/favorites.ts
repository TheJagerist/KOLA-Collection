import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavState {
  ids: number[];
  toggle: (id: number) => boolean; // renvoie true si ajouté
  has: (id: number) => boolean;
}

export const useFavorites = create<FavState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const added = !get().ids.includes(id);
        set((s) => ({ ids: added ? [...s.ids, id] : s.ids.filter((x) => x !== id) }));
        return added;
      },
      has: (id) => get().ids.includes(id),
    }),
    { name: 'kola.favorites' },
  ),
);
