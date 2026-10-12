import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePref = 'light' | 'dark' | 'system';

interface ThemeState {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function applyTheme(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && !!media?.matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14100b' : '#3d2e1f');
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      pref: 'system',
      setPref: (pref) => {
        applyTheme(pref);
        set({ pref });
      },
    }),
    { name: 'kola.theme' },
  ),
);

media?.addEventListener('change', () => {
  if (useTheme.getState().pref === 'system') applyTheme('system');
});
