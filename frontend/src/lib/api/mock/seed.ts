import type {
  ShopSettings, CarouselImage, Collection, HomepageContent, Order, OrderEvent, OrderStatus, PaymentInfo, Product, Promo, StaffRole, User } from '../types';

/**
 * Données initiales du mock — reprises de la base Supabase de l'ancien site
 * (collections, contenu d'accueil, carrousel et catalogue réels).
 * Les images sont servies depuis /public/mock.
 */

export interface MockUser extends User {
  password: string;
  admin_note?: string | null;
  /** Démo : identifiants des passkeys enregistrées sur ce navigateur */
  passkeys?: { id: number; name: string; credential_id: string; created_at: string; last_used_at: string | null }[];
}

export interface MockDb {
  version: number;
  users: MockUser[];
  collections: Collection[];
  homepage: Record<number, HomepageContent>; // par collection_id
  carousel: Record<number, CarouselImage[]>; // par collection_id
  products: Product[];
  orders: (Order & { user_id: number })[];
  events: (OrderEvent & { order_id: number })[];
  promos: Promo[];
  /** Admin → Paramètres (démo) */
  settings?: ShopSettings;
  payments: (PaymentInfo & { order_id: number })[];
  seq: { user: number; collection: number; product: number; order: number; carousel: number; event: number; promo: number };
}

export const SEED_VERSION = 6;

const C1 = 1; // Collection Écolier (active)
const C2 = 2; // Hiver

const desc = {
  pantalonHomme:
    "Pantalon droit à pinces, coupe large et confortable, en tissu beige type gabardine. Taille haute avec ceinture à passants, braguette zippée protégée par une patte boutonnée. Poches obliques sur le devant et fausses poches passepoilées au dos. Un modèle à la fois élégant et décontracté, pensé pour un usage scolaire quotidien.",
  palazzo:
    'Pantalon taille haute bleu de nuit à coupe large et élégante, conçu dans un tissu de type tailleur. Sa ceinture large à rabat asymétrique et double bouton apporte une finition raffinée, tandis que les plis sur le devant et les poches latérales renforcent sa silhouette structurée et confortable.',
};

function product(p: Partial<Product> & Pick<Product, 'id' | 'name' | 'slug' | 'ensemble' | 'cat' | 'price'>): Product {
  return {
    collection_id: C1,
    sizes: ['10', '12', '14', 'M'],
    niveaux: ['college', 'lycee'],
    description: null,
    construction: [],
    badge: null,
    image_url: null,
    sketch_url: null,
    order_count: 0,
    is_archived: false,
    created_at: '2026-10-03T07:26:24.000Z',
    ...p,
  };
}

