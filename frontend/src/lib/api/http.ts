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
  type Quote,
  type LowStockRow,
  type OrderEvent,
  type Courier,
  type CustomerSummary,
  type CustomerDetail,
  type StaffMember,
  type Promo,
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
    // null → chaîne vide : Laravel la convertit en null (permet de vider un champ, ex. le badge)
    if (v !== undefined) fd.append(k, v === null ? '' : String(v));
  });
  sizes?.forEach((s) => fd.append('sizes[]', s));
  niveaux?.forEach((n) => fd.append('niveaux[]', n));
  // L'API attend une liste : on n'envoie le champ que s'il contient au moins une ligne
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

  updateProfile: (input) => request<User>('PATCH', '/auth/me', { ...input }),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file, 'avatar.jpg');
    return request<User>('POST', '/auth/me/avatar', fd);
  },
  deleteAvatar: () => request<User>('DELETE', '/auth/me/avatar'),
  updatePassword: (input) => request<void>('PUT', '/auth/password', { ...input }),
  logoutOthers: () => request<{ revoked: number }>('POST', '/auth/logout-others'),
  googleRedirectUrl: () => `${BASE}/auth/google/redirect`,

  quote: (items, promoCode) => request<Quote>('POST', '/orders/quote', { items, promo_code: promoCode || null }),
  createOrder: (payload) => request<Order>('POST', '/orders', { ...payload }),
  myOrders: () => request<Order[]>('GET', '/orders'),
  getMyOrder: (reference) => request<Order>('GET', `/orders/${reference}`),

  payments: {
    config: () => request('GET', '/payments/config'),
    start: (reference, kind = 'deposit') => request('POST', `/orders/${reference}/pay`, { kind }),
    status: (tx) => request('GET', `/payments/${tx}`),
    fakeComplete: (tx, success) => request('POST', `/payments/fake/${tx}`, { success }),
  },

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
    setStock: (id, stock) => request<Product>('PUT', `/admin/products/${id}/stock`, { stock }),
    lowStock: () => request<LowStockRow[]>('GET', '/admin/stock/low'),

    createOrder: (payload) => request<Order>('POST', '/admin/orders', { ...payload }),
    orderEvents: (id) => request<OrderEvent[]>('GET', `/admin/orders/${id}/events`),
    addOrderNote: (id, body) => request<OrderEvent>('POST', `/admin/orders/${id}/notes`, { body }),
    setDelivery: (id, input) => request<Order>('PATCH', `/admin/orders/${id}/delivery`, { ...input }),
    couriers: () => request<Courier[]>('GET', '/admin/couriers'),
    deliveries: (courierId) => request<Order[]>('GET', `/admin/deliveries${courierId ? `?courier=${courierId}` : ''}`),
    startDelivery: (id) => request<Order>('POST', `/admin/deliveries/${id}/start`),
    markDelivered: (id, note) => request<Order>('POST', `/admin/deliveries/${id}/delivered`, { note: note || null }),

    customers: () => request<CustomerSummary[]>('GET', '/admin/customers'),
    customer: (id) => request<CustomerDetail>('GET', `/admin/customers/${id}`),
    updateCustomerNote: (id, note) => request('PATCH', `/admin/customers/${id}`, { admin_note: note }),

    team: () => request<StaffMember[]>('GET', '/admin/team'),
    createStaff: (input) => request<StaffMember>('POST', '/admin/team', { ...input }),
    updateStaff: (id, input) => request<StaffMember>('PATCH', `/admin/team/${id}`, { ...input }),
    removeStaff: (id) => request<void>('DELETE', `/admin/team/${id}`),

    promos: () => request<Promo[]>('GET', '/admin/promos'),
    createPromo: (input) => request<Promo>('POST', '/admin/promos', { ...input }),
    updatePromo: (id, input) => request<Promo>('PUT', `/admin/promos/${id}`, { ...input }),
    deletePromo: (id) => request<void>('DELETE', `/admin/promos/${id}`),
  },
};
