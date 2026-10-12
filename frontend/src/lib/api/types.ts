/**
 * Contrat de données entre le frontend et l'API Laravel.
 * Toute évolution ici doit être répercutée dans docs/API.md (et inversement).
 * Les champs sont en snake_case, comme renvoyés par l'API.
 */

export type Ensemble = 'garcon' | 'fille';
export type Category = 'chemise' | 'pantalon' | 'jupe';
export type Niveau = 'college' | 'lycee';
export type Role = 'parent' | 'eleve';
export type PaymentMethod = 'airtel' | 'mtn';
export type OrderStatus = 'en_attente' | 'validee' | 'transit' | 'livre' | 'annulee';
export type ProductSort = 'populaires' | 'prix' | 'nouveautes';

export interface User {
  id: number;
  full_name: string;
  username: string | null;
  email: string | null;
  role: Role;
  is_admin: boolean;
  created_at: string;
  /** 9 chiffres, sans +242 */
  phone?: string | null;
  /** Adresse de livraison par défaut (pré-remplit la commande) */
  default_city?: string | null;
  default_address?: string | null;
  avatar_url?: string | null;
  /** Faux pour un compte créé avec Google (pas encore de mot de passe) */
  has_password?: boolean;
  /** Rôle dans l'équipe (comptes admin uniquement) */
  staff_role?: StaffRole | null;
}

/** PATCH /api/auth/me — tous les champs sont optionnels */
export type ProfileInput = Partial<Pick<User, 'full_name' | 'username' | 'email' | 'phone' | 'role' | 'default_city' | 'default_address'>>;

export interface PasswordInput {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Collection {
  id: number;
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface HomepageContent {
  hero_eyebrow: string | null;
  hero_title: string;
  hero_lede: string | null;
  cta_primary_label: string | null;
}

export interface CarouselImage {
  id: number;
  image_url: string;
  position: number;
}

/** GET /api/storefront */
export interface Storefront {
  collection: Collection | null;
  homepage: HomepageContent | null;
  carousel: CarouselImage[];
}

export interface Product {
  id: number;
  collection_id: number;
  slug: string;
  name: string;
  ensemble: Ensemble;
  cat: Category;
  sizes: string[];
  /** Stock par taille ({"12": 4}) ; null = stock non suivi (toujours disponible) */
  stock?: Record<string, number> | null;
  niveaux: Niveau[];
  price: number; // FCFA, entier
  description: string | null;
  construction: string[];
  badge: string | null;
  image_url: string | null;
  sketch_url: string | null;
  order_count: number;
  is_archived: boolean;
  created_at: string;
}

export interface ProductFilters {
  ensemble?: Ensemble[];
  cat?: Category[];
  niveau?: Niveau[];
  sort?: ProductSort;
}

export interface OrderItem {
  product_id: number;
  product_name: string;
  product_image_url: string | null;
  size: string;
  niveau: Niveau;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  id: number;
  reference: string; // ex. KLA-2026-7F3K9Q
  status: OrderStatus;
  /** Montant avant remise */
  subtotal?: number;
  discount?: number;
  promo_code?: string | null;
  promo_label?: string | null;
  /** web = commandée sur le site · manuel = saisie par l'équipe */
  source?: 'web' | 'manuel';
  total: number;
  deposit: number;
  balance: number;
  balance_paid: boolean;
  payment_method: PaymentMethod;
  payment_phone: string;
  delivery_city: string | null;
  delivery_address: string | null;
  items: OrderItem[];
  customer?: Pick<User, 'id' | 'full_name' | 'username'>; // présent côté admin
  courier?: { id: number; full_name: string; phone: string | null } | null;
  delivery_date?: string | null; // AAAA-MM-JJ
  delivery_slot?: string | null;
  deposit_paid_at?: string | null;
  created_at: string;
  delivered_at: string | null;
}

/* ------------------------------------------------------------------ Équipe, clients, promos */
export type StaffRole = 'gerant' | 'preparateur' | 'livreur';

export interface OrderEvent {
  id: number;
  type: 'created' | 'status' | 'note' | 'payment' | 'delivery';
  from_status: OrderStatus | null;
  to_status: OrderStatus | null;
  body: string | null;
  created_at: string;
  user: { id: number; full_name: string; is_staff: boolean } | null;
}

export interface CustomerSummary {
  id: number;
  full_name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  admin_note: string | null;
  has_account: boolean;
  orders_count: number;
  total_spent: number;
  pending_count: number;
  last_order_at: string | null;
  created_at: string;
}

export interface CustomerDetail extends CustomerSummary {
  usual_sizes: { cat: Category | 'article'; size: string; qty: number }[];
  orders: Order[];
}

export interface StaffMember {
  id: number;
  full_name: string;
  username: string | null;
  phone: string | null;
  avatar_url: string | null;
  staff_role: StaffRole;
  created_at: string;
}

export interface StaffInput {
  full_name: string;
  username?: string;
  password?: string;
  staff_role: StaffRole;
  phone?: string | null;
}

export interface Courier {
  id: number;
  full_name: string;
  phone: string | null;
  staff_role: StaffRole;
}

export interface Promo {
  id: number;
  code: string | null; // null = remise automatique
  label: string;
  type: 'percent' | 'amount';
  value: number;
  min_items: number;
  min_total: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  uses: number;
  automatic: boolean;
}

export type PromoInput = Omit<Promo, 'id' | 'uses' | 'automatic'>;

export interface LowStockRow {
  product_id: number;
  name: string;
  image_url: string | null;
  size: string;
  qty: number;
}

export interface Quote {
  subtotal: number;
  discount: number;
  total: number;
  deposit: number;
  balance: number;
  items_count: number;
  promo: { code: string | null; label: string } | null;
}

export interface ManualOrderPayload extends Omit<CreateOrderPayload, 'promo_code'> {
  customer_id?: number;
  customer?: { full_name: string; phone: string };
  promo_code?: string | null;
  deposit_received?: boolean;
}

export interface DeliveryInput {
  courier_id: number | null;
  delivery_date: string | null;
  delivery_slot: string | null;
}

export interface PaymentInfo {
  transaction_id: string;
  kind: 'deposit' | 'balance';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  reference: string;
  paid_at: string | null;
}

/** POST /api/orders — les prix sont TOUJOURS recalculés côté serveur */
export interface CreateOrderPayload {
  items: { product_id: number; size: string; niveau: Niveau; qty: number }[];
  payment_method: PaymentMethod;
  payment_phone: string; // 9 chiffres, sans +242
  delivery_city: string;
  delivery_address: string;
  promo_code?: string | null;
}

export interface RegisterPayload {
  full_name: string;
  username: string;
  password: string;
  role: Role;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface ProductInput {
  name: string;
  ensemble: Ensemble;
  cat: Category;
  price: number;
  sizes: string[];
  niveaux: Niveau[];
  description: string;
  construction: string[];
  badge: string | null;
  image?: File | null;
  sketch?: File | null;
}

/** Erreur normalisée (422 de Laravel : { message, errors }) */
export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;
  constructor(message: string, status = 500, errors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
  firstError(): string {
    const first = Object.values(this.errors)[0];
    return first?.[0] ?? this.message;
  }
}

/** Interface implémentée par le client HTTP réel et par le mock */
export interface KolaApi {
  // Vitrine
  getStorefront(): Promise<Storefront>;
  listProducts(filters?: ProductFilters): Promise<Product[]>;
  getProduct(idOrSlug: string | number): Promise<Product>;

