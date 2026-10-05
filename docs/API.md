# Contrat d'API — Kōlā Collection

Ce document décrit **ce que le frontend React attend de l'API Laravel**. Il sert de référence commune entre le front (Mulho) et le back (Manu).

- La source de vérité côté front est `frontend/src/lib/api/types.ts`. Toute modification d'un endpoint doit être répercutée **dans les deux fichiers**.
- Le mock `frontend/src/lib/api/mock/index.ts` implémente déjà toutes les règles métier ci-dessous. En cas de doute sur un comportement, il fait office de spécification exécutable.

---

## 1. Conventions générales

| Sujet | Règle |
|---|---|
| Préfixe | Toutes les routes sont sous `/api` |
| Format | JSON, champs en `snake_case` |
| Enveloppe | Les réponses peuvent être enveloppées dans `{ "data": ... }` (API Resources Laravel) : le front sait gérer les deux formes |
| Authentification | **Laravel Sanctum, jeton Bearer** : `Authorization: Bearer <token>` |
| Erreurs de validation | HTTP **422**, au format Laravel standard : `{ "message": "...", "errors": { "champ": ["message"] } }` |
| Autres erreurs | 401 (non connecté), 403 (pas admin), 404 (introuvable), 409 (conflit, ex. aucune collection active) avec `{ "message": "..." }` |
| Montants | Entiers en **FCFA** (pas de centimes) |
| Dates | ISO 8601 (`2026-10-05T14:32:00+00:00`) |
| Langue des messages | Français (`APP_LOCALE=fr`) : les messages d'erreur sont affichés tels quels à l'utilisateur |
| Images | URLs **absolues ou relatives à la racine** (ex. `/storage/products/abc.webp`), servies via `php artisan storage:link` |

En développement, Vite redirige `/api` et `/storage` vers Nginx (`http://nginx` dans Docker). Le front et l'API partagent donc la même origine, et **aucune configuration CORS n'est nécessaire**. En production, servir le front et l'API sur le même domaine, ou configurer CORS pour `FRONTEND_URL`.

---

## 2. Modèle de données proposé

```
users
  id, full_name, username (unique, nullable), email (unique, nullable),
  password (nullable si Google), google_id (nullable), role enum(parent, eleve),
  is_admin bool default false, timestamps

collections
  id, slug (unique), name, is_active bool default false, timestamps
  → une seule collection active à la fois (contrainte applicative ou index partiel PostgreSQL :
    CREATE UNIQUE INDEX one_active_collection ON collections (is_active) WHERE is_active)

homepage_contents
  id, collection_id (FK, unique), hero_eyebrow, hero_title, hero_lede, cta_primary_label, timestamps

carousel_images
  id, collection_id (FK), path, position int, timestamps

products
  id, collection_id (FK), slug (unique), name, ensemble enum(garcon, fille),
  cat enum(chemise, pantalon, jupe), sizes jsonb, niveaux jsonb, price int,
  description text null, construction jsonb default [], badge varchar null,
  image_path null, sketch_path null, order_count int default 0,
  is_archived bool default false, timestamps

orders
  id, reference (unique, ex. KLA-2026-7F3K9Q), user_id (FK),
  status enum(en_attente, validee, transit, livre, annulee) default en_attente,
  total int, deposit int, balance int, balance_paid bool default false,
  payment_method enum(airtel, mtn), payment_phone varchar(9),
  delivery_city varchar, delivery_address varchar,
  delivered_at timestamp null, timestamps

order_items
  id, order_id (FK cascade), product_id (FK restrict), product_name (copie),
  size, niveau enum(college, lycee), qty int, unit_price int, line_total int
```

> `order_items.product_id` doit être en **`restrict`** : c'est ce qui empêche de supprimer un produit déjà commandé (il est alors archivé, voir §6).
> `product_name` et `unit_price` sont **copiés** au moment de la commande pour que l'historique ne change pas si l'article est modifié ensuite.

### Ressources JSON attendues

```jsonc
// User
{ "id": 2, "full_name": "Nathalie Mbemba", "username": "nathalie242", "email": null,
  "role": "parent", "is_admin": false, "created_at": "..." }

// Product
{ "id": 1, "collection_id": 1, "slug": "chemise-epaulette-kaki", "name": "Chemise à épaulettes kaki",
  "ensemble": "garcon", "cat": "chemise", "sizes": ["10","12","14","M"], "niveaux": ["college","lycee"],
  "price": 5000, "description": "...", "construction": ["Col chemise", "..."], "badge": "Best-seller",
  "image_url": "/storage/products/xxx.webp", "sketch_url": null,
  "order_count": 128, "is_archived": false, "created_at": "..." }

// Order
{ "id": 1, "reference": "KLA-2026-8QX2LM", "status": "validee",
  "total": 16500, "deposit": 8250, "balance": 8250, "balance_paid": false,
  "payment_method": "mtn", "payment_phone": "061234567",
  "delivery_city": "Pointe-Noire", "delivery_address": "Quartier Mpita, avenue de la Paix",
  "items": [
    { "product_id": 1, "product_name": "Chemise à épaulettes kaki", "product_image_url": "/storage/...",
      "size": "12", "niveau": "college", "qty": 2, "unit_price": 5000, "line_total": 10000 }
  ],
  "customer": { "id": 2, "full_name": "Nathalie Mbemba", "username": "nathalie242" }, // routes admin
  "created_at": "...", "delivered_at": null }
```

