<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Création des commandes.
 * RÈGLE D'OR : les prix ne viennent JAMAIS du client. Ils sont relus en base ici.
 */
class OrderService
{
    /** Part payée à la commande (50 %) */
    public const DEPOSIT_RATE = 0.5;

    /**
     * @param  array{items: array<int, array{product_id:int,size:string,niveau:string,qty:int}>, payment_method:string, payment_phone:string, delivery_city:string, delivery_address:string}  $data  données déjà validées (StoreOrderRequest)
     */
    public function place(User $user, array $data): Order
    {
        return DB::transaction(function () use ($user, $data) {
            $ids = collect($data['items'])->pluck('product_id')->unique()->all();

            // Verrou sur les lignes produit le temps de la transaction
            $products = Product::query()->visible()->whereIn('id', $ids)->lockForUpdate()->get()->keyBy('id');

            $lines = [];
            foreach ($data['items'] as $i => $item) {
                $product = $products->get($item['product_id']);

                if (! $product) {
                    throw ValidationException::withMessages([
                        "items.$i.product_id" => "Un article de votre panier n'est plus disponible. Retirez-le pour continuer.",
                    ]);
                }
                if (! in_array($item['size'], $product->sizes, true)) {
                    throw ValidationException::withMessages([
                        "items.$i.size" => "La taille {$item['size']} n'existe pas pour « {$product->name} ».",
                    ]);
                }
                if (! in_array($item['niveau'], $product->niveaux, true)) {
                    throw ValidationException::withMessages([
                        "items.$i.niveau" => "Le niveau choisi n'est pas proposé pour « {$product->name} ».",
                    ]);
                }

                $qty = (int) $item['qty'];
                $lines[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'size' => $item['size'],
                    'niveau' => $item['niveau'],
                    'qty' => $qty,
                    'unit_price' => $product->price,
                    'line_total' => $product->price * $qty,
                ];
            }

            $total = array_sum(array_column($lines, 'line_total'));
            $deposit = (int) round($total * self::DEPOSIT_RATE);

            $order = Order::query()->create([
                'reference' => Order::generateReference(),
                'user_id' => $user->id,
                'status' => OrderStatus::EnAttente,
                'total' => $total,
                'deposit' => $deposit,
                'balance' => $total - $deposit,
                'payment_method' => $data['payment_method'],
                'payment_phone' => $data['payment_phone'],
                'delivery_city' => $data['delivery_city'],
                'delivery_address' => trim($data['delivery_address']),
            ]);

            $order->items()->createMany($lines);

            foreach ($lines as $line) {
                Product::query()->whereKey($line['product_id'])->increment('order_count', $line['qty']);
            }

            // TODO (Manu) : déclencher ici la notification « nouvelle commande » (e-mail / WhatsApp Business)
            // event(new \App\Events\OrderPlaced($order));

            return $order->load('items.product', 'user');
        });
    }
}
