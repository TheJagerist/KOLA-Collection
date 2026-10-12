<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Validation\ValidationException;

/** Stock par taille : réservation à la commande, restitution à l'annulation */
class StockService
{
    /**
     * Vérifie puis retire du stock les articles d'une liste de lignes.
     * $products doit être verrouillé (lockForUpdate) par l'appelant.
     *
     * @param  array<int, array{product_id:int,size:string,qty:int}>  $lines
     * @param  \Illuminate\Support\Collection<int, Product>  $products  indexés par id
     */
    public function take(array $lines, $products, bool $strict = true): void
    {
        $need = $this->check($lines, $products, $strict);

        foreach ($need as $key => ['qty' => $qty]) {
            [$id, $size] = explode('|', $key, 2);
            $products->get((int) $id)?->adjustStock($size, -$qty);
        }
    }

    /**
     * Vérifie seulement (sans rien retirer) ; renvoie les quantités cumulées par article|taille.
     *
     * @return array<string, array{qty:int, i:int}>
     */
    public function check(array $lines, $products, bool $strict = true): array
    {
        // Quantités cumulées par article + taille (le même article peut apparaître deux fois)
        $need = [];
        foreach ($lines as $i => $l) {
            $key = $l['product_id'].'|'.$l['size'];
            $need[$key] = ($need[$key] ?? ['qty' => 0, 'i' => $i]);
            $need[$key]['qty'] += $l['qty'];
        }

        foreach ($need as $key => ['qty' => $qty, 'i' => $i]) {
            [$id, $size] = explode('|', $key, 2);
            $product = $products->get((int) $id);
            if (! $product || ! $product->tracksStock()) {
                continue;
            }
            $left = $product->available($size);
            if ($strict && $left < $qty) {
                throw ValidationException::withMessages([
                    "items.$i.qty" => $left === 0
                        ? "« {$product->name} » est épuisé en taille {$size}."
                        : "Il ne reste que {$left} « {$product->name} » en taille {$size}.",
                ]);
            }
        }

        return $need;
    }

    /** Rend au stock les articles d'une commande (annulation) */
    public function release(Order $order): void
    {
        foreach ($order->items()->get() as $item) {
            Product::query()->whereKey($item->product_id)->lockForUpdate()->first()?->adjustStock($item->size, $item->qty);
        }
    }

    /** Reprend les articles d'une commande réactivée */
    public function reserve(Order $order, bool $strict = true): void
    {
        $items = $order->items()->get();
        $products = Product::query()->whereIn('id', $items->pluck('product_id'))->lockForUpdate()->get()->keyBy('id');
        $this->take($items->map(fn ($i) => ['product_id' => $i->product_id, 'size' => $i->size, 'qty' => $i->qty])->all(), $products, $strict);
    }
}
