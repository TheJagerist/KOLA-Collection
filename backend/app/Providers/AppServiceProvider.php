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
        // SMS : écrit dans les logs en dev, Africa's Talking en production
        $this->app->bind(\App\Services\Sms\SmsSender::class, fn () => match (config('kola.sms.driver')) {
            'africastalking' => new \App\Services\Sms\AfricasTalkingSmsSender,
            default => new \App\Services\Sms\LogSmsSender,
        });
    }

    public function boot(): void
    {
        // En dev : erreur si on accède à une relation non chargée (N+1) ou à un attribut inexistant
        Model::shouldBeStrict(! $this->app->isProduction());

        // Connexion / inscription : 10 tentatives par minute et par IP
        RateLimiter::for('auth', fn (Request $r) => Limit::perMinute(10)->by($r->ip())->response(
            fn () => response()->json(['message' => 'Trop de tentatives. Réessayez dans une minute.'], 429),
        ));

        // Codes de connexion : 5 envois par heure et par identifiant (+ 20 par heure et par IP)
        RateLimiter::for('login-code', fn (Request $r) => [
            Limit::perHour(5)->by('code:'.mb_strtolower(trim((string) $r->input('login')))),
            Limit::perHour(20)->by('code-ip:'.$r->ip()),
        ]);

        // Création de commandes : 10 par minute et par utilisateur
        RateLimiter::for('orders', fn (Request $r) => Limit::perMinute(10)->by($r->user()?->id ?: $r->ip()));
    }
}
