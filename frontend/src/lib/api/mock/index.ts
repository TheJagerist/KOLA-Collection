/**
 * Implémentation simulée de l'API (VITE_API_MODE=mock).
 * Reproduit les règles métier attendues côté Laravel (prix recalculés,
 * acompte 50 %, droits admin, archivage des produits déjà commandés…)
 * pour que le frontend soit utilisable avant que l'API soit prête.
 * L'état est conservé dans le localStorage du navigateur.
 */
import { ApiError, type AuthResponse, type Category, type CreateOrderPayload, type CustomerSummary, type KolaApi, type Order, type OrderEvent, type OrderStatus, type PaymentInfo, type Product, type ProductInput, type Promo, type ShopSettings, type StaffMember, type StaffRole, type User } from '../types';
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
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function publicUser(u: MockUser): User {
  const { password: _pw, admin_note: _n, passkeys: _k, ...rest } = u;
  void _pw;
  void _n;
  void _k;
  return clone({
    phone: null,
    default_city: null,
    default_address: null,
    avatar_url: null,
    email_notifications: true,
    ...rest,
    has_password: !!u.password,
  });
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(b);
  });

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

/** Réglages de démo (numéros fictifs) */
function settingsOf(db: MockDb): ShopSettings {
  return (
    db.settings ?? {
      payment: {
        mtn: { number: '064445566', name: 'Kōlā Collection', ussd: '*105#', fee_percent: 1 },
        airtel: { number: '054445566', name: 'Kōlā Collection', ussd: '*128#', fee_percent: 1 },
        note: 'Les frais de transfert sont à votre charge : envoyez le montant exact de l’acompte. Nous vérifions la réception et validons votre commande rapidement.',
      },
      whatsapp: { shop_number: '242064455563', alerts: [] },
    }
  );
}

/** Identifiant de connexion : nom d'utilisateur, e-mail ou téléphone */
function parseLogin(raw: string): { type: 'email' | 'phone' | 'username'; value: string } {
  const v = raw.trim();
  if (v.includes('@')) return { type: 'email', value: v.toLowerCase() };
  const d = v.replace(/\D/g, '');
  if (d.length >= 8 && /^[\d\s().+-]+$/.test(v)) {
    let p = d.replace(/^(00)?242/, '');
    if (p.length === 8) p = '0' + p;
    return { type: 'phone', value: p };
  }
  return { type: 'username', value: v.toLowerCase() };
}
function findByLogin(db: MockDb, raw: string) {
  const { type, value } = parseLogin(raw);
  return db.users.find((u) => (type === 'email' ? u.email?.toLowerCase() === value : type === 'phone' ? u.phone === value : u.username === value));
}

// Démo : codes de connexion et défis WebAuthn gardés en mémoire
const mockCodes = new Map<number, { code: string; expires: number; tries: number }>();
const mockChallenges = new Map<string, true>();
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomB64 = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));
const maskEmail = (e: string) => {
  const [n, d] = e.split('@');
  return `${n.slice(0, 2)}${'•'.repeat(Math.max(1, n.length - 2))}@${d}`;
};
const CATEGORIES: Category[] = ['chemise', 'pantalon', 'jupe'];

/* ------------------------------------------------------------------ Règles métier partagées (miroir de Laravel) */
type DbOrder = MockDb['orders'][number];
const staffRoleOf = (u: MockUser): StaffRole | null => (u.is_admin ? (u.staff_role ?? 'gerant') : null);

function requireRole(db: MockDb, ...roles: StaffRole[]): MockUser {
  const user = requireAdmin(db);
  if (!roles.includes(staffRoleOf(user)!)) throw new ApiError('Votre rôle ne permet pas cette action.', 403);
  return user;
}

function logEvent(db: MockDb, orderId: number, type: OrderEvent['type'], extra: Partial<OrderEvent> = {}, by?: MockUser | null): OrderEvent {
  const ev = {
    id: db.seq.event++,
    order_id: orderId,
    type,
    from_status: null,
    to_status: null,
    body: null,
    created_at: new Date().toISOString(),
    user: by ? { id: by.id, full_name: by.full_name, is_staff: by.is_admin } : null,
    ...extra,
  };
  db.events.push(ev);
  const { order_id: _o, ...rest } = ev;
  void _o;
  return rest;
}

