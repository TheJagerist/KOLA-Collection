<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Passkey;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use lbuchs\WebAuthn\Binary\ByteBuffer;
use lbuchs\WebAuthn\WebAuthn;
use lbuchs\WebAuthn\WebAuthnException;

/**
 * Connexion par empreinte digitale, Face ID, Windows Hello… (passkeys / WebAuthn).
 * Le téléphone garde la clé privée ; on ne stocke que la clé publique.
 * Les données binaires circulent en base64url.
 */
class PasskeyController extends Controller
{
    private function webauthn(): WebAuthn
    {
        // Bibliothèque absente (composer install pas relancé) : message clair plutôt qu'une erreur 500
        abort_unless(class_exists(WebAuthn::class), 503, 'La connexion par empreinte n’est pas disponible pour le moment. Utilisez votre mot de passe ou un code.');

        return new WebAuthn(config('kola.webauthn.rp_name'), config('kola.webauthn.rp_id'), ['none', 'packed', 'apple', 'android-key', 'android-safetynet', 'tpm', 'fido-u2f'], true);
    }

    private function b64(string $value): string
    {
        return ByteBuffer::fromBase64Url($value)->getBinaryString();
    }

    /** GET /api/auth/passkeys — appareils enregistrés */
    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->passkeys()->latest()->get()->map(fn (Passkey $p) => [
            'id' => $p->id,
            'name' => $p->name,
            'created_at' => $p->created_at?->toIso8601String(),
            'last_used_at' => $p->last_used_at?->toIso8601String(),
        ])]);
    }

    /** POST /api/auth/passkeys/options — prépare l'enregistrement de cet appareil */
    public function registerOptions(Request $request): JsonResponse
    {
        $user = $request->user();
        $wa = $this->webauthn();
        $exclude = $user->passkeys()->pluck('credential_id')->map(fn ($id) => $this->b64($id))->all();
        $args = $wa->getCreateArgs(
            (string) $user->id,
            $user->username ?: ($user->email ?: 'client-'.$user->id),
            $user->full_name,
            60,
            true,        // clé « découvrable » : connexion sans taper d'identifiant
            'required',  // empreinte / visage / code de l'appareil obligatoire
            null,        // appareil intégré ou téléphone à proximité
            $exclude,
        );
        Cache::put('webauthn:reg:'.$user->id, base64_encode($wa->getChallenge()->getBinaryString()), now()->addMinutes(5)); // texte : compatible avec tous les stores de cache

        return response()->json($args);
    }

    /** POST /api/auth/passkeys — enregistre la clé publique renvoyée par l'appareil */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_data_json' => ['required', 'string'],
            'attestation_object' => ['required', 'string'],
            'name' => ['nullable', 'string', 'max:80'],
        ]);
        $user = $request->user();
        $challenge = Cache::pull('webauthn:reg:'.$user->id);
        if (! $challenge) {
            throw ValidationException::withMessages(['passkey' => 'Délai dépassé, recommencez.']);
        }

        try {
            $result = $this->webauthn()->processCreate(
                $this->b64($data['client_data_json']),
                $this->b64($data['attestation_object']),
                new ByteBuffer(base64_decode($challenge)),
                true, true, false,
            );
        } catch (WebAuthnException $e) {
            throw ValidationException::withMessages(['passkey' => 'Enregistrement refusé par l’appareil : '.$e->getMessage()]);
        }

        $passkey = $user->passkeys()->create([
            'name' => ($data['name'] ?? null) ?: $this->guessDeviceName($request),
            'credential_id' => rtrim(strtr(base64_encode($result->credentialId), '+/', '-_'), '='),
            'public_key' => $result->credentialPublicKey,
            'sign_count' => (int) ($result->signatureCounter ?? 0),
        ]);

        return response()->json(['data' => ['id' => $passkey->id, 'name' => $passkey->name, 'created_at' => $passkey->created_at?->toIso8601String(), 'last_used_at' => null]], 201);
    }

    /** DELETE /api/auth/passkeys/{passkey} */
    public function destroy(Request $request, Passkey $passkey): JsonResponse
    {
        abort_unless($passkey->user_id === $request->user()->id, 404);
        $passkey->delete();

        return response()->json(null, 204);
    }

    /** POST /api/auth/passkeys/login/options — défi de connexion (sans identifiant) */
    public function loginOptions(): JsonResponse
    {
        $wa = $this->webauthn();
        $args = $wa->getGetArgs([], 60, true, true, true, true, true, 'required');
        $id = (string) Str::uuid();
        Cache::put('webauthn:login:'.$id, base64_encode($wa->getChallenge()->getBinaryString()), now()->addMinutes(5));

        return response()->json(['challenge_id' => $id, 'options' => $args]);
    }

    /** POST /api/auth/passkeys/login — vérifie la signature et connecte */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_id' => ['required', 'string'],
            'id' => ['required', 'string'],
            'client_data_json' => ['required', 'string'],
            'authenticator_data' => ['required', 'string'],
            'signature' => ['required', 'string'],
        ]);
        $fail = fn () => throw ValidationException::withMessages(['passkey' => 'Empreinte non reconnue sur ce site. Connectez-vous autrement puis activez-la dans votre profil.']);

        $challenge = Cache::pull('webauthn:login:'.$data['challenge_id']);
        $passkey = Passkey::query()->with('user')->where('credential_id', rtrim($data['id'], '='))->first();
        if (! $challenge || ! $passkey) {
            $fail();
        }

        $wa = $this->webauthn();
        try {
            $wa->processGet(
                $this->b64($data['client_data_json']),
                $this->b64($data['authenticator_data']),
                $this->b64($data['signature']),
                $passkey->public_key,
                new ByteBuffer(base64_decode($challenge)),
                $passkey->sign_count ?: null,
                true,
            );
        } catch (WebAuthnException) {
            $fail();
        }

        // Compteur de signatures (souvent 0 pour les passkeys synchronisées iCloud / Google)
        $passkey->forceFill(['last_used_at' => now(), 'sign_count' => max($passkey->sign_count, (int) $wa->getSignatureCounter())])->save();
        $user = $passkey->user;

        return response()->json(['token' => $user->createToken('passkey')->plainTextToken, 'user' => new UserResource($user)]);
    }

    private function guessDeviceName(Request $request): string
    {
        $ua = (string) $request->userAgent();

        return match (true) {
            str_contains($ua, 'iPhone') => 'iPhone',
            str_contains($ua, 'iPad') => 'iPad',
            str_contains($ua, 'Android') => 'Téléphone Android',
            str_contains($ua, 'Mac OS') => 'Mac',
            str_contains($ua, 'Windows') => 'Ordinateur Windows',
            default => 'Cet appareil',
        };
    }
}