  // Authentification
  register(payload: RegisterPayload): Promise<AuthResponse>;
  login(payload: LoginPayload): Promise<AuthResponse>;
  logout(): Promise<void>;
  me(): Promise<User>;

  // Profil (client et admin)
  updateProfile(input: ProfileInput): Promise<User>;
  uploadAvatar(file: Blob): Promise<User>;
  deleteAvatar(): Promise<User>;
  updatePassword(input: PasswordInput): Promise<void>;
  logoutOthers(): Promise<{ revoked: number }>;
  googleRedirectUrl(): string;

  // Commandes client
  quote(items: CreateOrderPayload['items'], promoCode?: string | null): Promise<Quote>;
  createOrder(payload: CreateOrderPayload): Promise<Order>;
  myOrders(): Promise<Order[]>;
  getMyOrder(reference: string): Promise<Order>;

  // Paiement Mobile Money en ligne
  payments: {
    config(): Promise<{ enabled: boolean; driver: string | null }>;
    start(reference: string, kind?: 'deposit' | 'balance'): Promise<{ transaction_id: string; amount: number; url: string }>;
    status(transactionId: string): Promise<PaymentInfo>;
    fakeComplete(transactionId: string, success: boolean): Promise<PaymentInfo>;
  };

  // Administration
  admin: {
    listOrders(status?: OrderStatus): Promise<Order[]>;
    updateOrderStatus(id: number, status: OrderStatus): Promise<Order>;

    listCollections(): Promise<Collection[]>;
    createCollection(name: string): Promise<Collection>;
    activateCollection(id: number): Promise<Collection>;

    updateHomepage(content: HomepageContent): Promise<HomepageContent>;

    listCarousel(): Promise<CarouselImage[]>;
    addCarouselImages(files: File[]): Promise<CarouselImage[]>;
    deleteCarouselImage(id: number): Promise<void>;
    reorderCarousel(ids: number[]): Promise<CarouselImage[]>;

    listProducts(): Promise<Product[]>;
    createProduct(input: ProductInput): Promise<Product>;
    updateProduct(id: number, input: Partial<ProductInput>): Promise<Product>;
    deleteProduct(id: number): Promise<{ archived: boolean }>;
    restoreProduct(id: number): Promise<Product>;
    setStock(productId: number, stock: Record<string, number> | null): Promise<Product>;
    lowStock(): Promise<LowStockRow[]>;

    createOrder(payload: ManualOrderPayload): Promise<Order>;
    orderEvents(orderId: number): Promise<OrderEvent[]>;
    addOrderNote(orderId: number, body: string): Promise<OrderEvent>;
    setDelivery(orderId: number, input: DeliveryInput): Promise<Order>;
    couriers(): Promise<Courier[]>;
    deliveries(courierId?: number): Promise<Order[]>;
    startDelivery(orderId: number): Promise<Order>;
    markDelivered(orderId: number, note?: string): Promise<Order>;

    customers(): Promise<CustomerSummary[]>;
    customer(id: number): Promise<CustomerDetail>;
    updateCustomerNote(id: number, note: string | null): Promise<{ id: number; admin_note: string | null }>;

    team(): Promise<StaffMember[]>;
    createStaff(input: StaffInput): Promise<StaffMember>;
    updateStaff(id: number, input: Partial<StaffInput>): Promise<StaffMember>;
    removeStaff(id: number): Promise<void>;

    promos(): Promise<Promo[]>;
    createPromo(input: PromoInput): Promise<Promo>;
    updatePromo(id: number, input: PromoInput): Promise<Promo>;
    deletePromo(id: number): Promise<void>;
  };
}