function promoUsable(p: Promo) {
  const now = Date.now();
  return p.is_active && (!p.starts_at || Date.parse(p.starts_at) <= now) && (!p.ends_at || Date.parse(p.ends_at) >= now) && (p.max_uses === null || p.uses < p.max_uses);
}
function promoDiscount(p: Promo, subtotal: number, count: number) {
  if (count < p.min_items || subtotal < p.min_total) return 0;
  return Math.min(p.type === 'percent' ? Math.round((subtotal * p.value) / 100) : p.value, subtotal);
}
function bestPromo(db: MockDb, subtotal: number, count: number, code?: string | null) {
  let best: { discount: number; promo: Promo | null } = { discount: 0, promo: null };
  db.promos.filter((p) => p.code === null && promoUsable(p)).forEach((p) => {
    const d = promoDiscount(p, subtotal, count);
    if (d > best.discount) best = { discount: d, promo: p };
  });
  const c = code?.trim().toUpperCase();
  if (c) {
    const p = db.promos.find((x) => x.code === c && promoUsable(x));
    if (!p) validation({ promo_code: `Le code « ${c} » n'est pas valide ou a expiré.` });
    const d = promoDiscount(p, subtotal, count);
    if (d === 0) validation({ promo_code: `Le code « ${c} » s'applique ${p.min_items > count ? `dès ${p.min_items} articles` : `dès ${p.min_total.toLocaleString('fr-FR')} FCFA`}.` });
    if (d >= best.discount) best = { discount: d, promo: p };
  }
  return best;
}

function buildLines(db: MockDb, items: CreateOrderPayload['items'], checkStock = true) {
  const need = new Map<string, number>();
  const lines = items.map((line, i) => {
    const p = db.products.find((x) => x.id === line.product_id && !x.is_archived);
    if (!p) validation({ [`items.${i}.product_id`]: 'Un article de votre panier n’est plus disponible.' });
    if (!p.sizes.includes(line.size)) validation({ [`items.${i}.size`]: `Taille ${line.size} indisponible pour ${p.name}.` });
    if (line.qty < 1 || line.qty > 50) validation({ [`items.${i}.qty`]: 'Quantité invalide.' });
    const key = `${p.id}|${line.size}`;
    need.set(key, (need.get(key) ?? 0) + line.qty);
    if (checkStock && p.stock) {
      const left = Math.max(0, p.stock[line.size] ?? 0);
      if (left < need.get(key)!) validation({ [`items.${i}.qty`]: left === 0 ? `« ${p.name} » est épuisé en taille ${line.size}.` : `Il ne reste que ${left} « ${p.name} » en taille ${line.size}.` });
    }
    return { product_id: p.id, product_name: p.name, product_image_url: p.image_url, size: line.size, niveau: line.niveau, qty: line.qty, unit_price: p.price, line_total: p.price * line.qty };
  });
  return lines;
}

function adjustStock(db: MockDb, items: { product_id: number; size: string; qty: number }[], sign: 1 | -1) {
  items.forEach((i) => {
    const p = db.products.find((x) => x.id === i.product_id);
    if (p?.stock) p.stock[i.size] = Math.max(0, (p.stock[i.size] ?? 0) + sign * i.qty);
  });
}

function quoteOf(db: MockDb, items: CreateOrderPayload['items'], code?: string | null) {
  const lines = buildLines(db, items);
  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const { discount, promo } = bestPromo(db, subtotal, count, code);
  const total = subtotal - discount;
  const deposit = Math.round(total * 0.5);
  return { lines, subtotal, discount, total, deposit, balance: total - deposit, items_count: count, promo };
}

function placeOrder(db: MockDb, user: MockUser, payload: CreateOrderPayload, meta: { source?: 'web' | 'manuel'; by?: MockUser } = {}): DbOrder {
  if (!payload.items.length) validation({ items: 'Le panier est vide.' });
  if (!['airtel', 'mtn'].includes(payload.payment_method)) validation({ payment_method: 'Choisissez un opérateur.' });
  if (!/^0[0-9]{8}$/.test(payload.payment_phone)) validation({ payment_phone: 'Numéro invalide (9 chiffres, ex. 06 123 45 67).' });
  if (!payload.delivery_city) validation({ delivery_city: 'Choisissez une ville de livraison.' });
  if (payload.delivery_address.trim().length < 3) validation({ delivery_address: "Précisez l'adresse de livraison." });
  const q = quoteOf(db, payload.items, payload.promo_code);
  adjustStock(db, q.lines, -1);
  q.lines.forEach((l) => {
    const p = db.products.find((x) => x.id === l.product_id);
    if (p) p.order_count += l.qty;
  });
  if (q.promo) q.promo.uses++;
  const order: DbOrder = {
    id: db.seq.order++,
    user_id: user.id,
    reference: reference(),
    status: 'en_attente',
    subtotal: q.subtotal,
    discount: q.discount,
    promo_code: q.promo?.code ?? null,
    promo_label: q.promo?.label ?? null,
    source: meta.source ?? 'web',
    total: q.total,
    deposit: q.deposit,
    balance: q.balance,
    balance_paid: false,
    payment_method: payload.payment_method,
    payment_phone: payload.payment_phone,
    delivery_city: payload.delivery_city,
    delivery_address: payload.delivery_address.trim(),
    items: q.lines,
    customer: { id: user.id, full_name: user.full_name, username: user.username },
    courier: null,
    delivery_date: null,
    delivery_slot: null,
    deposit_paid_at: null,
    created_at: new Date().toISOString(),
    delivered_at: null,
  };
  db.orders.unshift(order);
  logEvent(db, order.id, 'created', { to_status: 'en_attente', body: meta.source === 'manuel' ? 'Commande saisie par l’équipe' : null }, meta.by ?? user);
  return order;
}

