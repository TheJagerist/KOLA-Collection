#!/usr/bin/env bash
# Prépare Laravel au démarrage du conteneur (idempotent).
set -e
cd /var/www/html

if [ ! -f .env ]; then
  echo "[kola] .env absent : copie de .env.example"
  cp .env.example .env
fi

if [ ! -f vendor/autoload.php ]; then
  echo "[kola] Installation des dépendances Composer…"
  composer install --no-interaction --prefer-dist
fi

if ! grep -qE '^APP_KEY=.+' .env; then
  echo "[kola] Génération de APP_KEY"
  php artisan key:generate --force
fi

# Attend que PostgreSQL accepte les connexions
echo "[kola] Attente de PostgreSQL (${DB_HOST:-db}:${DB_PORT:-5432})…"
for i in $(seq 1 30); do
  php -r "try{new PDO('pgsql:host='.getenv('DB_HOST').';port='.getenv('DB_PORT').';dbname='.getenv('DB_DATABASE'),getenv('DB_USERNAME'),getenv('DB_PASSWORD'));exit(0);}catch(Exception \$e){exit(1);}" && break
  sleep 1
done

if [ "${KOLA_AUTO_MIGRATE:-true}" = "true" ]; then
  php artisan migrate --force
fi

[ -L public/storage ] || php artisan storage:link || true

# Premier démarrage : données de départ (admin, catalogue, démo)
if [ "${KOLA_AUTO_SEED:-true}" = "true" ]; then
  php artisan kola:seed-if-empty
fi

# Environnement de dev : PHP-FPM (www-data) doit pouvoir écrire, quel que soit le propriétaire côté hôte
chmod -R a+rwX storage bootstrap/cache 2>/dev/null || true

exec "$@"
