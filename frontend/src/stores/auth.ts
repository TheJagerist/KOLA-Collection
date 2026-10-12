import { create } from 'zustand';
import { api, setToken, getToken, type User } from '../lib/api';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'ready';
  bootstrap: () => Promise<void>;
  signIn: (token: string, user: User, opts?: { offerPasskey?: boolean }) => void;
  /** Proposer d'activer l'empreinte / Face ID juste après une connexion */
  offerPasskey: boolean;
  dismissPasskeyOffer: () => void;
  /** Après une modification du profil */
  setUser: (user: User) => void;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  offerPasskey: false,
  dismissPasskeyOffer: () => set({ offerPasskey: false }),
  bootstrap: async () => {
    if (!getToken()) {
      set({ status: 'ready' });
      return;
    }
    set({ status: 'loading' });
    try {
      const user = await api.me();
      set({ user, status: 'ready' });
    } catch {
      setToken(null);
      set({ user: null, status: 'ready' });
    }
  },
  setUser: (user) => set({ user }),
  signIn: (token, user, opts) => {
    setToken(token);
    set({ user, status: 'ready', offerPasskey: !!opts?.offerPasskey });
  },
  signOut: async () => {
    try {
      await api.logout();
    } catch {
      /* déconnexion locale quoi qu'il arrive */
    }
    setToken(null);
    set({ user: null, offerPasskey: false });
  },
}));