---

## 3. Vitrine (public)

### `GET /api/storefront`
Contenu de la collection active, pour la page d'accueil.
```json
{
  "collection": { "id": 1, "slug": "ecolier", "name": "Collection Écolier", "is_active": true, "created_at": "..." },
  "homepage": { "hero_eyebrow": "...", "hero_title": "...", "hero_lede": "...", "cta_primary_label": "Voir le catalogue" },
  "carousel": [ { "id": 1, "image_url": "/storage/carousel/1.webp", "position": 1 } ]
}
```
`collection` et `homepage` peuvent être `null` ; `carousel` est trié par `position`.

### `GET /api/products`
Produits **non archivés** de la collection active.

| Paramètre | Exemple | Effet |
|---|---|---|
| `ensemble[]` | `ensemble[]=garcon` | filtre (OU entre valeurs) |
| `cat[]` | `cat[]=chemise&cat[]=jupe` | filtre |
| `niveau[]` | `niveau[]=lycee` | produits dont `niveaux` contient au moins une des valeurs |
| `sort` | `populaires` (défaut, `order_count desc`), `prix` (`price asc`), `nouveautes` (`created_at desc`) | tri |

Réponse : `Product[]`.

### `GET /api/products/{idOrSlug}`
Accepte l'id **ou** le slug (le front utilise le slug dans l'URL `/produit/:slug`). Renvoie 404 si l'article est archivé.

---

## 4. Authentification

Le site n'utilise **pas d'e-mail** pour l'inscription classique : nom d'utilisateur + mot de passe.

### `POST /api/auth/register`
```json
{ "full_name": "Nathalie Mbemba", "username": "nathalie242", "password": "********", "role": "parent" }
```
Validation : `full_name` requis ; `username` requis, unique, regex `^[a-z0-9._-]{3,20}$` (le front l'envoie déjà en minuscules) ; `password` min 8 ; `role` ∈ `parent|eleve`.
Réponse **201** : `{ "token": "1|abc...", "user": User }`.

### `POST /api/auth/login`
```json
{ "username": "nathalie242", "password": "********" }
```
Réponse : `{ "token", "user" }`. Identifiants faux → **422** avec `errors.username = ["Nom d'utilisateur ou mot de passe incorrect."]`.
Prévoir un **rate limiting** (ex. `throttle:6,1`).

### `POST /api/auth/logout` 🔒
Révoque le jeton courant. Réponse 204.

### `GET /api/auth/me` 🔒
Renvoie `User`. Le front l'appelle au chargement pour restaurer la session.

### Google OAuth (Socialite)
1. `GET /api/auth/google/redirect` : redirige vers Google (le front fait `window.location.href = ...`).
2. `GET /api/auth/google/callback` : crée l'utilisateur ou le retrouve (par `google_id` puis `email`), crée un jeton Sanctum, puis **redirige vers le front** :
   `{FRONTEND_URL}/auth/callback?token=<token>`, ou `?error=<message>` en cas d'échec.
   Le front stocke le jeton puis appelle `/api/auth/me`.

---

## 5. Commandes (client) 🔒

### `POST /api/orders`
```json
{
  "items": [ { "product_id": 1, "size": "12", "niveau": "college", "qty": 2 } ],
  "payment_method": "mtn",
  "payment_phone": "061234567",
  "delivery_city": "Pointe-Noire",
  "delivery_address": "Mpita, avenue de la Paix"
}
```

**Règles métier, toutes obligatoires côté serveur :**
- ⚠️ Le front n'envoie **aucun prix**. `unit_price` est lu en base, puis `line_total = unit_price × qty`, `total = Σ line_total`, `deposit = round(total × 0.5)` et `balance = total − deposit`.
- Chaque produit doit exister, être non archivé et appartenir à la collection active ; `size` doit appartenir à `product.sizes` et `niveau` à `product.niveaux`.
- `qty` entre 1 et 20 ; `items` non vide.
- `payment_method` ∈ `airtel|mtn` ; `payment_phone` = regex `^0\d{8}$` (format congolais sans +242).
- `delivery_city` ∈ `Brazzaville|Pointe-Noire` ; `delivery_address` min 5 caractères.
- `reference` = `KLA-{année}-{6 caractères A-Z2-9}`, unique (re-générer en cas de collision).
- Incrémenter `products.order_count` de `qty`.
- Le tout **dans une transaction** (`DB::transaction`).

Erreurs sur une ligne : clé `items.{i}.product_id` / `items.{i}.size`… Le front affiche le premier message.
Réponse **201** : `Order`.

### `GET /api/orders`
Commandes de l'utilisateur connecté, les plus récentes en premier, avec `items`.

### `GET /api/orders/{reference}`
Une commande de l'utilisateur (ou n'importe laquelle si admin). 404 sinon.

