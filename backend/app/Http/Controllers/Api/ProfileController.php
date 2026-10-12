<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Support\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Profil de l'utilisateur connecté (client ou admin).
 * is_admin n'est jamais modifiable ici (absent des règles et non « fillable »).
 */
class ProfileController extends Controller
{
    /** PATCH /api/auth/me */
    public function update(UpdateProfileRequest $request): UserResource
    {
        $user = $request->user();
        $user->fill($request->validated())->save();

        return new UserResource($user->fresh());
    }

    /** POST /api/auth/me/avatar (multipart, champ « avatar ») */
    public function uploadAvatar(Request $request): UserResource
    {
        $request->validate(
            ['avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072']],
            ['avatar.max' => 'La photo ne doit pas dépasser 3 Mo.'],
        );

        $user = $request->user();
        $old = $user->avatar_path;
        $user->forceFill(['avatar_path' => Media::store($request->file('avatar'), 'avatars')])->save();
        Media::delete($old);

        return new UserResource($user);
    }

    /** DELETE /api/auth/me/avatar */
    public function deleteAvatar(Request $request): UserResource
    {
        $user = $request->user();
        Media::delete($user->avatar_path);
        $user->forceFill(['avatar_path' => null])->save();

        return new UserResource($user);
    }

    /** PUT /api/auth/password — déconnecte aussi les autres appareils */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->forceFill(['password' => $request->validated('password')])->save();
        $this->revokeOtherTokens($request);

        return response()->json(['message' => 'Mot de passe mis à jour.']);
    }

    /** POST /api/auth/logout-others */
    public function logoutOthers(Request $request): JsonResponse
    {
        $count = $this->revokeOtherTokens($request);

        return response()->json(['revoked' => $count]);
    }

    private function revokeOtherTokens(Request $request): int
    {
        $current = $request->user()->currentAccessToken();

        return $request->user()->tokens()->when($current?->id, fn ($q, $id) => $q->whereKeyNot($id))->delete();
    }
}
