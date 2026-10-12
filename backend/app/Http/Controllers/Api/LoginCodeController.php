<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\Auth\IdentifierResolver;
use App\Services\Auth\LoginCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Connexion avec un code à usage unique reçu par e-mail ou SMS */
class LoginCodeController extends Controller
{
    /** POST /api/auth/code — envoie un code */
    public function request(Request $request, LoginCodeService $codes): JsonResponse
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:255'],
            'channel' => ['nullable', 'in:email,sms'],
        ], ['login.required' => 'Indiquez votre e-mail, votre téléphone ou votre nom d’utilisateur.']);

        $user = IdentifierResolver::find($data['login']);
        if (! $user) {
            throw ValidationException::withMessages(['login' => 'Aucun compte ne correspond à cet identifiant.']);
        }

        $preferred = $data['channel'] ?? (IdentifierResolver::parse($data['login'])['type'] === 'phone' ? 'sms' : 'email');
        $sent = $codes->send($user, $preferred);

        return response()->json([
            'channel' => $sent['channel'],
            'destination' => $sent['destination'],
            'expires_in' => LoginCodeService::TTL_MINUTES * 60,
            // En développement uniquement : le code est renvoyé pour tester sans e-mail ni SMS réels
            'dev_code' => $this->exposeCode($sent['channel']) ? $sent['code'] : null,
        ]);
    }

    /** POST /api/auth/code/verify — échange le code contre un jeton */
    public function verify(Request $request, LoginCodeService $codes): JsonResponse
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:255'],
            'code' => ['required', 'digits:6'],
        ], ['code.digits' => 'Le code contient 6 chiffres.']);

        $user = IdentifierResolver::find($data['login']);
        if (! $user) {
            throw ValidationException::withMessages(['code' => 'Code incorrect.']);
        }
        $codes->verify($user, $data['code']);

        return response()->json([
            'token' => $user->createToken('code')->plainTextToken,
            'user' => new UserResource($user->fresh()),
        ]);
    }

    private function exposeCode(string $channel): bool
    {
        if (app()->isProduction() || ! config('app.debug')) {
            return false;
        }

        return $channel === 'sms' ? config('kola.sms.driver') === 'log' : in_array(config('mail.default'), ['log', 'array'], true);
    }
}
