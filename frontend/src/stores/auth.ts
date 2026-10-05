import { create } from 'zustand';
import { api, setToken, getToken, type User } from '../lib/api';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'ready';
  bootstrap: () => Promise<void>;
  signIn: (token: string, user: User) => void;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
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
  signIn: (token, user) => {
    setToken(token);
    set({ user, status: 'ready' });
  },
  signOut: async () => {
    try {
      await api.logout();
    } catch {
      /* déconnexion locale quoi qu'il arrive */
    }
    setToken(null);
    set({ user: null });
  },
}));
