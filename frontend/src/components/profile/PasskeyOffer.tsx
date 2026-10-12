import { useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { platformAuthenticatorAvailable, registerThisDevice } from '../../lib/passkey';
import { useAuth } from '../../stores/auth';
import { toast } from '../../stores/toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const key = (id: number) => `kola-passkey-offer-${id}`;
const dismissed = (id: number) => {
  try {
    return localStorage.getItem(key(id)) === 'no';
  } catch {
    return false;
  }
};

/**
 * Juste après une connexion par mot de passe ou par code, on propose une seule fois
 * d'activer l'empreinte / Face ID sur cet appareil (s'il en a un et si ce n'est pas déjà fait).
 */
export function PasskeyOffer() {
  const { user, offerPasskey, dismissPasskeyOffer } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!offerPasskey || !user || dismissed(user.id)) return;
    let alive = true;
    (async () => {
      if (!(await platformAuthenticatorAvailable())) return dismissPasskeyOffer();
      const existing = await api.passkeys.list().catch(() => null);
      if (alive && existing && existing.length === 0) setOpen(true);
      else dismissPasskeyOffer();
    })();
    return () => {
      alive = false;
    };
  }, [offerPasskey, user, dismissPasskeyOffer]);

  const close = (never: boolean) => {
    if (never && user) {
      try {
        localStorage.setItem(key(user.id), 'no');
      } catch {
        /* stockage indisponible */
      }
    }
    setOpen(false);
    dismissPasskeyOffer();
  };

  const enable = async () => {
    setBusy(true);
    try {
      await registerThisDevice();
      toast.success('Empreinte activée : la prochaine fois, connectez-vous en un geste.');
      close(false);
    } catch (e) {
      if (!(e instanceof ApiError && e.message === 'Opération annulée.')) toast.error(e instanceof ApiError ? e.firstError() : 'Activation impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => close(false)} eyebrow="Connexion plus rapide" title="Activer l’empreinte sur cet appareil ?">
      <div className="flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-rouille-50 text-rouille-600 dark:bg-rouille-500/15">
          <Fingerprint className="size-7" />
        </span>
        <p className="text-[14.5px] leading-relaxed text-ink-soft">
          La prochaine fois, connectez-vous avec votre <strong className="text-ink">empreinte, Face ID</strong> ou le code de déverrouillage de l’appareil — sans mot de passe. Votre
          empreinte reste sur votre téléphone : Kōlā ne la voit jamais.
        </p>
      </div>
      <div className="mt-7 grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={() => close(true)} disabled={busy}>
          Non merci
        </Button>
        <Button onClick={enable} loading={busy} icon={<Fingerprint className="size-4" />}>
          Activer
        </Button>
      </div>
    </Modal>
  );
}
