# Kōlā — API (Laravel 13)

👉 **Tout est expliqué dans [`../README-MANU.md`](../README-MANU.md)** : lancement, ce qui est fait, ce qu'il reste à faire.
Contrat d'API avec le front : [`../docs/API.md`](../docs/API.md).

```bash
docker compose up -d --build                    # depuis la racine du dépôt
docker compose exec api php artisan test
docker compose exec api php artisan migrate:fresh --seed
```
