# 👋 Manu — prise en main du backend Kōlā

Salut Manu ! Ce document résume **ce qui est déjà en place côté backend**, **comment lancer le projet** et **ce qu'il te reste à faire**.
Le frontend (React) est géré par Mulho ; le contrat entre nous deux est dans [`docs/API.md`](docs/API.md).

> TL;DR
> ```bash
> docker compose up -d --build      # tout démarre, la base se remplit toute seule
> docker compose exec api php artisan test   # 17 tests au vert
> ```
> Front : http://localhost:5173 · API : http://localhost:8000/api/health · Admin : `admin` / `admin1234`

## 🔐 Se connecter à l'administration

* Nom d'utilisateur : `admin`
* Mot de passe : `admin1234`

Connecte-toi sur http://localhost:5173/connexion, tu arrives ensuite directement sur le tableau de bord admin.

> Ces identifiants sont créés par `AdminSeeder` (modifiables via `ADMIN_USERNAME` / `ADMIN_PASSWORD` dans `backend/.env`). **À changer avant la mise en production.**

---

## 1. Le projet en 30 secondes

Kōlā Collection vend des **uniformes scolaires** au Congo (Brazzaville, Pointe-Noire).
Parcours client : catalogue → panier → commande → **acompte de 50 %** via Airtel Money / MTN MoMo (finalisé sur WhatsApp pour l'instant) → livraison → solde à la livraison.
Un back-office permet de gérer commandes, produits, collections et page d'accueil.

| Couche | Techno |
|---|---|
| API | **Laravel 13**, PHP 8.3, **Sanctum** (jetons Bearer) |
| Base | **PostgreSQL 16** |
| Front | React 19 + TypeScript + Vite + Tailwind 4 (dossier `frontend/`) |
| Dev | Docker Compose (PHP-FPM, Nginx, Postgres, Node) |

---

## 2. Lancer le projet

### Prérequis
- **Docker Desktop** (Windows / macOS) ou Docker Engine + Compose v2 (Linux)
- Git. Rien d'autre : PHP, Composer, Node et Postgres tournent dans les conteneurs.

### Premier lancement
```bash
git clone https://github.com/TheJagerist/KOLA-Collection.git
cd KOLA-Collection
docker compose up -d --build
```
Au premier démarrage, le conteneur `api` fait automatiquement (voir `docker/php/entrypoint.sh`) :
1. copie `backend/.env.example` → `backend/.env` si absent ;
2. `composer install` si `vendor/` est absent ;
3. `php artisan key:generate` ;
4. attend Postgres puis `php artisan migrate` ;
5. `php artisan storage:link` ;
6. `php artisan kola:seed-if-empty` → remplit la base **uniquement si elle est vide**.

Compte 2–4 minutes la première fois. Suivre l'avancement : `docker compose logs -f api`.

| Service | URL / port | Rôle |
|---|---|---|
| Front | http://localhost:5173 | Vite, proxy `/api` et `/storage` vers Nginx |
| API | http://localhost:8000 | Nginx → PHP-FPM |
| Postgres | `localhost:5433` — base `kola`, user `kola`, mdp `secret` | pour DBeaver / TablePlus |
| Adminer (optionnel) | http://localhost:8080 | `docker compose --profile tools up -d` |

### Comptes de départ (seeders)
| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Admin | `admin` | `admin1234` (modifiable via `ADMIN_USERNAME` / `ADMIN_PASSWORD` dans `backend/.env`) |
| Client démo | `nathalie242` | `kola1234` (créé seulement hors production) |

### Brancher le front sur ton API
Par défaut le front tourne en **mode démo** (`VITE_API_MODE=mock`, données simulées dans le navigateur). Pour qu'il appelle ton API :
```bash
cp .env.example .env          # à la racine du dépôt
# mettre VITE_API_MODE=http dans .env
docker compose up -d frontend
```
👉 Aujourd'hui, en mode `http`, **tout le parcours client fonctionne** (accueil, catalogue, fiche, inscription, connexion, commande, suivi). Les pages **admin** affichent des erreurs tant que les endpoints admin ne sont pas codés (ils renvoient 501, voir §5).

### Commandes utiles
```bash
docker compose exec api php artisan migrate:fresh --seed   # repartir d'une base propre
docker compose exec api php artisan test                    # tests (SQLite en mémoire, ne touche pas ta base)
docker compose exec api php artisan route:list --path=api
docker compose exec api php artisan tinker
docker compose exec api vendor/bin/pint                     # formatage du code (style Laravel)
docker compose exec api composer require laravel/socialite
docker compose logs -f api                                  # logs (storage/logs/laravel.log aussi)
docker compose down        # arrêter      |   docker compose down -v   # arrêter ET effacer la base
```

> **Windows** : laisse Git gérer les fins de ligne (`.gitattributes` force LF sur les scripts Docker). Si le conteneur `api` boucle avec `bad interpreter`, c'est un `entrypoint.sh` en CRLF → `git checkout -- docker/` après avoir vérifié `core.autocrlf`.

---

## 3. Ce qui est déjà fait ✅

### Arborescence backend
```
backend/
├── app/
│   ├── Enums/                 Ensemble, Category, Niveau, Role, PaymentMethod, OrderStatus, DeliveryCity
│   ├── Models/                User, Collection, HomepageContent, CarouselImage, Product, Order, OrderItem
│   ├── Services/OrderService  création de commande (prix recalculés, transaction, verrous)
│   ├── Support/Media          URL publiques /storage/..., store()/delete() des fichiers
│   ├── Http/
│   │   ├── Controllers/Api/   StorefrontController, ProductController, AuthController, OrderController ✅
│   │   │   ├── GoogleAuthController                                                    🚧 (501)
│   │   │   └── Admin/         Order, Collection, Homepage, Carousel, Product                🚧 (501)
│   │   ├── Middleware/EnsureUserIsAdmin   alias « admin »
│   │   ├── Requests/          RegisterRequest, LoginRequest, StoreOrderRequest (messages FR)
│   │   └── Resources/         User, Collection, HomepageContent, CarouselImage, Product, Order
│   └── Providers/AppServiceProvider   rate limiting (auth, orders), Model::shouldBeStrict en dev
├── database/
│   ├── migrations/            users (modifiée), collections + homepage + carousel, products, orders + order_items
│   ├── factories/             User (->admin()), Collection (->active()), Product, Order
│   └── seeders/               AdminSeeder, CatalogueSeeder (vraies données + images), DemoSeeder
│       └── images/            photos, croquis et carrousel de l'ancien site (WebP)
├── lang/fr/                   validation.php, auth.php
├── routes/api.php             toutes les routes du contrat (✅ / 🚧 indiqués en commentaire)
├── routes/console.php         commande kola:seed-if-empty
└── tests/Feature/             StorefrontTest, AuthTest, OrderTest (17 tests, 84 assertions)
```

### Base de données
| Table | Points clés |
|---|---|
| `users` | `full_name`, `username` (unique, minuscules), `email` et `password` **nullable** (comptes Google), `google_id`, `phone`, `role` (`parent`/`eleve`), `is_admin` |
| `collections` | `slug`, `name`, `is_active` — **index unique partiel** : une seule collection active possible |
| `homepage_contents` | 1 par collection (textes du hero) |
| `carousel_images` | `path`, `position` par collection |
| `products` | `ensemble`, `cat`, `sizes` / `niveaux` / `construction` en **jsonb**, `price` (entier FCFA), `image_path`, `sketch_path`, `order_count`, `is_archived` |
| `orders` | `reference` unique (`KLA-2026-XXXXXX`), `status`, `total` / `deposit` / `balance`, `balance_paid`, paiement, livraison, `delivered_at` |
| `order_items` | copie de `product_name` et `unit_price` au moment de la commande ; FK produit en **restrict** |

### Endpoints opérationnels
| Méthode | Route | |
|---|---|---|
| GET | `/api/health` | ✅ |
| GET | `/api/storefront` | ✅ collection active + textes + carrousel |
| GET | `/api/products` | ✅ filtres `ensemble[]`, `cat[]`, `niveau[]`, tri `populaires`/`prix`/`nouveautes` |
| GET | `/api/products/{id ou slug}` | ✅ 404 si archivé ou hors collection active |
| POST | `/api/auth/register`, `/api/auth/login` | ✅ jeton Sanctum, limité à 10/min/IP |
| POST/GET | `/api/auth/logout`, `/api/auth/me` | ✅ |
| GET/POST | `/api/orders` | ✅ liste perso / création (10/min) |
| GET | `/api/orders/{reference}` | ✅ la sienne (ou toutes pour un admin) |

### Règles de sécurité déjà en place (à conserver !)
- **Les prix ne viennent jamais du client** : `OrderService::place()` relit les prix en base, calcule total / acompte (arrondi) / solde, vérifie produit visible + taille + niveau, le tout dans une **transaction** avec `lockForUpdate`. Testé (`OrderTest::test_prices_are_computed_server_side...`).
- `is_admin` est **hors `$fillable`** : impossible de se donner les droits via une requête (testé).
- Les routes `/api/admin/*` passent par `auth:sanctum` + `admin` (403 sinon, testé).
- Un produit déjà commandé ne peut pas être supprimé (FK restrict → il faudra l'archiver, testé).
- `phpunit.xml` **force SQLite en mémoire** : lancer les tests ne vide jamais ta base de dev.

### Conventions du projet
- **Montants** : entiers en FCFA (`unsignedInteger`), jamais de float.
- **Enums PHP** castés sur les modèles (`$product->cat === Category::Jupe`). Dans le JSON on renvoie `->value`.
- **Réponses** : toujours via les API Resources (`app/Http/Resources`). Le front accepte `{ data: ... }`.
- **Images** : chemin relatif en base (`products/abc.webp`), URL publique `/storage/products/abc.webp` via `Media::url()`.
- **Messages d'erreur en français** : ils sont affichés tels quels à l'utilisateur. Messages spécifiques dans les FormRequests, génériques dans `lang/fr/validation.php`.
- **Mode strict Eloquent en dev** (`Model::shouldBeStrict`) : une relation non chargée lève une exception → pense aux `->with(...)`.
- **Erreurs JSON** : `bootstrap/app.php` force le JSON pour `/api/*`.
- Style : `vendor/bin/pint` avant chaque commit.

---

## 4. Le contrat avec le front

Tout est dans [`docs/API.md`](docs/API.md) : formats JSON exacts, codes HTTP, règles métier.
La source de vérité côté front est `frontend/src/lib/api/types.ts`, et **le mock `frontend/src/lib/api/mock/index.ts` implémente déjà toutes les règles** : en cas de doute sur un comportement attendu (ex. suppression → archivage), lis-le, c'est une spec exécutable.

Si tu dois changer un format de réponse : préviens Mulho et mettez à jour `docs/API.md` + `types.ts` ensemble.

---

## 5. Ce qu'il te reste à faire 🚧

Les endpoints ci-dessous **existent déjà dans `routes/api.php`** et renvoient `501 Pas encore implémenté`. Chaque méthode de contrôleur contient en commentaire ce qu'elle doit faire. Ordre conseillé :

### Priorité 1 — Back-office (bloque l'admin côté front)
- [ ] **Commandes admin** — `Api/Admin/OrderController`
  - `GET /api/admin/orders?status=` : toutes les commandes, récentes d'abord, `with('items.product', 'user')` (le champ `customer` apparaît alors).
  - `PATCH /api/admin/orders/{order}` `{status}` : valider avec `Rule::enum(OrderStatus::class)` puis `$order->transitionTo(...)` (gère déjà `balance_paid` / `delivered_at`).
- [ ] **Collections** — `Api/Admin/CollectionController` : liste, création (slug unique), activation via `$collection->activate()`.
- [ ] **Contenu d'accueil** — `Api/Admin/HomepageController@update` : upsert pour la collection active, 409 si aucune.
- [ ] **Carrousel** — `Api/Admin/CarouselController` : liste, upload multiple `images[]` (≤ 10 Mo, images seulement), suppression (+ fichier), réordonnancement `{ids: [...]}`.
- [ ] **Produits** — `Api/Admin/ProductController` :
  - liste (archivés compris) ; création / modification en **multipart** (`sizes[]`, `niveaux[]`, `construction[]`, `image`, `sketch`) — le front envoie la modification en `POST` + `_method=PUT` ;
  - `DELETE` : **archive** si le produit a déjà été commandé (`{archived: true}`), sinon supprime vraiment (+ fichiers) ;
  - `POST .../restore` : désarchive.
  - Pense à créer des FormRequests dans `app/Http/Requests/Admin/`.
- [ ] **Tests** pour chacun (exemples à copier dans `tests/Feature/OrderTest.php`, factories `->admin()` prêtes). Quand un endpoint est fait, mets à jour `test_google_and_admin_endpoints_not_yet_implemented...` dans `AuthTest`.

✅ *Critère de fin* : avec `VITE_API_MODE=http`, toutes les pages admin du front fonctionnent (commandes, catalogue, vitrine, collections).

### Priorité 2 — Connexion Google
- [ ] `composer require laravel/socialite`, configurer `config/services.php` (`google`) et `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`).
- [ ] `GoogleAuthController@redirect` / `@callback` : retrouver par `google_id` puis `email`, sinon créer (role `parent`, sans mot de passe), puis **rediriger vers** `config('app.frontend_url').'/auth/callback?token=...'` (la page front existe déjà).

### Priorité 3 — Qualité des images
- [ ] Dans `App\Support\Media::store()` : redimensionner (≤ 1600 px) et convertir en **WebP** (GD est installé dans l'image Docker ; `intervention/image` conseillé). Les photos de l'ancien site faisaient jusqu'à 1,6 Mo.

### Priorité 4 — Paiement Mobile Money réel
Aujourd'hui l'acompte est réglé « à la main » via WhatsApp et l'admin passe la commande en `validee`.
- [ ] Choisir un agrégateur (ex. CinetPay, Flutterwave, ou les API directes MTN MoMo / Airtel Money).
- [ ] Table `payments` (order_id, provider, montant, statut, référence opérateur, payload brut).
- [ ] `POST /api/orders/{reference}/pay` (initie l'acompte) + **webhook** signé qui passe la commande en `validee` automatiquement.
- [ ] Prévenir Mulho pour brancher l'écran de paiement côté front.

### Priorité 5 — Notifications
- [ ] Événement `OrderPlaced` (emplacement prévu en TODO dans `OrderService`) → notification à l'équipe (e-mail et/ou WhatsApp Business API) et au client.
- [ ] Notification au client à chaque changement de statut (`validee`, `transit`, `livre`).
- [ ] Passer ces envois en **queue** (`QUEUE_CONNECTION=database` est prêt ; ajouter un service `queue` dans `docker-compose.yml` avec `php artisan queue:work`).

### Priorité 6 — Comptes
- [ ] Mot de passe oublié : par SMS (Africa's Talking / Twilio) ou par question à l'admin — à décider avec l'équipe.
- [ ] `PATCH /api/auth/me` (modifier nom, téléphone) et changement de mot de passe.
- [ ] Optionnel : profils enfants (prénom, taille, niveau) pour pré-remplir les commandes des parents.

### Priorité 7 — Mise en production
- [ ] `APP_ENV=production`, `APP_DEBUG=false`, vrai `ADMIN_PASSWORD`, `APP_URL` / `FRONTEND_URL` réels.
- [ ] Image API de prod : `composer install --no-dev -o`, `php artisan optimize`, pas de bind mount, `KOLA_AUTO_SEED=false` après le premier déploiement.
- [ ] Servir front et API sur le **même domaine** (`kolacollection.cg` + `/api`) → pas de CORS. Sinon configurer `config/cors.php` pour `FRONTEND_URL`.
- [ ] HTTPS, sauvegardes Postgres quotidiennes, rotation des logs, monitoring (`/up` et `/api/health`).
- [ ] Le front de prod se construit avec `docker build --target prod ./frontend` (Nginx + fallback SPA).

### Petits plus (quand tu as le temps)
- [ ] Pagination sur `/api/admin/orders` (quand il y aura beaucoup de commandes) — prévenir Mulho, le front attend un tableau.
- [ ] Recherche admin par référence / nom / téléphone côté serveur.
- [ ] Export CSV des commandes.
- [ ] Journal d'activité admin (qui a changé quel statut).
- [ ] Livraison : frais et zones si Kōlā sort de Brazzaville / Pointe-Noire (`App\Enums\DeliveryCity`).

---

## 6. Workflow Git proposé
- `main` = stable. Une branche par sujet : `feat/admin-orders`, `feat/google-auth`…
- Avant de pousser : `vendor/bin/pint` + `php artisan test`.
- Une PR par fonctionnalité, Mulho relit si ça touche au contrat d'API.

Bon code ! 🚀 Pour toute question sur le front ou le contrat : Mulho.
