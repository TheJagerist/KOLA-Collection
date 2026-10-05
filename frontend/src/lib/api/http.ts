import {
  ApiError,
  type AuthResponse,
  type CarouselImage,
  type Collection,
  type HomepageContent,
  type KolaApi,
  type Order,
  type Product,
  type ProductFilters,
  type ProductInput,
  type Storefront,
  type User,
} from './types';
import { getToken } from './token';

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';

type Body = Record<string, unknown> | FormData | undefined;

async function request<T>(method: string, path: string, body?: Body): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(BASE + path, { method, headers, body: payload });
  } catch {
    throw new ApiError("Impossible de joindre le serveur. Vérifiez votre connexion.", 0);
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.message ?? `Erreur ${res.status}`, res.status, data?.errors ?? {});
  }
  // Les ressources Laravel sont enveloppées dans { data: ... }
  return (data && typeof data === 'object' && 'data' in data ? data.data : data) as T;
}

function qs(filters: ProductFilters = {}): string {
  const p = new URLSearchParams();
  filters.ensemble?.forEach((v) => p.append('ensemble[]', v));
  filters.cat?.forEach((v) => p.append('cat[]', v));
  filters.niveau?.forEach((v) => p.append('niveau[]', v));
  if (filters.sort) p.set('sort', filters.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

function productForm(input: Partial<ProductInput>, method?: 'PUT'): FormData {
  const fd = new FormData();
  if (method) fd.append('_method', method);
  const { image, sketch, sizes, niveaux, construction, ...rest } = input;
  Object.entries(rest).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  });
  sizes?.forEach((s) => fd.append('sizes[]', s));
  niveaux?.forEach((n) => fd.append('niveaux[]', n));
  construction?.forEach((c) => fd.append('construction[]', c));
  if (image) fd.append('image', image);
  if (sketch) fd.append('sketch', sketch);
  return fd;
}

export const httpApi: KolaApi = {
  getStorefront: () => request<Storefront>('GET', '/storefront'),
  listProducts: (filters) => request<Product[]>('GET', `/products${qs(filters)}`),
  getProduct: (id) => request<Product>('GET', `/products/${id}`),

  register: (payload) => request<AuthResponse>('POST', '/auth/register', { ...payload }),
  login: (payload) => request<AuthResponse>('POST', '/auth/login', { ...payload }),
  logout: () => request<void>('POST', '/auth/logout'),
  me: () => request<User>('GET', '/auth/me'),
  googleRedirectUrl: () => `${BASE}/auth/google/redirect`,

  createOrder: (payload) => request<Order>('POST', '/orders', { ...payload }),
  myOrders: () => request<Order[]>('GET', '/orders'),
  getMyOrder: (reference) => request<Order>('GET', `/orders/${reference}`),

  admin: {
    listOrders: (status) => request<Order[]>('GET', `/admin/orders${status ? `?status=${status}` : ''}`),
    updateOrderStatus: (id, status) => request<Order>('PATCH', `/admin/orders/${id}`, { status }),

    listCollections: () => request<Collection[]>('GET', '/admin/collections'),
    createCollection: (name) => request<Collection>('POST', '/admin/collections', { name }),
    activateCollection: (id) => request<Collection>('POST', `/admin/collections/${id}/activate`),

    updateHomepage: (content) => request<HomepageContent>('PUT', '/admin/homepage', { ...content }),

    listCarousel: () => request<CarouselImage[]>('GET', '/admin/carousel'),
    addCarouselImages: (files) => {
      const fd = new FormData();
      files.forEach((f) => fd.append('images[]', f));
      return request<CarouselImage[]>('POST', '/admin/carousel', fd);
    },
    deleteCarouselImage: (id) => request<void>('DELETE', `/admin/carousel/${id}`),
    reorderCarousel: (ids) => request<CarouselImage[]>('POST', '/admin/carousel/reorder', { ids }),

    listProducts: () => request<Product[]>('GET', '/admin/products'),
    createProduct: (input) => request<Product>('POST', '/admin/products', productForm(input)),
    updateProduct: (id, input) => request<Product>('POST', `/admin/products/${id}`, productForm(input, 'PUT')),
    deleteProduct: (id) => request<{ archived: boolean }>('DELETE', `/admin/products/${id}`),
    restoreProduct: (id) => request<Product>('POST', `/admin/products/${id}/restore`),
  },
};
