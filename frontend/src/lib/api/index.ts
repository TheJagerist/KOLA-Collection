import { httpApi } from './http';
import { mockApi } from './mock';
import type { KolaApi } from './types';

/**
 * Choix de la source de données :
 * - VITE_API_MODE=http  → toujours l'API Laravel (production, Docker)
 * - VITE_API_MODE=mock  → toujours la démo dans le navigateur
 * - non défini          → en développement : l'API si elle répond, sinon la démo (avec un bandeau d'avertissement) ;
 *                         en production : toujours l'API.
 * Les exports `let` sont des liaisons vivantes : initApi() les met à jour avant le premier rendu.
 */
const FORCED = import.meta.env.VITE_API_MODE as 'mock' | 'http' | undefined;

export let API_MODE: 'mock' | 'http' = FORCED === 'mock' ? 'mock' : 'http';
export let api: KolaApi = API_MODE === 'http' ? httpApi : mockApi;
/** Vrai si on est passé sur la démo parce que l'API ne répondait pas */
export let API_FALLBACK = false;

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';

/** L'API Laravel répond-elle ? (Docker sous Windows peut mettre plusieurs secondes au premier appel) */
export async function pingApi(timeoutMs = 10000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${API_BASE}/health`, { signal: ctrl.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
    clearTimeout(t);
    return res.ok && (await res.json().catch(() => null))?.status === 'ok';
  } catch {
    return false;
  }
}

export async function initApi(): Promise<void> {
  if (FORCED || !import.meta.env.DEV) return;
  if (await pingApi()) return;
  API_MODE = 'mock';
  api = mockApi;
  API_FALLBACK = true;
  console.warn("[Kōlā] L'API Laravel ne répond pas : affichage des données de démonstration. Lancez « docker compose up -d » ; la page se rechargera toute seule dès que l'API répondra.");
}

export * from './types';
export { getToken, setToken } from './token';
