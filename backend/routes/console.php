<?php

use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Utilisé par le conteneur Docker au démarrage : remplit la base seulement si elle est vide
Artisan::command('kola:seed-if-empty', function () {
    if (User::query()->exists()) {
        $this->info('Base déjà remplie : seed ignoré.');

        return;
    }
    $this->call('db:seed', ['--force' => true]);
})->purpose('Lance les seeders si la base ne contient encore aucun utilisateur');
