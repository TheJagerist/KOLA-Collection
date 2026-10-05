<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

/**
 * TODO (Manu) — Connexion Google (Laravel Socialite). Spécification : docs/API.md §4.
 *   composer require laravel/socialite
 *   config/services.php → 'google' => [client_id, client_secret, redirect]
 *   .env → GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
 */
class GoogleAuthController extends Controller
{
    /** GET /api/auth/google/redirect → Socialite::driver('google')->stateless()->redirect() */
    public function redirect()
    {
        $this->todo('connexion Google (redirection)');
    }

    /**
     * GET /api/auth/google/callback
     * - retrouver l'utilisateur par google_id puis par email, sinon le créer (role parent, sans mot de passe)
     * - $token = $user->createToken('web')->plainTextToken
     * - redirect(config('app.frontend_url').'/auth/callback?token='.$token)
     * - en cas d'erreur : redirect(.../auth/callback?error=Connexion%20Google%20impossible)
     */
    public function callback()
    {
        $this->todo('connexion Google (retour)');
    }
}
