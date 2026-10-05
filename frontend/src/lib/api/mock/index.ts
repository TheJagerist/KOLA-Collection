/**
 * Implémentation simulée de l'API (VITE_API_MODE=mock).
 * Reproduit les règles métier attendues côté Laravel (prix recalculés,
 * acompte 50 %, droits admin, archivage des produits déjà commandés…)
 * pour que le frontend soit utilisable avant que l'API soit prête.
 * L'état est conservé dans le localStorage du navigateur.
 */
import {
  ApiError,
  type AuthResponse,
  type Category,
  type KolaApi,
  type Order,
  type OrderStatus,
  type Product,
  type ProductInput,
  type User,
} from '../types';
import { getToken } from '../token';
import { createSeed, SEED_VERSION, type MockDb, type MockUser } from './seed';

const STORAGE_KEY = 'kola.mockdb';
let memoryDb: MockDb | null = null;

function load(): MockDb {
  if (memoryDb) return memoryDb;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb;
      if (parsed.version === SEED_VERSION) return (memoryDb = parsed);
    }
  } catch {
    /* ignore */
  }
  return (memoryDb = createSeed());
}

function save(db: MockDb) {
  memoryDb = db;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* quota dépassé (images en data URL) : l'état reste en mémoire */
  }
}

export function resetMockDb() {
  memoryDb = createSeed();
  save(memoryDb);
}

const delay = (ms = 250 + Math.random() * 250) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function publicUser(u: MockUser): User {
  const { password: _pw, ...rest } = u;
  void _pw;
  return rest;
}

function currentUser(db: MockDb): MockUser {
  const token = getToken();
  const id = token?.startsWith('mock-') ? Number(token.split('-')[1]) : NaN;
  const user = db.users.find((u) => u.id === id);
  if (!user) throw new ApiError('Non authentifié.', 401);
  return user;
}

function requireAdmin(db: MockDb): MockUser {
  const user = currentUser(db);
  if (!user.is_admin) throw new ApiError('Accès réservé aux administrateurs.', 403);
  return user;
}

function activeCollection(db: MockDb) {
  return db.collections.find((c) => c.is_active) ?? null;
}

function validation(errors: Record<string, string>): never {
  const mapped = Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, [v]]));
  throw new ApiError(Object.values(errors)[0], 422, mapped);
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `item-${Date.now()}`
  );
}

