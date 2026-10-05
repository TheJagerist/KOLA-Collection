import type { CarouselImage, Collection, HomepageContent, Order, Product, User } from '../types';

/**
 * Données initiales du mock — reprises de la base Supabase de l'ancien site
 * (collections, contenu d'accueil, carrousel et catalogue réels).
 * Les images sont servies depuis /public/mock.
 */

export interface MockUser extends User {
  password: string;
}

export interface MockDb {
  version: number;
  users: MockUser[];
  collections: Collection[];
  homepage: Record<number, HomepageContent>; // par collection_id
  carousel: Record<number, CarouselImage[]>; // par collection_id
  products: Product[];
  orders: (Order & { user_id: number })[];
  seq: { user: number; collection: number; product: number; order: number; carousel: number };
}

export const SEED_VERSION = 3;

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
  return {
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
    seq: { user: 3, collection: 3, product: 7, order: 2, carousel: 6 },
  };
}
