<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\StaffRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Comptes de l'équipe et leurs rôles (réservé au gérant) */
class TeamController extends Controller
{
    /** GET /api/admin/team */
    public function index(): JsonResponse
    {
        $staff = User::query()->where('is_admin', true)->orderBy('full_name')->get();

        return response()->json(['data' => $staff->map(fn ($u) => $this->present($u))]);
    }

    /** POST /api/admin/team { full_name, username, password, staff_role, phone } */
    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'username' => strtolower(trim((string) $request->input('username'))),
            'phone' => preg_replace('/^(00)?242/', '', preg_replace('/\D/', '', (string) $request->input('phone'))) ?: null,
        ]);
        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:120'],
            'username' => ['required', 'regex:/^[a-z0-9._-]{3,20}$/', 'unique:users,username'],
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
            'staff_role' => ['required', Rule::enum(StaffRole::class)],
            'phone' => ['required', 'regex:/^0\d{8}$/'],
        ], [
            'phone.required' => 'Indiquez le téléphone du membre (il sera joint par l’équipe et les clients).',
            'phone.regex' => 'Numéro invalide : 9 chiffres commençant par 0.',
            'password.confirmed' => 'Les deux mots de passe ne correspondent pas.',
            'username.unique' => "Ce nom d'utilisateur est déjà pris.",
            'username.regex' => "Nom d'utilisateur : 3 à 20 caractères (lettres, chiffres, . _ -).",
        ]);

        $user = User::query()->create([
            'full_name' => $data['full_name'], 'username' => $data['username'], 'password' => $data['password'],
            'phone' => $data['phone'] ?? null, 'role' => 'parent',
        ]);
        $user->forceFill(['is_admin' => true, 'staff_role' => $data['staff_role']])->save();

        return response()->json(['data' => $this->present($user->fresh())], 201);
    }

    /** PATCH /api/admin/team/{user} { staff_role, full_name, phone, password } */
    public function update(Request $request, User $user): JsonResponse
    {
        abort_unless($user->is_admin, 404);
        if ($request->has('phone')) {
            $request->merge(['phone' => preg_replace('/^(00)?242/', '', preg_replace('/\D/', '', (string) $request->input('phone'))) ?: null]);
        }
        $data = $request->validate([
            'full_name' => ['sometimes', 'string', 'max:120'],
            'staff_role' => ['sometimes', Rule::enum(StaffRole::class)],
            'phone' => ['sometimes', 'required', 'regex:/^0\d{8}$/'],
            'password' => ['sometimes', 'string', 'min:8', 'max:100', 'confirmed'],
        ], [
            'password.confirmed' => 'Les deux mots de passe ne correspondent pas.',
            'phone.required' => 'Indiquez le téléphone du membre.',
            'phone.regex' => 'Numéro invalide : 9 chiffres commençant par 0.',
        ]);

        if (isset($data['staff_role']) && $data['staff_role'] !== StaffRole::Gerant->value) {
            $this->keepOneManager($user);
        }

        $user->fill(array_intersect_key($data, array_flip(['full_name', 'phone', 'password'])));
        if (isset($data['staff_role'])) {
            $user->staff_role = StaffRole::from($data['staff_role']);
        }
        $user->save();
        if (isset($data['password'])) {
            $user->tokens()->delete(); // nouveau mot de passe → reconnexion partout
        }

        return response()->json(['data' => $this->present($user->fresh())]);
    }

    /** DELETE /api/admin/team/{user} — retire l'accès à l'administration (le compte et ses commandes restent) */
    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_unless($user->is_admin, 404);
        abort_if($user->id === $request->user()->id, 422, 'Vous ne pouvez pas retirer votre propre accès.');
        $this->keepOneManager($user);

        $user->forceFill(['is_admin' => false, 'staff_role' => null])->save();
        $user->tokens()->delete();

        return response()->json(['data' => ['id' => $user->id, 'removed' => true]]);
    }

    private function keepOneManager(User $user): void
    {
        if (! $user->hasStaffRole(StaffRole::Gerant)) {
            return;
        }
        $managers = User::query()->where('is_admin', true)->get()->filter(fn ($u) => $u->hasStaffRole(StaffRole::Gerant))->count();
        abort_if($managers <= 1, 422, "Il doit rester au moins un gérant dans l'équipe.");
    }

    private function present(User $u): array
    {
        return [
            'id' => $u->id,
            'full_name' => $u->full_name,
            'username' => $u->username,
            'phone' => $u->phone,
            'avatar_url' => Media::url($u->avatar_path),
            'staff_role' => $u->staffRole()?->value,
            'created_at' => $u->created_at?->toIso8601String(),
        ];
    }
}
