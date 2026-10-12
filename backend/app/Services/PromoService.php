<?php

namespace App\Services;

use App\Models\PromoCode;
use Illuminate\Validation\ValidationException;

/**
 * Remises : la MEILLEURE remise s'applique (non cumulables).
 * Candidats = remises automatiques actives (ex. remise famille) + le code saisi s'il est valide.
 */
class PromoService
{
    /**
     * @return array{discount:int, promo: ?PromoCode}
     *
     * @throws ValidationException si un code est saisi mais invalide / non applicable
     */
    public function best(int $subtotal, int $itemCount, ?string $code = null): array
    {
        $best = ['discount' => 0, 'promo' => null];

        foreach (PromoCode::query()->usable()->whereNull('code')->get() as $auto) {
            $d = $auto->discountFor($subtotal, $itemCount);
            if ($d > $best['discount']) {
                $best = ['discount' => $d, 'promo' => $auto];
            }
        }

        $code = $code !== null ? strtoupper(trim($code)) : null;
        if ($code) {
            $promo = PromoCode::query()->usable()->where('code', $code)->first();
            if (! $promo) {
                throw ValidationException::withMessages(['promo_code' => "Le code « {$code} » n'est pas valide ou a expiré."]);
            }
            $d = $promo->discountFor($subtotal, $itemCount);
            if ($d === 0) {
                $why = $promo->min_items > $itemCount
                    ? "dès {$promo->min_items} articles"
                    : 'dès '.number_format($promo->min_total, 0, ',', ' ').' FCFA';
                throw ValidationException::withMessages(['promo_code' => "Le code « {$code} » s'applique {$why}."]);
            }
            if ($d >= $best['discount']) {
                $best = ['discount' => $d, 'promo' => $promo];
            }
        }

        return $best;
    }
}