---

## 6. Administration 🔒 + `is_admin`

Middleware : `auth:sanctum` + vérification `is_admin` (403 sinon). Toutes ces routes travaillent sur la **collection active** sauf mention contraire.

### Commandes
| Méthode | Route | Corps | Notes |
|---|---|---|---|
| GET | `/api/admin/orders?status=` | — | toutes les commandes, avec `items` et `customer` |
| PATCH | `/api/admin/orders/{id}` | `{ "status": "livre" }` | si `livre` : `balance_paid = true`, `delivered_at = now()` ; sinon : `balance_paid = false`, `delivered_at = null` |

Cycle de vie : `en_attente` (acompte non reçu) → `validee` (acompte reçu) → `transit` → `livre` (solde encaissé) ; `annulee` à tout moment.

### Collections
| Méthode | Route | Corps | Notes |
|---|---|---|---|
| GET | `/api/admin/collections` | — | toutes, triées par `created_at` |
| POST | `/api/admin/collections` | `{ "name" }` | slug généré, `is_active = false` |
| POST | `/api/admin/collections/{id}/activate` | — | désactive les autres et active celle-ci **dans une transaction** |

### Contenu d'accueil
| PUT | `/api/admin/homepage` | `{ hero_eyebrow, hero_title*, hero_lede, cta_primary_label }` | upsert pour la collection active ; 409 s'il n'y en a pas |
|---|---|---|---|

### Carrousel
| Méthode | Route | Corps | Notes |
|---|---|---|---|
| GET | `/api/admin/carousel` | — | images de la collection active, triées |
| POST | `/api/admin/carousel` | multipart `images[]` (image, max 10 Mo chacune) | ajoutées en fin de liste ; renvoie la liste complète |
| DELETE | `/api/admin/carousel/{id}` | — | supprime aussi le fichier ; 204 |
| POST | `/api/admin/carousel/reorder` | `{ "ids": [3,1,2] }` | `position = index + 1` ; renvoie la liste |

### Produits
| Méthode | Route | Corps | Notes |
|---|---|---|---|
| GET | `/api/admin/products` | — | tous les produits de la collection active, **archivés compris** |
| POST | `/api/admin/products` | multipart (voir ci-dessous) | 201 + `Product` |
| POST | `/api/admin/products/{id}` | multipart + `_method=PUT` | mise à jour partielle (method spoofing pour les fichiers) |
| DELETE | `/api/admin/products/{id}` | — | **supprime si jamais commandé, sinon archive** → `{ "archived": true\|false }` |
| POST | `/api/admin/products/{id}/restore` | — | `is_archived = false` |

Champs multipart produit : `name`, `price`, `ensemble`, `cat`, `sizes[]`, `niveaux[]`, `description`, `construction[]`, `badge`, `image` (fichier, optionnel), `sketch` (fichier, optionnel).
Conseil : convertir les images en WebP et les redimensionner (≤ 1600 px) à l'upload. L'extension GD est déjà présente dans l'image Docker.

---

## 7. Récapitulatif des routes

```
GET    /api/health
GET    /api/storefront
GET    /api/products
GET    /api/products/{idOrSlug}
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout                       🔒
GET    /api/auth/me                           🔒
GET    /api/auth/google/redirect
GET    /api/auth/google/callback
POST   /api/orders                            🔒
GET    /api/orders                            🔒
GET    /api/orders/{reference}                🔒
GET    /api/admin/orders                      🔒 admin
PATCH  /api/admin/orders/{id}                 🔒 admin
GET    /api/admin/collections                 🔒 admin
POST   /api/admin/collections                 🔒 admin
POST   /api/admin/collections/{id}/activate   🔒 admin
PUT    /api/admin/homepage                    🔒 admin
GET    /api/admin/carousel                    🔒 admin
POST   /api/admin/carousel                    🔒 admin
DELETE /api/admin/carousel/{id}               🔒 admin
POST   /api/admin/carousel/reorder            🔒 admin
GET    /api/admin/products                    🔒 admin
POST   /api/admin/products                    🔒 admin
POST   /api/admin/products/{id}               🔒 admin (_method=PUT)
DELETE /api/admin/products/{id}               🔒 admin
POST   /api/admin/products/{id}/restore       🔒 admin
```

## 8. Données de départ (seeders)

Les données réelles de l'ancien site (2 collections, textes d'accueil, 5 images de carrousel, 6 produits avec photos et croquis) sont dans `frontend/src/lib/api/mock/seed.ts`, et les images dans `frontend/public/mock/`. Elles peuvent être reprises telles quelles dans un `DatabaseSeeder`, avec un compte admin (`admin` / à définir).

## 9. État d'avancement de l'API

Voir `README-MANU.md` §3 et §5 : vitrine, authentification par nom d'utilisateur et commandes client sont implémentées et testées ; les routes admin et Google existent et renvoient `501` en attendant leur implémentation.

## 10. Basculer le front sur l'API réelle

Dans `.env` à la racine (ou `frontend/.env.local` hors Docker) : `VITE_API_MODE=http`, puis `docker compose up -d frontend`.
