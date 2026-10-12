import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { API_FALLBACK, pingApi } from '../../lib/api';

/**
 * Développement uniquement : prévient que l'API Laravel ne répond pas et que le site
 * affiche les données de démonstration (rien n'est enregistré en base).
 */
export function DevApiBanner() {
  const [open, setOpen] = useState(API_FALLBACK);

  // Dès que l'API répond (Docker démarré), on recharge pour passer sur la vraie base
  useEffect(() => {
    if (!API_FALLBACK) return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      if (await pingApi(8000)) location.reload();
      else setTimeout(tick, 5000);
    };
    const t = setTimeout(tick, 5000);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, []);

  if (!open) return null;
  return (
    <div role="status" className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 z-[70] max-w-sm rounded-2xl border border-amber-300/60 bg-amber-50 p-3.5 pr-10 text-[13px] text-amber-950 shadow-xl sm:bottom-4 dark:border-amber-400/30 dark:bg-[#2a2010] dark:text-amber-100">
      <strong className="block">API Laravel non démarrée</strong>
      Affichage des données de démonstration : rien n’est enregistré en base. Lancez <code className="font-semibold">docker compose up -d</code> — la page basculera toute seule sur la vraie base dès que l’API répondra.
      <button onClick={() => location.reload()} className="mt-2 flex items-center gap-1.5 font-semibold underline underline-offset-2">
        <RefreshCw className="size-3.5" /> Recharger
      </button>
      <button onClick={() => setOpen(false)} className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full hover:bg-amber-200/50" aria-label="Fermer">
        <X className="size-4" />
      </button>
    </div>
  );
}
