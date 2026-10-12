# Kōlā Collection

Plateforme de commande en ligne d'uniformes scolaires conformes au règlement en vigueur en République du Congo : kaki pour les garçons, bleu ciel et bleu de nuit pour les filles. Livraison à Brazzaville et Pointe-Noire, paiement Airtel Money / MTN Mobile Money (acompte de 50 %, solde à la livraison).

## Architecture

```
KOLA-Collection/
├── frontend/            React 19 + TypeScript + Vite + Tailwind CSS 4   (Mulho)
├── backend/             API Laravel 13 + Sanctum + PostgreSQL            (Manu)
├── README-MANU.md       Guide de prise en main du backend
├── docker/              Dockerfile PHP-FPM, config Nginx
├── docs/API.md          Contrat d'API entre le front et le back
├── legacy/index.html    Ancien site (SPA Supabase), conservé pour référence
└── docker-compose.yml
```

| Service | Image | Port local | Rôle |
|---|---|---|---|
| `frontend` | node:22-alpine | **5173** | Vite (HMR), proxy `/api` et `/storage` vers Nginx |
| `nginx` | nginx:1.27-alpine | **8000** | Sert l'API Laravel |
| `api` | PHP 8.3-FPM (`docker/php`) | — | Laravel ; `composer install`, `key:generate`, `migrate` et seed (si base vide) automatiques au démarrage |
| `db` | postgres:16-alpine | **5433** | Base `kola` / utilisateur `kola` / mot de passe `secret` |
| `adminer` | adminer | 8080 | Optionnel : `docker compose --profile tools up -d` |

## Démarrage rapide

Prérequis : Docker Desktop (Windows / macOS) ou Docker Engine + Compose v2.

```bash
git clone https://github.com/TheJagerist/KOLA-Collection.git
cd KOLA-Collection
git checkout refonte-react-laravel
docker compose up -d --build
```

- Site : http://localhost:5173
- API : http://localhost:8000/api/health

Le premier démarrage prend quelques minutes (installation de Composer et de npm dans les conteneurs).

### Comptes (dev)

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Gérant (admin) | `admin` | `admin1234` |
| Préparateur | `prepa` | `kola1234` |
| Livreur | `livreur` | `kola1234` |
| Client | `nathalie242` | `kola1234` |

Postgres : `localhost:5433`, base `kola`, utilisateur `kola`, mot de passe `secret`.
Détails (mise à jour après `git pull`, codes de connexion en dev, dépannage) : voir [`README-MANU.md`](README-MANU.md#2-lancer-lapplication).

### Mode démo / mode API

`VITE_API_MODE` dans `.env` (racine) : vide = auto (API si elle répond, sinon démo), `http` = API Laravel, `mock` = démo sans backend.

## Commandes utiles

```bash
docker compose logs -f api                        # logs Laravel
docker compose exec api php artisan migrate        # migrations
docker compose exec api php artisan make:model Product -mfc
docker compose exec api php artisan test
docker compose exec api composer require laravel/socialite
docker compose exec frontend npm install <paquet>
docker compose exec frontend npm run build
docker compose down            # arrêter
docker compose down -v         # arrêter ET effacer la base
```

> Sous Windows, gardez le projet dans un dossier simple (ex. `C:\KOLA-Collection`) et laissez Git convertir les fins de ligne : le fichier `.gitattributes` force `LF` pour les scripts shell utilisés par Docker.

## Production (aperçu)

- **Front** : `docker build --target prod -t kola-front ./frontend`, une image Nginx qui sert le build statique avec le fallback SPA. Variables de build : `VITE_API_MODE=http`, `VITE_API_URL`, `VITE_WHATSAPP_NUMBER`.
- **API** : même image PHP (`docker/php/Dockerfile`) avec `APP_ENV=production`, `APP_DEBUG=false`, puis `composer install --no-dev -o` et `php artisan optimize`.
- Servir le front et l'API sur le même domaine (ex. `kolacollection.cg` et `kolacollection.cg/api`) pour éviter le CORS.

## Identité visuelle

| Token | Valeur |
|---|---|
| Brun principal | `#3D2E1F` |
| Fond crème | `#F7F2E9` |
| Accent rouille (CTA) | `#C9622E` |
| Kaki uniforme | `#B5A47C` |
| Bleu nuit | `#1B2A4A` |
| Titres | Fraunces |
| Corps / UI | Work Sans |

Les tokens sont définis dans `frontend/src/index.css` (`@theme` Tailwind) : `bg-brun-800`, `text-rouille-500`, `bg-nuit-900`…

## Roadmap

- [x] Base de l'API Laravel : schéma, seeders, catalogue, comptes, commandes (prix calculés côté serveur), tests
- [ ] Endpoints d'administration, connexion Google — voir [`README-MANU.md`](README-MANU.md) (Manu)
- [ ] Paiement Mobile Money réel (Airtel Money / MTN MoMo)
- [ ] Notifications de commande (e-mail / WhatsApp Business)
- [ ] Récupération de mot de passe
- [ ] Mentions légales définitives (RCCM, NIU, hébergeur)
- [ ] Photos produits définitives

---

*République du Congo · Brazzaville · Pointe-Noire*
