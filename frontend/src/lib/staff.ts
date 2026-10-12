import type { StaffRole, User } from './api/types';

/** Rôle d'un membre de l'équipe — un admin sans rôle explicite est gérant */
export function roleOf(user: Pick<User, 'is_admin' | 'staff_role'> | null | undefined): StaffRole | null {
  if (!user?.is_admin) return null;
  return user.staff_role ?? 'gerant';
}

export const ROLE_LABEL: Record<StaffRole, string> = { gerant: 'Gérant', preparateur: 'Préparateur', livreur: 'Livreur' };

export const ROLE_HINT: Record<StaffRole, string> = {
  gerant: 'Accès complet : catalogue, promotions, équipe, rapports',
  preparateur: 'Commandes, clients, préparation et livraisons',
  livreur: 'Uniquement ses livraisons du jour',
};

export const ROLE_TONE: Record<StaffRole, string> = {
  gerant: 'bg-rouille-50 text-rouille-600 ring-rouille-500/30',
  preparateur: 'bg-sky-100 text-sky-900 ring-sky-200',
  livreur: 'bg-violet-100 text-violet-900 ring-violet-200',
};

/** Ce que chaque rôle peut faire (miroir des middlewares `staff:` de l'API) */
export type Permission = 'orders' | 'customers' | 'prep' | 'deliveries' | 'deliveries.all' | 'catalogue' | 'storefront' | 'promos' | 'team' | 'reports';

const MATRIX: Record<StaffRole, Permission[]> = {
  gerant: ['orders', 'customers', 'prep', 'deliveries', 'deliveries.all', 'catalogue', 'storefront', 'promos', 'team', 'reports'],
  preparateur: ['orders', 'customers', 'prep', 'deliveries', 'deliveries.all'],
  livreur: ['deliveries'],
};

export function can(user: Pick<User, 'is_admin' | 'staff_role'> | null | undefined, perm: Permission) {
  const r = roleOf(user);
  return !!r && MATRIX[r].includes(perm);
}
