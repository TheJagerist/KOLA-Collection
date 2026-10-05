import { httpApi } from './http';
import { mockApi } from './mock';
import type { KolaApi } from './types';

export const API_MODE: 'mock' | 'http' = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock';

export const api: KolaApi = API_MODE === 'http' ? httpApi : mockApi;

export * from './types';
export { getToken, setToken } from './token';