function transition(db: MockDb, o: DbOrder, status: OrderStatus, by: MockUser | null, note: string | null = null) {
  const from = o.status;
  if (from === status) return;
  o.status = status;
  o.balance_paid = status === 'livre';
  o.delivered_at = status === 'livre' ? new Date().toISOString() : null;
  if (from === 'en_attente' && status !== 'annulee' && !o.deposit_paid_at) o.deposit_paid_at = new Date().toISOString();
  if (status === 'en_attente') o.deposit_paid_at = null;
  o.payment_claim = null;
  if (status === 'annulee') adjustStock(db, o.items, 1);
  else if (from === 'annulee') adjustStock(db, o.items, -1);
  logEvent(db, o.id, 'status', { from_status: from, to_status: status, body: note }, by);
}

function customerSummary(db: MockDb, u: MockUser): CustomerSummary {
  const orders = db.orders.filter((o) => o.user_id === u.id);
  const last = orders.map((o) => o.created_at).sort().pop() ?? null;
  return {
    id: u.id,
    full_name: u.full_name,
    username: u.username,
    email: u.email,
    phone: u.phone ?? null,
    avatar_url: u.avatar_url ?? null,
    city: u.default_city ?? orders.find((o) => o.created_at === last)?.delivery_city ?? null,
    admin_note: u.admin_note ?? null,
    has_account: !!u.password,
    orders_count: orders.length,
    total_spent: orders.filter((o) => o.status !== 'annulee').reduce((s, o) => s + o.total, 0),
    pending_count: orders.filter((o) => o.status === 'en_attente').length,
    last_order_at: last,
    created_at: u.created_at,
  };
}

const staffOf = (u: MockUser): StaffMember => ({ id: u.id, full_name: u.full_name, username: u.username, phone: u.phone ?? null, avatar_url: u.avatar_url ?? null, staff_role: staffRoleOf(u)!, created_at: u.created_at });

