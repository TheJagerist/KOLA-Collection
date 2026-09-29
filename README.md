# Kōlā Collection — Plateforme de commande d'uniformes scolaires

> Plateforme web de commande en ligne d'uniformes scolaires conformes au règlement en vigueur en République du Congo. Elle permet aux **parents** de commander pour leurs enfants et aux **élèves** de commander eux-mêmes, avec livraison à domicile à Brazzaville et Pointe-Noire.

---

## Contexte

Trouver l'uniforme réglementaire au Congo (kaki pour les garçons, bleu ciel et bleu de nuit pour les filles) passe encore souvent par le marché : files d'attente, prix variables, tailles non garanties. Kōlā centralise la commande en un catalogue clair, un paiement Mobile Money / Airtel Money, et une livraison suivie.

La plateforme cible exclusivement les niveaux **collège et lycée**.

---

## Stack technique

| Couche | Choix |
|---|---|
| Frontend | HTML / CSS / JavaScript vanille (SPA mono-fichier) |
| Backend / Auth | [Supabase](https://supabase.com) (Postgres + Auth + Storage + Edge Functions) |
| Hébergement | [Netlify](https://netlify.com) |
| Prise de commande | Lien WhatsApp pré-rempli (`wa.me`) généré côté client |

---

## Fonctionnalités

### Côté client
- Catalogue filtrable par ensemble (garçon/fille), catégorie (chemise, pantalon, jupe) et niveau scolaire
- Fiche produit avec description, détails de construction et croquis technique (si disponible)
- Panier avec ajustement des quantités, taille et niveau scolaire par article
- Acompte de 50 % à la commande, solde à la livraison
- À la validation, génération automatique d'un lien WhatsApp pré-rempli (récapitulatif complet) pour finaliser avec l'équipe Kōlā
- Guide des tailles avec tableaux garçon/fille et silhouettes SVG annotées

### Authentification
Trois méthodes disponibles :
- **Nom d'utilisateur + mot de passe** (méthode principale, sans e-mail)
- **Google OAuth**
- **SMS OTP** (interface présente, fournisseur SMS à configurer)

L'inscription distingue le profil **Parent** (commande pour ses enfants) et **Élève** (commande personnelle).

### Côté administration (`/admin`, accès `is_admin`)
- Gestion des **collections** (une seule active à la fois ; bascule catalogue + contenu accueil)
- Édition du **contenu de l'accueil** (accroche, titre, texte, libellé du CTA)
- Gestion du **carrousel** d'arrière-plan du hero (ajout, suppression, réordonnancement)
- **CRUD produits** avec upload d'image de couverture et de croquis technique
- Gestion des **commandes** : filtres par statut, changement de statut avec confirmation

Cycle de vie d'une commande : `en_attente → validee → transit → livre` (+ `annulee`).  
Le passage à `livre` enregistre automatiquement le solde comme encaissé.

---

## Structure du projet

```
KOLA-Collection/
├── index.html          # Application complète (SPA)
└── README.md
```

L'ensemble du frontend (HTML, CSS, JS) est contenu dans `index.html`. Les assets (images produits, carrousel, pages décoratives) sont hébergés dans le bucket Supabase Storage `product-images`.

---

## Configuration Supabase

Les deux variables à renseigner dans `index.html` (section `<script>`) :

```js
const SUPABASE_URL = 'https://<votre-projet>.supabase.co';
const SUPABASE_KEY = 'sb_publishable_...'; // clé publishable uniquement — jamais la secret key
```

### Schéma de base de données

| Table | Description |
|---|---|
| `profiles` | Créée automatiquement par trigger à l'inscription — `full_name`, `role`, `is_admin` |
| `collections` | Collections de produits (une seule `is_active` à la fois) |
| `homepage_content` | Contenu du hero par collection |
| `carousel_images` | Images du carrousel par collection |
| `products` | Catalogue — `name`, `price`, `cat`, `ensemble`, `sizes`, `niveaux`, `image_url`, `sketch_image_url` |
| `orders` | Commandes — statut, total, acompte, solde, méthode de paiement |
| `order_items` | Lignes de commande |

RLS activée sur toutes les tables. Le catalogue est en lecture publique ; les commandes ne sont visibles que par leur propriétaire.

### Edge Function

`register-user` — crée un compte Supabase Auth déjà confirmé à partir d'un nom d'utilisateur, sans envoi d'e-mail. Utilisée pour contourner l'absence de toggle « Confirm email » dans certains dashboards Supabase.

### Google OAuth

- Provider Google activé dans Supabase (Authentication > Providers)
- URI de redirection : `https://<votre-projet>.supabase.co/auth/v1/callback`
- Redirect URL Supabase : URL de production (ex. `https://kola-uniforme.netlify.app/**`)

---

## Lancement local

Aucun build requis. Ouvrir `index.html` directement dans un navigateur, ou via un serveur local :

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

> Les appels Supabase fonctionnent depuis `localhost` tant que l'URL est ajoutée dans **Supabase → Authentication → URL Configuration → Redirect URLs**.

---

## Déploiement (Netlify)

1. Connecter le dépôt GitHub à Netlify
2. Publish directory : `.` (racine)
3. Build command : *(laisser vide)*
4. Le fichier `index.html` est servi directement

---

## Roadmap

- [ ] SMS OTP — intégration fournisseur SMS (Twilio / Africa's Talking)
- [ ] Anti-spam inscription
- [ ] Récupération de mot de passe par SMS
- [ ] Paiement Mobile Money réel (Airtel Money / MTN Mobile Money)
- [ ] E-mail de confirmation de commande automatique
- [ ] Finalisation des mentions légales (RCCM, NIU, hébergeur)
- [ ] Photos produits réelles (remplacement des placeholders dégradés)

---

## Identité visuelle

Dérivée du logo Kōlā :

| Token | Valeur |
|---|---|
| Brun principal | `#3D2E1F` |
| Fond crème | `#F7F2E9` |
| Accent rouille (CTA) | `#C9622E` |
| Kaki uniforme | `#B5A47C` |
| Bleu nuit (hero) | `#1B2A4A` |
| Titres | Fraunces (serif) |
| Corps / UI | Work Sans |

---

*République du Congo · Brazzaville · Pointe-Noire*
