<?php

use App\Models\Product;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Utilisé par le conteneur Docker au démarrage : remplit la base seulement si elle est vide
Artisan::command('kola:seed-if-empty', function () {
    if (! User::query()->exists()) {
        $this->call('db:seed', ['--force' => true]);

        return;
    }
    // Comptes déjà créés mais catalogue vide : on remet au moins les articles
    if (! Product::query()->exists()) {
        $this->call('kola:restore-catalogue');

        return;
    }
    $this->info('Base déjà remplie : seed ignoré.');
})->purpose('Lance les seeders si la base est vide (ou remet le catalogue s\'il est vide)');

// Remet les articles d'origine manquants, sans écraser ceux modifiés par l'admin
Artisan::command('kola:restore-catalogue', function () {
    $added = app(CatalogueSeeder::class)->restoreMissing();

    if ($added === []) {
        $this->info('Tous les articles d\'origine sont déjà présents.');

        return;
    }
    $this->info(count($added).' article(s) rajouté(s) :');
    foreach ($added as $name) {
        $this->line("  • {$name}");
    }
})->purpose('Rajoute les articles d\'origine qui ont été supprimés');
