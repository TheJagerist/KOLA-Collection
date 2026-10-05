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
  created_at: string;
  delivered_at: string | null;
}

/** POST /api/orders — les prix sont TOUJOURS recalculés côté serveur */
export interface CreateOrderPayload {
  items: { product_id: number; size: string; niveau: Niveau; qty: number }[];
  payment_method: PaymentMethod;
  payment_phone: string; // 9 chiffres, sans +242
  delivery_city: string;
  delivery_address: string;
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
  googleRedirectUrl(): string;

  // Commandes client
  createOrder(payload: CreateOrderPayload): Promise<Order>;
  myOrders(): Promise<Order[]>;
  getMyOrder(reference: string): Promise<Order>;

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
  };
}
