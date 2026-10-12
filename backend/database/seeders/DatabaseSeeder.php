<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * php artisan migrate:fresh --seed
     * - AdminSeeder     : compte administrateur (identifiants dans .env)
     * - CatalogueSeeder : collections, accueil, carrousel et produits réels de l'ancien site
     * - DemoSeeder      : client de démo + commande exemple (uniquement hors production)
     */
    public function run(): void
    {
        $this->call([AdminSeeder::class, CatalogueSeeder::class]);

        if (! app()->isProduction()) {
            $this->call(DemoSeeder::class);
        }
    }
}
