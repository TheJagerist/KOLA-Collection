import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type ProductFilters } from '../lib/api';
import { toast } from '../stores/toast';

export const qk = {
  storefront: ['storefront'] as const,
  products: (f?: ProductFilters) => ['products', f ?? {}] as const,
  product: (id: string) => ['product', id] as const,
  myOrders: ['my-orders'] as const,
  myOrder: (ref: string) => ['my-order', ref] as const,
  admin: {
    orders: ['admin', 'orders'] as const,
    collections: ['admin', 'collections'] as const,
    carousel: ['admin', 'carousel'] as const,
    products: ['admin', 'products'] as const,
  },
};

export const useStorefront = () => useQuery({ queryKey: qk.storefront, queryFn: api.getStorefront, staleTime: 60_000 });

export const useProducts = (filters?: ProductFilters) =>
  useQuery({ queryKey: qk.products(filters), queryFn: () => api.listProducts(filters), staleTime: 30_000 });

export const useProduct = (id: string) =>
  useQuery({ queryKey: qk.product(id), queryFn: () => api.getProduct(id), retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2 });

export const useMyOrders = (enabled = true) => useQuery({ queryKey: qk.myOrders, queryFn: api.myOrders, enabled });

export const useMyOrder = (ref: string) => useQuery({ queryKey: qk.myOrder(ref), queryFn: () => api.getMyOrder(ref) });

/** Après une action admin, on rafraîchit tout ce qui peut être impacté côté vitrine */
export function useAdminMutation<TVars, TData>(
  fn: (v: TVars) => Promise<TData>,
  opts: { success?: string | ((d: TData) => string); invalidate?: readonly (readonly unknown[])[] } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      const keys = opts.invalidate ?? [];
      keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: qk.storefront });
      if (opts.success) toast.success(typeof opts.success === 'function' ? opts.success(data) : opts.success);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.firstError() : 'Une erreur est survenue.'),
  });
}