function keepOneManager(db: MockDb, u: MockUser) {
  if (staffRoleOf(u) !== 'gerant') return;
  if (db.users.filter((x) => staffRoleOf(x) === 'gerant').length <= 1) throw new ApiError("Il doit rester au moins un gérant dans l'équipe.", 422);
}

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
      sort === 'prix' ? a.price - b.price : sort === 'nouveautes' ? +new Date(b.created_at) - +new Date(a.created_at) : b.order_count - a.order_count,
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
    if (!USERNAME_RE.test(username))
      validation({
        username: "Nom d'utilisateur invalide (3 à 20 caractères : lettres, chiffres, . _ -).",
      });
    if (payload.password.length < 8)
      validation({
        password: 'Le mot de passe doit contenir au moins 8 caractères.',
      });
    if (db.users.some((u) => u.username === username)) validation({ username: "Ce nom d'utilisateur est déjà pris." });
    const email = payload.email?.trim().toLowerCase() || null;
    const phone = (payload.phone ?? '').replace(/\D/g, '').replace(/^(00)?242/, '') || null;
    if (payload.password !== payload.password_confirmation) validation({ password: 'Les deux mots de passe ne correspondent pas.' });
    if (!phone) validation({ phone: 'Indiquez votre numéro de téléphone.' });
    if (db.users.some((u) => u.phone === phone)) validation({ phone: 'Ce numéro est déjà utilisé par un autre compte. Connectez-vous ou utilisez un autre numéro.' });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) validation({ email: 'Adresse e-mail invalide.' });
    if (email && db.users.some((u) => u.email?.toLowerCase() === email)) validation({ email: 'Cette adresse e-mail est déjà utilisée par un autre compte.' });
    if (phone && !/^0\d{8}$/.test(phone)) validation({ phone: 'Numéro invalide : 9 chiffres commençant par 0 (ex. 06 444 55 66).' });
    const user: MockUser = {
      id: db.seq.user++,
      full_name: payload.full_name.trim(),
      username,
      email,
      phone,
      email_notifications: true,
      role: payload.role,
      is_admin: false,
      created_at: new Date().toISOString(),
      password: payload.password,
    };
    db.users.push(user);
    save(db);
    return {
      token: `mock-${user.id}-${Date.now()}`,
      user: publicUser(user),
    } satisfies AuthResponse;
  },

  async login(payload) {
    await delay();
    const db = load();
    const user = findByLogin(db, payload.login);
    if (!user || user.password !== payload.password) {
      validation({ login: 'Identifiant ou mot de passe incorrect.' });
    }
    return { token: `mock-${user.id}-${Date.now()}`, user: publicUser(user) };
  },

  async requestLoginCode(login, channel) {
    await delay();
    const db = load();
    const user = findByLogin(db, login);
    if (!user) validation({ login: 'Aucun compte ne correspond à cet identifiant.' });
    const prefer = channel ?? (parseLogin(login).type === 'phone' ? 'sms' : 'email');
    const ch = prefer === 'email' && user.email ? 'email' : prefer === 'sms' && user.phone ? 'sms' : user.email ? 'email' : user.phone ? 'sms' : null;
    if (!ch) validation({ login: 'Ce compte n’a ni e-mail ni téléphone : connectez-vous avec votre mot de passe.' });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    mockCodes.set(user.id, { code, expires: Date.now() + 600_000, tries: 0 });
    return {
      channel: ch,
      destination: ch === 'email' ? maskEmail(user.email!) : `+242 ${user.phone!.slice(0, 2)} ••• •• ${user.phone!.slice(-2)}`,
      expires_in: 600,
      dev_code: code,
    };
  },

  async verifyLoginCode(login, code) {
    await delay();
    const db = load();
    const user = findByLogin(db, login);
    const entry = user && mockCodes.get(user.id);
    if (!user || !entry || entry.expires < Date.now()) validation({ code: 'Ce code a expiré. Demandez-en un nouveau.' });
    if (entry.code !== code.trim()) {
      entry.tries++;
      const left = 5 - entry.tries;
      if (left <= 0) mockCodes.delete(user.id);
      validation({ code: left > 0 ? `Code incorrect. Il vous reste ${left} essai(s).` : 'Trop d’essais. Demandez un nouveau code.' });
    }
    mockCodes.delete(user.id);
    return { token: `mock-${user.id}-${Date.now()}`, user: publicUser(user) };
  },

  passkeys: {
    async list() {
      await delay(150);
      const u = currentUser(load());
      return clone((u.passkeys ?? []).map(({ credential_id: _c, ...p }) => (void _c, p)));
    },
    async registerOptions() {
      await delay(150);
      const u = currentUser(load());
      const challenge = randomB64();
      mockChallenges.set(challenge, true);
      return {
        publicKey: {
          rp: { name: 'Kōlā Collection', id: location.hostname },
          user: { id: b64url(new TextEncoder().encode(String(u.id))), name: u.username ?? `client-${u.id}`, displayName: u.full_name },
          challenge,
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          timeout: 60000,
          authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'required' },
          attestation: 'none',
          excludeCredentials: (u.passkeys ?? []).map((p) => ({ type: 'public-key', id: p.credential_id })),
        },
      };
    },
    async register(payload) {
      await delay();
      const db = load();
      const u = currentUser(db);
      const cd = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.client_data_json.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))));
      if (!mockChallenges.delete(cd.challenge)) validation({ passkey: 'Délai dépassé, recommencez.' });
      const ua = navigator.userAgent;
      const name = payload.name || (/iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Téléphone Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Ordinateur Windows' : 'Cet appareil');
      const pk = { id: Date.now(), name, credential_id: payload.id ?? randomB64(16), created_at: new Date().toISOString(), last_used_at: null };
      u.passkeys = [...(u.passkeys ?? []), pk];
      save(db);
      const { credential_id: _c, ...pub } = pk;
      void _c;
      return pub;
    },
    async remove(id) {
      await delay(150);
      const db = load();
      const u = currentUser(db);
      u.passkeys = (u.passkeys ?? []).filter((p) => p.id !== id);
      save(db);
    },
    async loginOptions() {
      await delay(150);
      const challenge = randomB64();
      mockChallenges.set(challenge, true);
      return { challenge_id: challenge, options: { publicKey: { challenge, rpId: location.hostname, timeout: 60000, userVerification: 'required', allowCredentials: [] } } };
    },
    async login(payload) {
      await delay();
      const db = load();
      // Démo : on vérifie seulement que la clé a été enregistrée ici (l'API Laravel, elle, vérifie la signature)
      const user = mockChallenges.delete(payload.challenge_id) ? db.users.find((u) => u.passkeys?.some((p) => p.credential_id === payload.id)) : undefined;
      if (!user) validation({ passkey: 'Empreinte non reconnue sur ce site. Connectez-vous autrement puis activez-la dans votre profil.' });
      user.passkeys!.find((p) => p.credential_id === payload.id)!.last_used_at = new Date().toISOString();
      save(db);
      return { token: `mock-${user.id}-${Date.now()}`, user: publicUser(user) };
    },
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

  async updateProfile(input) {
    await delay();
    const db = load();
    const user = currentUser(db);
    const errors: Record<string, string> = {};
    const next = { ...input };
    if (next.full_name !== undefined) {
      next.full_name = next.full_name.trim();
      if (!next.full_name) errors.full_name = 'Le nom est obligatoire.';
    }
    if (next.username !== undefined) {
      next.username = (next.username ?? '').trim().toLowerCase();
      if (!USERNAME_RE.test(next.username)) errors.username = "Nom d'utilisateur invalide : 3 à 20 caractères (lettres, chiffres, point, tiret ou underscore).";
      else if (db.users.some((u) => u.username === next.username && u.id !== user.id)) errors.username = "Ce nom d'utilisateur est déjà pris.";
    }
    if (next.email !== undefined) {
      next.email = next.email?.trim() || null;
      if (next.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next.email)) errors.email = 'Adresse e-mail invalide.';
      else if (next.email && db.users.some((u) => u.email === next.email && u.id !== user.id)) errors.email = 'Cette adresse e-mail est déjà utilisée.';
    }
    if (next.phone !== undefined) {
      const d = (next.phone ?? '').replace(/\D/g, '').replace(/^242/, '');
      next.phone = d || null;
      if (d && !/^0\d{8}$/.test(d)) errors.phone = 'Numéro invalide : 9 chiffres commençant par 0 (ex. 06 444 55 66).';
    }
    if (next.default_city && !['Brazzaville', 'Pointe-Noire'].includes(next.default_city)) errors.default_city = 'Ville non desservie.';
    if (Object.keys(errors).length) validation(errors);
    Object.assign(user, next);
    // Le nom affiché sur les commandes suit le profil
    db.orders.forEach((o) => {
      if (o.user_id === user.id)
        o.customer = {
          id: user.id,
          full_name: user.full_name,
          username: user.username,
        };
    });
    save(db);
    return publicUser(user);
  },

  async uploadAvatar(file) {
    await delay();
    const db = load();
    const user = currentUser(db);
    if (file.size > 3 * 1024 * 1024) validation({ avatar: 'La photo ne doit pas dépasser 3 Mo.' });
    (user as MockUser & { avatar_url?: string | null }).avatar_url = await blobToDataUrl(file);
    save(db);
    return publicUser(user);
  },

  async deleteAvatar() {
    await delay();
    const db = load();
    const user = currentUser(db);
    (user as MockUser & { avatar_url?: string | null }).avatar_url = null;
    save(db);
    return publicUser(user);
  },

  async updatePassword(input) {
    await delay();
    const db = load();
    const user = currentUser(db);
    if (user.password && input.current_password !== user.password) validation({ current_password: 'Le mot de passe actuel est incorrect.' });
    if (input.password.length < 8)
      validation({
        password: 'Le mot de passe doit contenir au moins 8 caractères.',
      });
    if (input.password !== input.password_confirmation) validation({ password: 'Les deux mots de passe ne correspondent pas.' });
    if (input.password === input.current_password)
      validation({
        password: "Le nouveau mot de passe doit être différent de l'actuel.",
      });
    user.password = input.password;
    save(db);
  },

  async logoutOthers() {
    await delay();
    return { revoked: 0 };
  },

  async quote(items, promoCode) {
    await delay(200);
    const db = load();
    const q = quoteOf(db, items, promoCode);
    return { subtotal: q.subtotal, discount: q.discount, total: q.total, deposit: q.deposit, balance: q.balance, items_count: q.items_count, promo: q.promo ? { code: q.promo.code, label: q.promo.label } : null };
  },

  async createOrder(payload) {
    await delay(600);
    const db = load();
    const user = currentUser(db);
    const order = placeOrder(db, user, payload);
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

  payments: {
    async config() {
      const st = settingsOf(load());
      return { enabled: false, driver: null, manual: { ...st.payment, whatsapp: st.whatsapp.shop_number || null } };
    },
    async claim(ref, input) {
      await delay();
      const db = load();
      const user = currentUser(db);
      const o = db.orders.find((x) => x.reference === ref && x.user_id === user.id);
      if (!o) throw new ApiError('Commande introuvable.', 404);
      const phone = input.payer_phone.replace(/\D/g, '').replace(/^(00)?242/, '');
      if (!/^0\d{8}$/.test(phone)) validation({ payer_phone: 'Numéro invalide : 9 chiffres commençant par 0.' });
      if (['annulee', 'livre'].includes(o.status)) validation({ payment: 'Cette commande n’attend plus de paiement.' });
      const kind = o.status === 'en_attente' ? 'deposit' : 'balance';
      const amount = kind === 'deposit' ? o.deposit : o.balance;
      o.payment_claim = { kind, amount, operator: input.operator, payer_phone: phone, transaction_ref: input.transaction_ref || null, at: new Date().toISOString() };
      logEvent(db, o.id, 'payment', { body: `Le client déclare avoir envoyé ${kind === 'deposit' ? 'l’acompte' : 'le solde'} (${amount} FCFA) par ${input.operator === 'mtn' ? 'MTN MoMo' : 'Airtel Money'} depuis le ${phone}${input.transaction_ref ? ` — réf. ${input.transaction_ref}` : ''}. À vérifier.` }, user);
      save(db);
      return stripOrder(o);
    },
    async start(ref, kind = 'deposit') {
      await delay();
      const db = load();
      const user = currentUser(db);
      const o = db.orders.find((x) => x.reference === ref && x.user_id === user.id);
      if (!o) throw new ApiError('Commande introuvable.', 404);
      if (kind === 'deposit' && o.status !== 'en_attente') validation({ payment: 'L’acompte de cette commande est déjà réglé.' });
      if (kind === 'balance' && (o.balance_paid || !['validee', 'transit'].includes(o.status))) validation({ payment: 'Le solde ne peut pas être réglé pour cette commande.' });
      const tx = `KOLA${Date.now().toString(36).toUpperCase()}`;
      const amount = kind === 'deposit' ? o.deposit : o.balance;
      db.payments.push({ order_id: o.id, transaction_id: tx, kind, amount, status: 'pending', reference: o.reference, paid_at: null });
      save(db);
      return { transaction_id: tx, amount, url: `/paiement/simulateur/${tx}?retour=${encodeURIComponent(`/commande/confirmation/${o.reference}?paiement=${tx}`)}` };
    },
    async status(tx) {
      await delay(200);
      const db = load();
      const p = db.payments.find((x) => x.transaction_id === tx);
      if (!p) throw new ApiError('Paiement introuvable.', 404);
      const { order_id: _o, ...rest } = p;
      void _o;
      return rest;
    },
    async fakeComplete(tx, success) {
      await delay(500);
      const db = load();
      const user = currentUser(db);
      const p = db.payments.find((x) => x.transaction_id === tx);
      if (!p) throw new ApiError('Paiement introuvable.', 404);
      if (p.status === 'pending') {
        p.status = success ? 'success' : 'failed';
        p.paid_at = success ? new Date().toISOString() : null;
        const o = db.orders.find((x) => x.id === p.order_id)!;
        const amount = `${p.amount.toLocaleString('fr-FR')} FCFA`;
        if (!success) logEvent(db, o.id, 'payment', { body: `Paiement Mobile Money échoué (${amount})` }, user);
        else if (p.kind === 'deposit' && o.status === 'en_attente') transition(db, o, 'validee', user, `Acompte de ${amount} payé en ligne (simulation)`);
        else {
          o.balance_paid = true;
          logEvent(db, o.id, 'payment', { body: `Solde de ${amount} payé en ligne (simulation)` }, user);
        }
        save(db);
      }
      const { order_id: _o, ...rest } = p as PaymentInfo & { order_id: number };
      void _o;
      return rest;
    },
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
      const by = requireRole(db, 'gerant', 'preparateur');
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new ApiError('Commande introuvable.', 404);
      transition(db, o, status, by);
      save(db);
      return stripOrder(o);
    },

    async setStock(id, stock) {
      await delay();
      const db = load();
      requireRole(db, 'gerant');
      const p = db.products.find((x) => x.id === id);
      if (!p) throw new ApiError('Article introuvable.', 404);
      p.stock = stock ? Object.fromEntries(p.sizes.map((sz) => [sz, Math.max(0, Math.floor(Number(stock[sz] ?? 0)))])) : null;
      save(db);
      return clone(p);
    },

    async lowStock() {
      await delay(200);
      const db = load();
      requireRole(db, 'gerant', 'preparateur');
      const coll = activeCollection(db);
      return db.products
        .filter((p) => p.collection_id === coll?.id && !p.is_archived && p.stock)
        .flatMap((p) => p.sizes.map((size) => ({ product_id: p.id, name: p.name, image_url: p.image_url, size, qty: Math.max(0, p.stock![size] ?? 0) })))
        .filter((r) => r.qty <= 3)
        .sort((a, b) => a.qty - b.qty);
    },

    async createOrder(payload) {
      await delay(600);
      const db = load();
      const by = requireRole(db, 'gerant', 'preparateur');
      let customer = payload.customer_id ? db.users.find((u) => u.id === payload.customer_id && !u.is_admin) : undefined;
      if (!customer && payload.customer) {
        const phone = payload.customer.phone.replace(/\D/g, '').replace(/^242/, '');
        if (!payload.customer.full_name.trim()) validation({ 'customer.full_name': 'Indiquez le nom du client.' });
        if (!/^0\d{8}$/.test(phone)) validation({ 'customer.phone': 'Téléphone invalide : 9 chiffres, ex. 06 123 45 67.' });
        customer = db.users.find((u) => !u.is_admin && u.phone === phone);
        if (!customer) {
          customer = { id: db.seq.user++, full_name: payload.customer.full_name.trim(), username: null, email: null, role: 'parent', is_admin: false, phone, created_at: new Date().toISOString(), password: '' };
          db.users.push(customer);
        }
      }
      if (!customer) validation({ 'customer.full_name': 'Choisissez ou créez un client.' });
      const o = placeOrder(db, customer, { ...payload, promo_code: payload.promo_code ?? null }, { source: 'manuel', by });
      if (payload.deposit_received) transition(db, o, 'validee', by, 'Acompte reçu à la prise de commande');
      save(db);
      return stripOrder(o);
    },

    async orderEvents(id) {
      await delay(200);
      const db = load();
      requireRole(db, 'gerant', 'preparateur');
      return db.events
        .filter((e) => e.order_id === id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
        .map(({ order_id: _o, ...e }) => (void _o, e));
    },

    async addOrderNote(id, body) {
      await delay(250);
      const db = load();
      const by = requireRole(db, 'gerant', 'preparateur');
      if (!body.trim()) validation({ body: 'La note est vide.' });
      const ev = logEvent(db, id, 'note', { body: body.trim() }, by);
      save(db);
      return ev;
    },

    async setDelivery(id, input) {
      await delay();
      const db = load();
      const by = requireRole(db, 'gerant', 'preparateur');
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new ApiError('Commande introuvable.', 404);
      const c = input.courier_id ? db.users.find((u) => u.id === input.courier_id && u.is_admin) : null;
      o.courier = c ? { id: c.id, full_name: c.full_name, phone: c.phone ?? null } : null;
      o.delivery_date = input.delivery_date;
      o.delivery_slot = input.delivery_slot;
      const date = o.delivery_date ? `le ${new Date(o.delivery_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}` : null;
      logEvent(db, o.id, 'delivery', { body: [c ? `Livreur : ${c.full_name}` : 'Livreur retiré', date, o.delivery_slot].filter(Boolean).join(' · ') }, by);
      save(db);
      return stripOrder(o);
    },

    async couriers() {
      await delay(200);
      const db = load();
      requireRole(db, 'gerant', 'preparateur');
      return db.users.filter((u) => ['livreur', 'gerant'].includes(staffRoleOf(u) ?? '')).map((u) => ({ id: u.id, full_name: u.full_name, phone: u.phone ?? null, staff_role: staffRoleOf(u)! }));
    },

    async deliveries(courierId) {
      await delay();
      const db = load();
      const me = requireAdmin(db);
      const mine = staffRoleOf(me) === 'livreur';
      const today = new Date().toISOString().slice(0, 10);
      return db.orders
        .filter((o) => ['validee', 'transit'].includes(o.status) || (o.status === 'livre' && (o.delivered_at ?? '').slice(0, 10) === today))
        .filter((o) => (mine ? o.courier?.id === me.id : !courierId || o.courier?.id === courierId))
        .map(stripOrder);
    },

    async startDelivery(id) {
      await delay();
      const db = load();
      const me = requireAdmin(db);
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new ApiError('Commande introuvable.', 404);
      if (staffRoleOf(me) === 'livreur' && o.courier?.id !== me.id) throw new ApiError('Cette livraison est confiée à un autre livreur.', 403);
      if (o.status !== 'validee') throw new ApiError('Seule une commande validée peut partir en livraison.', 422);
      transition(db, o, 'transit', me, 'Départ en livraison');
      save(db);
      return stripOrder(o);
    },

    async markDelivered(id, note) {
      await delay();
      const db = load();
      const me = requireAdmin(db);
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new ApiError('Commande introuvable.', 404);
      if (staffRoleOf(me) === 'livreur' && o.courier?.id !== me.id) throw new ApiError('Cette livraison est confiée à un autre livreur.', 403);
      if (!['validee', 'transit'].includes(o.status)) throw new ApiError('Cette commande ne peut pas être marquée livrée.', 422);
      transition(db, o, 'livre', me, note || 'Remise au client, solde encaissé');
      save(db);
      return stripOrder(o);
    },

    async customers() {
      await delay();
      const db = load();
      requireRole(db, 'gerant', 'preparateur');
      return db.users
        .filter((u) => !u.is_admin)
        .map((u) => customerSummary(db, u))
        .sort((a, b) => (b.last_order_at ?? '').localeCompare(a.last_order_at ?? ''));
    },

    async customer(id) {
      await delay();
      const db = load();
      requireRole(db, 'gerant', 'preparateur');
      const u = db.users.find((x) => x.id === id && !x.is_admin);
      if (!u) throw new ApiError('Client introuvable.', 404);
      const orders = db.orders.filter((o) => o.user_id === u.id);
      const sizes = new Map<string, { cat: Category | 'article'; size: string; qty: number }>();
      orders
        .filter((o) => o.status !== 'annulee')
        .flatMap((o) => o.items)
        .forEach((i) => {
          const cat = db.products.find((p) => p.id === i.product_id)?.cat ?? 'article';
          const k = `${cat}|${i.size}`;
          sizes.set(k, { cat, size: i.size, qty: (sizes.get(k)?.qty ?? 0) + i.qty });
        });
      return { ...customerSummary(db, u), usual_sizes: [...sizes.values()].sort((a, b) => b.qty - a.qty), orders: orders.map(stripOrder) };
    },

    async updateCustomerNote(id, note) {
      await delay(250);
      const db = load();
      requireRole(db, 'gerant', 'preparateur');
      const u = db.users.find((x) => x.id === id && !x.is_admin);
      if (!u) throw new ApiError('Client introuvable.', 404);
      u.admin_note = note?.trim() || null;
      save(db);
      return { id, admin_note: u.admin_note };
    },

    async team() {
      await delay();
      const db = load();
      requireRole(db, 'gerant');
      return db.users.filter((u) => u.is_admin).map(staffOf);
    },

    async createStaff(input) {
      await delay();
      const db = load();
      requireRole(db, 'gerant');
      const username = (input.username ?? '').trim().toLowerCase();
      if (!input.full_name?.trim()) validation({ full_name: 'Le nom est obligatoire.' });
      if (!USERNAME_RE.test(username)) validation({ username: "Nom d'utilisateur : 3 à 20 caractères (lettres, chiffres, . _ -)." });
      if (db.users.some((u) => u.username === username)) validation({ username: "Ce nom d'utilisateur est déjà pris." });
      if ((input.password ?? '').length < 8) validation({ password: 'Au moins 8 caractères.' });
      if (input.password !== input.password_confirmation) validation({ password: 'Les deux mots de passe ne correspondent pas.' });
      if (!/^0\d{8}$/.test(input.phone ?? '')) validation({ phone: 'Indiquez le téléphone du membre (9 chiffres).' });
      const u: MockUser = { id: db.seq.user++, full_name: input.full_name.trim(), username, email: null, role: 'parent', is_admin: true, staff_role: input.staff_role, phone: input.phone || null, created_at: new Date().toISOString(), password: input.password! };
      db.users.push(u);
      save(db);
      return staffOf(u);
    },

    async updateStaff(id, input) {
      await delay();
      const db = load();
      requireRole(db, 'gerant');
      const u = db.users.find((x) => x.id === id && x.is_admin);
      if (!u) throw new ApiError('Membre introuvable.', 404);
      if (input.staff_role && input.staff_role !== 'gerant') keepOneManager(db, u);
      if (input.full_name !== undefined) u.full_name = input.full_name.trim() || u.full_name;
      if (input.phone !== undefined) u.phone = input.phone || null;
      if (input.staff_role) u.staff_role = input.staff_role;
      if (input.password) u.password = input.password;
      save(db);
      return staffOf(u);
    },

    async removeStaff(id) {
      await delay();
      const db = load();
      const me = requireRole(db, 'gerant');
      const u = db.users.find((x) => x.id === id && x.is_admin);
      if (!u) throw new ApiError('Membre introuvable.', 404);
      if (u.id === me.id) throw new ApiError('Vous ne pouvez pas retirer votre propre accès.', 422);
      keepOneManager(db, u);
      u.is_admin = false;
      u.staff_role = null;
      save(db);
    },

    async promos() {
      await delay();
      const db = load();
      requireRole(db, 'gerant');
      return clone(db.promos).reverse();
    },

    async createPromo(input) {
      await delay();
      const db = load();
      requireRole(db, 'gerant');
      const code = input.code?.trim().toUpperCase() || null;
      if (code && !/^[A-Z0-9_-]{3,40}$/.test(code)) validation({ code: 'Code : 3 à 40 caractères, lettres et chiffres (ex. RENTREE26).' });
      if (code && db.promos.some((p) => p.code === code)) validation({ code: 'Ce code existe déjà.' });
      if (!input.label.trim()) validation({ label: 'Donnez un nom à la remise.' });
      if (!(input.value > 0)) validation({ value: 'Indiquez une valeur.' });
      const p: Promo = { ...input, code, id: db.seq.promo++, uses: 0, automatic: code === null };
      db.promos.push(p);
      save(db);
      return clone(p);
    },

    async updatePromo(id, input) {
      await delay();
      const db = load();
      requireRole(db, 'gerant');
      const p = db.promos.find((x) => x.id === id);
      if (!p) throw new ApiError('Promotion introuvable.', 404);
      const code = input.code?.trim().toUpperCase() || null;
      if (code && db.promos.some((x) => x.code === code && x.id !== id)) validation({ code: 'Ce code existe déjà.' });
      Object.assign(p, input, { code, automatic: code === null });
      save(db);
      return clone(p);
    },

    async deletePromo(id) {
      await delay();
      const db = load();
      requireRole(db, 'gerant');
      db.promos = db.promos.filter((x) => x.id !== id);
      save(db);
    },

    async settings() {
      await delay(150);
      const db = load();
      requireRole(db, 'gerant');
      return clone(settingsOf(db));
    },
    async updateSettings(input) {
      await delay();
      const db = load();
      requireRole(db, 'gerant');
      const cur = settingsOf(db);
      const next: ShopSettings = { payment: { ...cur.payment, ...input.payment }, whatsapp: { ...cur.whatsapp, ...input.whatsapp } };
      for (const op of ['mtn', 'airtel'] as const) {
        next.payment[op] = { ...cur.payment[op], ...input.payment?.[op] };
        const n = next.payment[op].number.replace(/\D/g, '').replace(/^(00)?242/, '');
        if (n && !/^0\d{8}$/.test(n)) validation({ [`payment.${op}.number`]: 'Numéro Mobile Money invalide : 9 chiffres commençant par 0.' });
        next.payment[op].number = n;
      }
      db.settings = next;
      save(db);
      return clone(next);
    },
    async testWhatsApp() {
      await delay();
      return { sent: true };
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
      const c = {
        id: db.seq.collection++,
        slug,
        name: name.trim(),
        is_active: false,
        created_at: new Date().toISOString(),
      };
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
        list.push({
          id: db.seq.carousel++,
          image_url: await fileToDataUrl(f),
          position: ++pos,
        });
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