function reference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = '';
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return `KLA-${new Date().getFullYear()}-${r}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ApiError('Lecture du fichier impossible.', 422));
    reader.readAsDataURL(file);
  });
}

const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;
const CATEGORIES: Category[] = ['chemise', 'pantalon', 'jupe'];

function stripOrder(o: Order & { user_id: number }): Order {
  const { user_id: _u, ...rest } = o;
  void _u;
  return clone(rest);
}

export const mockApi: KolaApi = {
  async getStorefront() {
    await delay();
    const db = load();
    const c = activeCollection(db);
    return clone({
      collection: c,
      homepage: c ? (db.homepage[c.id] ?? null) : null,
      carousel: c ? [...(db.carousel[c.id] ?? [])].sort((a, b) => a.position - b.position) : [],
    });
  },

  async listProducts(filters = {}) {
    await delay();
    const db = load();
    const c = activeCollection(db);
    let list = db.products.filter((p) => !p.is_archived && (!c || p.collection_id === c.id));
    if (filters.ensemble?.length) list = list.filter((p) => filters.ensemble!.includes(p.ensemble));
    if (filters.cat?.length) list = list.filter((p) => filters.cat!.includes(p.cat));
    if (filters.niveau?.length) list = list.filter((p) => p.niveaux.some((n) => filters.niveau!.includes(n)));
    const sort = filters.sort ?? 'populaires';
    list = [...list].sort((a, b) =>
      sort === 'prix'
        ? a.price - b.price
        : sort === 'nouveautes'
          ? +new Date(b.created_at) - +new Date(a.created_at)
          : b.order_count - a.order_count,
    );
    return clone(list);
  },

  async getProduct(idOrSlug) {
    await delay();
    const db = load();
    const p = db.products.find((x) => String(x.id) === String(idOrSlug) || x.slug === idOrSlug);
    if (!p || p.is_archived) throw new ApiError('Article introuvable.', 404);
    return clone(p);
  },

  async register(payload) {
    await delay();
    const db = load();
    const username = payload.username.trim().toLowerCase();
    if (!payload.full_name.trim()) validation({ full_name: 'Le nom est obligatoire.' });
    if (!USERNAME_RE.test(username)) validation({ username: "Nom d'utilisateur invalide (3 à 20 caractères : lettres, chiffres, . _ -)." });
    if (payload.password.length < 8) validation({ password: 'Le mot de passe doit contenir au moins 8 caractères.' });
    if (db.users.some((u) => u.username === username)) validation({ username: "Ce nom d'utilisateur est déjà pris." });
    const user: MockUser = {
      id: db.seq.user++,
      full_name: payload.full_name.trim(),
      username,
      email: null,
      role: payload.role,
      is_admin: false,
      created_at: new Date().toISOString(),
      password: payload.password,
    };
    db.users.push(user);
    save(db);
    return { token: `mock-${user.id}-${Date.now()}`, user: publicUser(user) } satisfies AuthResponse;
  },

  async login(payload) {
    await delay();
    const db = load();
    const user = db.users.find((u) => u.username === payload.username.trim().toLowerCase());
    if (!user || user.password !== payload.password) {
      validation({ username: "Nom d'utilisateur ou mot de passe incorrect." });
    }
    return { token: `mock-${user.id}-${Date.now()}`, user: publicUser(user) };
  },

  async logout() {
    await delay(100);
  },

  async me() {
    await delay(100);
    return publicUser(currentUser(load()));
  },

  googleRedirectUrl() {
    return '#google-indisponible-en-mode-mock';
  },

  async createOrder(payload) {
    await delay(600);
    const db = load();
    const user = currentUser(db);
    if (!payload.items.length) validation({ items: 'Le panier est vide.' });
    if (!['airtel', 'mtn'].includes(payload.payment_method)) validation({ payment_method: 'Choisissez un opérateur.' });
    if (!/^0[0-9]{8}$/.test(payload.payment_phone)) validation({ payment_phone: 'Numéro invalide (9 chiffres, ex. 06 123 45 67).' });
    if (!payload.delivery_city) validation({ delivery_city: 'Choisissez une ville de livraison.' });
    if (payload.delivery_address.trim().length < 5) validation({ delivery_address: "Précisez l'adresse de livraison." });

    const items = payload.items.map((line, i) => {
      const p = db.products.find((x) => x.id === line.product_id && !x.is_archived);
      if (!p) validation({ [`items.${i}.product_id`]: 'Un article de votre panier n’est plus disponible.' });
      if (!p.sizes.includes(line.size)) validation({ [`items.${i}.size`]: `Taille ${line.size} indisponible pour ${p.name}.` });
      if (line.qty < 1 || line.qty > 20) validation({ [`items.${i}.qty`]: 'Quantité invalide.' });
      p.order_count += line.qty;
      return {
        product_id: p.id,
        product_name: p.name,
        product_image_url: p.image_url,
        size: line.size,
        niveau: line.niveau,
        qty: line.qty,
        unit_price: p.price,
        line_total: p.price * line.qty,
      };
    });
    const total = items.reduce((s, l) => s + l.line_total, 0);
    const deposit = Math.round(total * 0.5);
    const order = {
      id: db.seq.order++,
      user_id: user.id,
      reference: reference(),
      status: 'en_attente' as OrderStatus,
      total,
      deposit,
      balance: total - deposit,
      balance_paid: false,
      payment_method: payload.payment_method,
      payment_phone: payload.payment_phone,
      delivery_city: payload.delivery_city,
      delivery_address: payload.delivery_address.trim(),
      items,
      customer: { id: user.id, full_name: user.full_name, username: user.username },
      created_at: new Date().toISOString(),
      delivered_at: null,
    };
    db.orders.unshift(order);
    save(db);
    return stripOrder(order);
  },

  async myOrders() {
    await delay();
    const db = load();
    const user = currentUser(db);
    return db.orders.filter((o) => o.user_id === user.id).map(stripOrder);
  },

  async getMyOrder(ref) {
    await delay();
    const db = load();
    const user = currentUser(db);
    const o = db.orders.find((x) => x.reference === ref && (x.user_id === user.id || user.is_admin));
    if (!o) throw new ApiError('Commande introuvable.', 404);
    return stripOrder(o);
  },

  admin: {
    async listOrders(status) {
      await delay();
      const db = load();
      requireAdmin(db);
      return db.orders.filter((o) => !status || o.status === status).map(stripOrder);
    },

    async updateOrderStatus(id, status) {
      await delay();
      const db = load();
      requireAdmin(db);
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new ApiError('Commande introuvable.', 404);
      o.status = status;
      o.balance_paid = status === 'livre';
      o.delivered_at = status === 'livre' ? new Date().toISOString() : null;
      save(db);
      return stripOrder(o);
    },

    async listCollections() {
      await delay();
      const db = load();
      requireAdmin(db);
      return clone(db.collections);
    },

    async createCollection(name) {
      await delay();
      const db = load();
      requireAdmin(db);
      if (!name.trim()) validation({ name: 'Donnez un nom à la collection.' });
      const slug = slugify(name);
      if (db.collections.some((c) => c.slug === slug)) validation({ name: 'Une collection porte déjà ce nom.' });
      const c = { id: db.seq.collection++, slug, name: name.trim(), is_active: false, created_at: new Date().toISOString() };
      db.collections.push(c);
      db.carousel[c.id] = [];
      save(db);
      return clone(c);
    },

    async activateCollection(id) {
      await delay();
      const db = load();
      requireAdmin(db);
      const target = db.collections.find((c) => c.id === id);
      if (!target) throw new ApiError('Collection introuvable.', 404);
      db.collections.forEach((c) => (c.is_active = c.id === id));
      save(db);
      return clone(target);
    },

    async updateHomepage(content) {
      await delay();
      const db = load();
      requireAdmin(db);
      const c = activeCollection(db);
      if (!c) throw new ApiError('Aucune collection active.', 409);
      if (!content.hero_title.trim()) validation({ hero_title: 'Le titre est obligatoire.' });
      db.homepage[c.id] = clone(content);
      save(db);
      return clone(content);
    },

    async listCarousel() {
      await delay();
      const db = load();
      requireAdmin(db);
      const c = activeCollection(db);
      return c ? clone([...(db.carousel[c.id] ?? [])].sort((a, b) => a.position - b.position)) : [];
    },

    async addCarouselImages(files) {
      const db = load();
      requireAdmin(db);
      const c = activeCollection(db);
      if (!c) throw new ApiError('Aucune collection active.', 409);
      const list = (db.carousel[c.id] ??= []);
      let pos = list.reduce((m, i) => Math.max(m, i.position), 0);
      for (const f of files) {
        list.push({ id: db.seq.carousel++, image_url: await fileToDataUrl(f), position: ++pos });
      }
      save(db);
      await delay();
      return clone(list);
    },

    async deleteCarouselImage(id) {
      await delay();
      const db = load();
      requireAdmin(db);
      Object.keys(db.carousel).forEach((k) => {
        db.carousel[Number(k)] = db.carousel[Number(k)].filter((i) => i.id !== id);
      });
      save(db);
    },

    async reorderCarousel(ids) {
      await delay();
      const db = load();
      requireAdmin(db);
      const c = activeCollection(db);
      if (!c) return [];
      const list = db.carousel[c.id] ?? [];
      ids.forEach((id, i) => {
        const img = list.find((x) => x.id === id);
        if (img) img.position = i + 1;
      });
      save(db);
      return clone([...list].sort((a, b) => a.position - b.position));
    },

    async listProducts() {
      await delay();
      const db = load();
      requireAdmin(db);
      const c = activeCollection(db);
      return clone(db.products.filter((p) => !c || p.collection_id === c.id));
    },

    async createProduct(input: ProductInput) {
      const db = load();
      requireAdmin(db);
      const c = activeCollection(db);
      if (!c) throw new ApiError('Aucune collection active.', 409);
      if (!input.name.trim()) validation({ name: 'Le nom est obligatoire.' });
      if (!(input.price > 0)) validation({ price: 'Le prix doit être supérieur à 0.' });
      if (!CATEGORIES.includes(input.cat)) validation({ cat: 'Catégorie invalide.' });
      const p: Product = {
        id: db.seq.product++,
        collection_id: c.id,
        slug: `${slugify(input.name)}-${Date.now().toString(36).slice(-4)}`,
        name: input.name.trim(),
        ensemble: input.ensemble,
        cat: input.cat,
        price: Math.round(input.price),
        sizes: input.sizes.length ? input.sizes : ['10', '12', '14', '16', 'S', 'M'],
        niveaux: input.niveaux.length ? input.niveaux : ['college', 'lycee'],
        description: input.description || null,
        construction: input.construction,
        badge: input.badge || null,
        image_url: input.image ? await fileToDataUrl(input.image) : null,
        sketch_url: input.sketch ? await fileToDataUrl(input.sketch) : null,
        order_count: 0,
        is_archived: false,
        created_at: new Date().toISOString(),
      };
      db.products.push(p);
      save(db);
      await delay();
      return clone(p);
    },

    async updateProduct(id, input) {
      const db = load();
      requireAdmin(db);
      const p = db.products.find((x) => x.id === id);
      if (!p) throw new ApiError('Article introuvable.', 404);
      if (input.name !== undefined && !input.name.trim()) validation({ name: 'Le nom est obligatoire.' });
      if (input.price !== undefined && !(input.price > 0)) validation({ price: 'Le prix doit être supérieur à 0.' });
      const { image, sketch, ...rest } = input;
      Object.assign(p, rest);
      if (image) p.image_url = await fileToDataUrl(image);
      if (sketch) p.sketch_url = await fileToDataUrl(sketch);
      save(db);
      await delay();
      return clone(p);
    },

    async deleteProduct(id) {
      await delay();
      const db = load();
      requireAdmin(db);
      const p = db.products.find((x) => x.id === id);
      if (!p) throw new ApiError('Article introuvable.', 404);
      const ordered = db.orders.some((o) => o.items.some((i) => i.product_id === id));
      if (ordered) {
        p.is_archived = true;
      } else {
        db.products = db.products.filter((x) => x.id !== id);
      }
      save(db);
      return { archived: ordered };
    },

    async restoreProduct(id) {
      await delay();
      const db = load();
      requireAdmin(db);
      const p = db.products.find((x) => x.id === id);
      if (!p) throw new ApiError('Article introuvable.', 404);
      p.is_archived = false;
      save(db);
      return clone(p);
    },
  },
};