export function createSeed(): MockDb {
  const db: MockDb = {
    version: SEED_VERSION,
    users: [
      {
        id: 1,
        full_name: 'Administrateur Kōlā',
        username: 'admin',
        email: null,
        role: 'parent',
        is_admin: true,
        created_at: '2026-09-28T10:00:00.000Z',
        password: 'admin1234',
      },
      {
        id: 2,
        full_name: 'Nathalie Mbemba',
        username: 'nathalie242',
        email: null,
        role: 'parent',
        is_admin: false,
        created_at: '2026-09-30T10:00:00.000Z',
        password: 'kola1234',
      },
    ],
    collections: [
      { id: C1, slug: 'ecolier', name: 'Collection Écolier', is_active: true, created_at: '2026-09-28T23:12:39.000Z' },
      { id: C2, slug: 'hiver', name: 'Hiver', is_active: false, created_at: '2026-09-29T10:35:25.000Z' },
    ],
    homepage: {
      [C1]: {
        hero_eyebrow: "L'uniforme de la rentrée, sans la queue au marché",
        hero_title: "L'uniforme scolaire, commandé en quelques clics.",
        hero_lede:
          "Kōlā habille les élèves du Congo avec l'uniforme réglementaire : kaki pour les garçons, bleu ciel et bleu de nuit pour les filles. Commandez pour votre enfant, ou commandez vous-même. Livré directement chez vous.",
        cta_primary_label: 'Voir le catalogue',
      },
    },
    carousel: {
      [C1]: [1, 2, 3, 4, 5].map((n, i) => ({ id: n, image_url: `/mock/carousel/${n}.webp`, position: i + 1 })),
      [C2]: [],
    },
    products: [
      product({
        id: 1,
        slug: 'chemise-epaulette-kaki',
        name: 'Chemise à épaulettes kaki',
        ensemble: 'garcon',
        cat: 'chemise',
        price: 5000,
        order_count: 128,
        badge: 'Best-seller',
        description: 'Chemise à manches courtes, deux poches plaquées à rabat et épaulettes boutonnées. Tissu kaki résistant, facile à repasser.',
        construction: ['Col chemise classique', 'Deux poches poitrine à rabat', 'Épaulettes boutonnées', 'Patte de boutonnage cachée', 'Manches courtes ourlées'],
        image_url: '/mock/products/chemise-epaulette-kaki.webp',
        created_at: '2026-10-03T08:10:00.000Z',
      }),
      product({
        id: 2,
        slug: 'pantalon-homme-coupe-large',
        name: 'Pantalon garçon coupe large',
        ensemble: 'garcon',
        cat: 'pantalon',
        price: 6500,
        order_count: 96,
        sizes: ['10', '12', '14', '16', 'S', 'M'],
        description: desc.pantalonHomme,
        construction: [
          'Ceinture avec passants et bouton de fermeture',
          'Braguette zippée avec patte de protection boutonnée',
          'Poches latérales obliques',
          'Pinces creuses au niveau de la taille',
          'Poches arrière passepoilées',
          'Ourlet droit, jambe large',
        ],
        image_url: '/mock/products/pantalon-homme-coupe-large.webp',
        sketch_url: '/mock/sketches/pantalon-homme-coupe-large.webp',
        created_at: '2026-10-03T07:26:24.000Z',
      }),
      product({
        id: 3,
        slug: 'chemise-epaulette-bleu-ciel',
        name: 'Chemise à épaulettes bleu ciel',
        ensemble: 'fille',
        cat: 'chemise',
        price: 5000,
        order_count: 112,
        badge: 'Nouveau',
        description: 'Chemise à manches courtes bleu ciel, deux poches plaquées et épaulettes. Coupe droite, confortable toute la journée.',
        construction: ['Col chemise', 'Deux poches poitrine à rabat', 'Épaulettes boutonnées', 'Manches courtes'],
        image_url: '/mock/products/chemise-epaulette-bleu-ciel.webp',
        sketch_url: '/mock/sketches/chemise-epaulette-bleu-ciel.webp',
        created_at: '2026-10-03T08:20:00.000Z',
      }),
      product({
        id: 4,
        slug: 'jupe-bleu-nuit-longue',
        name: 'Jupe longue plissée bleu nuit',
        ensemble: 'fille',
        cat: 'jupe',
        price: 5000,
        order_count: 74,
        description: 'Jupe longue plissée en couronne, tissu léger bleu de nuit idéal pour un confort quotidien.',
        construction: ['Taille haute', 'Plis couchés réguliers', 'Fermeture invisible au dos', 'Longueur cheville'],
        image_url: '/mock/products/jupe-bleu-couronne-longue.webp',
        created_at: '2026-10-03T07:50:00.000Z',
      }),
      product({
        id: 5,
        slug: 'pantalon-palazzo-bleu-nuit',
        name: 'Pantalon palazzo bleu nuit',
        ensemble: 'fille',
        cat: 'pantalon',
        price: 6500,
        order_count: 51,
        description: desc.palazzo,
        construction: ['Ceinture large à rabat asymétrique', 'Double bouton', 'Plis sur le devant', 'Poches latérales', 'Jambe large'],
        image_url: '/mock/products/pantalon-palazzo-bleu-nuit.webp',
        sketch_url: '/mock/sketches/pantalon-palazzo-bleu-nuit.webp',
        created_at: '2026-10-03T07:40:00.000Z',
      }),
      product({
        id: 6,
        slug: 'jupe-grise',
        name: 'Jupe grise',
        ensemble: 'fille',
        cat: 'jupe',
        price: 3500,
        sizes: ['10', '12', '14'],
        is_archived: true,
        image_url: '/mock/products/jupe-grise.webp',
        sketch_url: '/mock/sketches/jupe-grise.webp',
        created_at: '2026-09-29T10:00:00.000Z',
      }),
    ],
    orders: [
      {
        id: 1,
        user_id: 2,
        reference: 'KLA-2026-8QX2LM',
        status: 'validee',
        total: 16500,
        deposit: 8250,
        balance: 8250,
        balance_paid: false,
        payment_method: 'mtn',
        payment_phone: '061234567',
        delivery_city: 'Pointe-Noire',
        delivery_address: 'Quartier Mpita, avenue de la Paix',
        items: [
          { product_id: 1, product_name: 'Chemise à épaulettes kaki', product_image_url: '/mock/products/chemise-epaulette-kaki.webp', size: '12', niveau: 'college', qty: 2, unit_price: 5000, line_total: 10000 },
          { product_id: 2, product_name: 'Pantalon garçon coupe large', product_image_url: '/mock/products/pantalon-homme-coupe-large.webp', size: '12', niveau: 'college', qty: 1, unit_price: 6500, line_total: 6500 },
        ],
        customer: { id: 2, full_name: 'Nathalie Mbemba', username: 'nathalie242' },
        created_at: '2026-10-01T09:12:00.000Z',
        delivered_at: null,
      },
    ],
    events: [],
    promos: [
      { id: 1, code: null, label: 'Remise famille dès 3 articles', type: 'percent', value: 10, min_items: 3, min_total: 0, is_active: false, starts_at: null, ends_at: null, max_uses: null, uses: 0, automatic: true },
      { id: 2, code: 'RENTREE26', label: 'Rentrée 2026', type: 'amount', value: 1000, min_items: 0, min_total: 10000, is_active: true, starts_at: null, ends_at: null, max_uses: 200, uses: 12, automatic: false },
    ],
    payments: [],
    seq: { user: 3, collection: 3, product: 7, order: 2, carousel: 6, event: 1, promo: 3 },
  };
  addDemoActivity(db);
  // Équipe de démonstration (rôles) — mot de passe kola1234
  const staff: [string, string, StaffRole, string | null][] = [
    ['prepa', 'Préparateur Kōlā', 'preparateur', null],
    ['livreur', 'Livreur Kōlā', 'livreur', '055555555'],
  ];
  staff.forEach(([username, full_name, staff_role, phone]) =>
    db.users.push({ id: db.seq.user++, full_name, username, email: null, role: 'parent', is_admin: true, staff_role, phone, created_at: new Date().toISOString(), password: 'kola1234' }),
  );
  db.users.forEach((u) => {
    if (u.is_admin && !u.staff_role) u.staff_role = 'gerant';
  });
  // Stock suivi sur deux articles pour la démo (alerte « stock bas »)
  db.products.forEach((p) => {
    if (p.slug === 'chemise-epaulette-kaki') p.stock = { '10': 14, '12': 3, '14': 0, M: 9 };
    if (p.slug === 'jupe-bleu-nuit-longue') p.stock = { '10': 6, '12': 2, '14': 8, M: 5 };
  });
  // Historique minimal des commandes de démo
  db.orders.forEach((o) => {
    db.events.push({ id: db.seq.event++, order_id: o.id, type: 'created', from_status: null, to_status: 'en_attente', body: null, created_at: o.created_at, user: o.customer ? { id: o.customer.id, full_name: o.customer.full_name, is_staff: false } : null });
    if (o.status !== 'en_attente') db.events.push({ id: db.seq.event++, order_id: o.id, type: 'status', from_status: 'en_attente', to_status: o.status, body: null, created_at: o.delivered_at ?? o.created_at, user: { id: 1, full_name: 'Administrateur Kōlā', is_staff: true } });
    o.subtotal = o.total;
    o.discount = 0;
    o.source = 'web';
  });
  return db;
}

