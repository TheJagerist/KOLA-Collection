<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Auth\IdentifierResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Authentification par jeton Bearer (Laravel Sanctum).
 * Le front stocke le jeton et l'envoie dans « Authorization: Bearer … ».
 */
class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::query()->create($request->validated());

        return response()->json($this->tokenPayload($user), 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = IdentifierResolver::find($request->validated('login'));

        if (! $user || ! $user->password || ! Hash::check($request->validated('password'), $user->password)) {
            // Clés « login » et « username » : compatibilité avec les anciennes versions du front
            throw ValidationException::withMessages(['login' => __('auth.failed'), 'username' => __('auth.failed')]);
        }

        return response()->json($this->tokenPayload($user));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(null, 204);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    private function tokenPayload(User $user): array
    {
        return [
            'token' => $user->createToken('web')->plainTextToken,
            'user' => new UserResource($user),
        ];
    }
}
