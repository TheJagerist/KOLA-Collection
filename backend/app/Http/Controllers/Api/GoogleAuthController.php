<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Démarre le flux OAuth en redirigeant directement le navigateur vers Google.
     */
    public function redirect()
    {
        return Socialite::driver('google')
            ->stateless()
            ->redirect();
    }

    /**
     * Callback Google : création/récupération de l'utilisateur,
     * puis connexion et redirection vers le frontend.
     */
    public function callback(Request $request): RedirectResponse
    {
        if (! $request->has('code')) {
            return $this->redirectToFrontend('/auth/callback?error=google_missing_code');
        }

        try {
            $googleUser = Socialite::driver('google')
                ->stateless()
                ->user();
        } catch (\Throwable $e) {
            report($e);
            return $this->redirectToFrontend('/auth/callback?error=google_auth_failed');
        }

        $email = $googleUser->getEmail();

        if (! $email) {
            return $this->redirectToFrontend('/auth/callback?error=google_email_missing');
        }

        $user = User::where('email', $email)->first();

        if ($user) {
            // Utilisateur existant : on lie son compte Google
            $user->forceFill([
                'google_id' => $googleUser->getId(),
                'avatar' => $googleUser->getAvatar() ?: $user->avatar,
                'email_verified_at' => $user->email_verified_at ?? now(),
            ])->save();
        } else {
            // Nouvel utilisateur Google

            // 1. Génération d'un username unique à partir de l'email
            $baseUsername = Str::slug(explode('@', $email)[0], '_');
            $username = $baseUsername;
            $counter = 1;
            while (User::where('username', $username)->exists()) {
                $username = $baseUsername . '_' . $counter;
                $counter++;
            }

            // 2. Création de l'utilisateur avec full_name et username
            $user = new User();
            $user->forceFill([
                'full_name' => $googleUser->getName() ?: 'Utilisateur Google',
                'username' => $username,
                'email' => $email,
                'google_id' => $googleUser->getId(),
                'avatar' => $googleUser->getAvatar(),
                'password' => Hash::make(Str::random(40)), // Mot de passe aléatoire (inutilisable)
                'email_verified_at' => now(),
                'role' => 'parent', // Par défaut : parent (achète les uniformes)
                'is_admin' => false,
            ])->save();
        }

        // Création du token Sanctum
        $token = $user->createToken('google')->plainTextToken;

        return $this->redirectToFrontend('/auth/callback?token=' . urlencode($token));
    }

    /**
     * Redirige vers l'application frontend React.
     */
    protected function redirectToFrontend(string $path): RedirectResponse
    {
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');
        return redirect()->away($frontendUrl . $path);
    }
}