/* ------------------------------------------------------------------
   Activité de démonstration : clients et commandes répartis sur les
   90 derniers jours, pour que le tableau de bord admin ait de la matière.
   Générateur pseudo-aléatoire à graine fixe → mêmes données à chaque reset.
   ------------------------------------------------------------------ */
const DEMO_CUSTOMERS = [
  'Grâce Loubaki', 'Prisca Ngoma', 'Arsène Malonga', 'Ruth Moukala', 'Christelle Bouanga', 'Hervé Kimbembe',
  'Sandrine Okemba', 'Junior Massamba', 'Bénédicte Nkounkou', 'Josué Mabiala', 'Aurélie Itoua', 'Fabrice Mavoungou',
];
const QUARTIERS = {
  Brazzaville: ['Bacongo', 'Poto-Poto', 'Moungali', 'Ouenzé', 'Talangaï', 'Makélékélé', 'Mfilou'],
  'Pointe-Noire': ['Mpita', 'Loandjili', 'Tié-Tié', 'Mvou-Mvou', 'Lumumba', 'Ngoyo'],
} as const;

function addDemoActivity(db: MockDb) {
  let seed = 20260924;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
  const now = Date.now();
  const day = 86_400_000;
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const ref = () => 'KLA-2026-' + Array.from({ length: 6 }, () => pick(letters.split(''))).join('');

  DEMO_CUSTOMERS.forEach((full_name, i) => {
    db.users.push({
      id: 10 + i,
      full_name,
      username: full_name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + (240 + i),
      email: null,
      role: i % 4 === 3 ? 'eleve' : 'parent',
      is_admin: false,
      created_at: new Date(now - (95 - i * 6) * day).toISOString(),
      password: 'kola1234',
    });
  });

  const catalogue = db.products.filter((p) => !p.is_archived);
  let id = 2;
  for (let d = 89; d >= 0; d--) {
    // La rentrée approche : de plus en plus de commandes
    const n = Math.floor(rnd() * (1.3 + (89 - d) / 45));
    for (let k = 0; k < n; k++) {
      const user = db.users[2 + Math.floor(rnd() * DEMO_CUSTOMERS.length)];
      const items = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => {
        const p = pick(catalogue);
        const qty = 1 + Math.floor(rnd() * 3);
        return {
          product_id: p.id,
          product_name: p.name,
          product_image_url: p.image_url,
          size: pick(p.sizes),
          niveau: pick(p.niveaux),
          qty,
          unit_price: p.price,
          line_total: qty * p.price,
        };
      });
      const total = items.reduce((s, i) => s + i.line_total, 0);
      const deposit = Math.ceil(total / 2);
      const created = now - d * day - Math.floor(rnd() * 10) * 3_600_000;
      const r = rnd();
      // Les commandes anciennes sont plus avancées dans le circuit de livraison
      const status: OrderStatus =
        r < 0.06 ? 'annulee' : d > 12 ? (r < 0.85 ? 'livre' : 'transit') : d > 5 ? pick(['validee', 'transit', 'livre'] as const) : pick(['en_attente', 'en_attente', 'validee'] as const);
      const city = rnd() < 0.55 ? 'Brazzaville' : 'Pointe-Noire';
      db.orders.push({
        id: id++,
        user_id: user.id,
        reference: ref(),
        status,
        total,
        deposit,
        balance: total - deposit,
        balance_paid: status === 'livre',
        payment_method: rnd() < 0.5 ? 'airtel' : 'mtn',
        payment_phone: `0${pick(['5', '6'])}${Math.floor(1_000_000 + rnd() * 8_999_999)}`,
        delivery_city: city,
        delivery_address: `Quartier ${pick(QUARTIERS[city])}`,
        items,
        customer: { id: user.id, full_name: user.full_name, username: user.username },
        created_at: new Date(created).toISOString(),
        delivered_at: status === 'livre' ? new Date(Math.min(now, created + 3 * day)).toISOString() : null,
      });
    }
  }
  db.orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
  db.seq.order = id;
  db.seq.user = 10 + DEMO_CUSTOMERS.length;
}
