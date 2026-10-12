import { api, ApiError, type AuthResponse, type PasskeyInfo, type WebAuthnJson } from './api';

/**
 * Empreinte digitale / Face ID / Windows Hello (passkeys WebAuthn).
 * L'appareil garde la clé privée : le site ne voit jamais l'empreinte.
 * Fonctionne en HTTPS (et sur localhost en développement).
 */

const toBuffer = (b64url: string) => {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
};
const toB64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export const passkeysSupported = () => typeof window !== 'undefined' && window.isSecureContext && 'PublicKeyCredential' in window && !!navigator.credentials;

/** Vrai si l'appareil a un lecteur d'empreinte, Face ID ou Windows Hello */
export async function platformAuthenticatorAvailable() {
  if (!passkeysSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Traduit les erreurs du navigateur en messages compréhensibles */
function explain(e: unknown): never {
  if (e instanceof ApiError) {
    // Erreur technique côté serveur : on n'affiche pas le message brut
    if (e.status >= 500) throw new ApiError('La connexion par empreinte est indisponible pour le moment. Utilisez votre mot de passe ou un code.', e.status);
    throw e;
  }
  const name = (e as DOMException)?.name;
  if (name === 'NotAllowedError' || name === 'AbortError') throw new ApiError('Opération annulée.', 0);
  if (name === 'InvalidStateError') throw new ApiError('Cet appareil est déjà enregistré pour votre compte.', 0);
  if (name === 'SecurityError') throw new ApiError('L’empreinte ne fonctionne que sur le site sécurisé (https).', 0);
  throw new ApiError('Votre appareil ne permet pas cette connexion. Utilisez votre mot de passe ou un code.', 0);
}

/** Enregistre l'empreinte / Face ID de cet appareil pour le compte connecté */
export async function registerThisDevice(name?: string): Promise<PasskeyInfo> {
  const { publicKey: o }: WebAuthnJson = await api.passkeys.registerOptions().catch(explain);
  let cred: PublicKeyCredential;
  try {
    cred = (await navigator.credentials.create({
      publicKey: {
        ...o,
        challenge: toBuffer(o.challenge),
        user: { ...o.user, id: toBuffer(o.user.id) },
        excludeCredentials: (o.excludeCredentials ?? []).map((c: { id: string; type: 'public-key' }) => ({ ...c, id: toBuffer(c.id) })),
      } as PublicKeyCredentialCreationOptions,
    })) as PublicKeyCredential;
  } catch (e) {
    explain(e);
  }
  const res = cred.response as AuthenticatorAttestationResponse;
  return api.passkeys.register({
    id: toB64url(cred.rawId),
    client_data_json: toB64url(res.clientDataJSON),
    attestation_object: toB64url(res.attestationObject),
    name,
  }).catch(explain);
}

/** Connexion par empreinte : le navigateur propose les comptes enregistrés sur l'appareil */
export async function signInWithPasskey(): Promise<AuthResponse> {
  const { challenge_id, options } = await api.passkeys.loginOptions().catch(explain);
  const o = options.publicKey;
  let cred: PublicKeyCredential;
  try {
    cred = (await navigator.credentials.get({
      publicKey: {
        ...o,
        challenge: toBuffer(o.challenge),
        allowCredentials: (o.allowCredentials ?? []).map((c: { id: string; type: 'public-key' }) => ({ ...c, id: toBuffer(c.id) })),
      } as PublicKeyCredentialRequestOptions,
    })) as PublicKeyCredential;
  } catch (e) {
    explain(e);
  }
  const res = cred.response as AuthenticatorAssertionResponse;
  return api.passkeys.login({
    challenge_id,
    id: toB64url(cred.rawId),
    client_data_json: toB64url(res.clientDataJSON),
    authenticator_data: toB64url(res.authenticatorData),
    signature: toB64url(res.signature),
  }).catch(explain);
}
