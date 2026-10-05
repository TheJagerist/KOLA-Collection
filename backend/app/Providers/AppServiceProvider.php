<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // En dev : erreur si on accède à une relation non chargée (N+1) ou à un attribut inexistant
        Model::shouldBeStrict(! $this->app->isProduction());

        // Connexion / inscription : 10 tentatives par minute et par IP
        RateLimiter::for('auth', fn (Request $r) => Limit::perMinute(10)->by($r->ip())->response(
            fn () => response()->json(['message' => 'Trop de tentatives. Réessayez dans une minute.'], 429),
        ));

        // Création de commandes : 10 par minute et par utilisateur
        RateLimiter::for('orders', fn (Request $r) => Limit::perMinute(10)->by($r->user()?->id ?: $r->ip()));
    }
}
