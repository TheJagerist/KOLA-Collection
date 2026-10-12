<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Events\OrderPlaced;
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
    public function __construct(private StockService $stock, private PromoService $promos) {}

    /**
     * Calcule les lignes et les montants d'un panier SANS rien enregistrer (aperçu au paiement).
     *
     * @return array{lines: array<int, array<string, mixed>>, subtotal:int, discount:int, total:int, deposit:int, balance:int, promo: ?\App\Models\PromoCode, items_count:int}
     */
    public function quote(array $items, ?string $promoCode = null, bool $lock = false): array
    {
        $ids = collect($items)->pluck('product_id')->unique()->all();
        $query = Product::query()->visible()->whereIn('id', $ids);
        $products = ($lock ? $query->lockForUpdate() : $query)->get()->keyBy('id');

        $lines = [];
        foreach ($items as $i => $item) {
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

        $subtotal = array_sum(array_column($lines, 'line_total'));
        $count = array_sum(array_column($lines, 'qty'));
        ['discount' => $discount, 'promo' => $promo] = $this->promos->best($subtotal, $count, $promoCode);
        $total = $subtotal - $discount;
        $deposit = (int) round($total * self::DEPOSIT_RATE);

        return [
            'lines' => $lines, 'products' => $products, 'subtotal' => $subtotal, 'discount' => $discount,
            'total' => $total, 'deposit' => $deposit, 'balance' => $total - $deposit, 'promo' => $promo, 'items_count' => $count,
        ];
    }

    /**
     * @param  array{source?:string, created_by?:int}  $meta  commande saisie par l'équipe
     */
    public function place(User $user, array $data, array $meta = []): Order
    {
        return DB::transaction(function () use ($user, $data, $meta) {
            // Verrou sur les lignes produit le temps de la transaction (stock)
            $q = $this->quote($data['items'], $data['promo_code'] ?? null, lock: true);
            $lines = $q['lines'];
            $this->stock->take($lines, $q['products']);

            $order = Order::query()->create([
                'reference' => Order::generateReference(),
                'user_id' => $user->id,
                'status' => OrderStatus::EnAttente,
                'subtotal' => $q['subtotal'],
                'discount' => $q['discount'],
                'promo_code' => $q['promo']?->code,
                'promo_label' => $q['promo']?->label,
                'source' => $meta['source'] ?? 'web',
                'created_by' => $meta['created_by'] ?? null,
                'total' => $q['total'],
                'deposit' => $q['deposit'],
                'balance' => $q['balance'],
                'payment_method' => $data['payment_method'],
                'payment_phone' => $data['payment_phone'],
                'delivery_city' => $data['delivery_city'],
                'delivery_address' => trim($data['delivery_address']),
            ]);

            $order->items()->createMany($lines);
            $q['promo']?->increment('uses');

            foreach ($lines as $line) {
                Product::query()->whereKey($line['product_id'])->increment('order_count', $line['qty']);
            }

            $order->log('created', ($meta['source'] ?? 'web') === 'manuel' ? 'Commande saisie par l’équipe' : null, null, OrderStatus::EnAttente->value, $meta['created_by'] ?? $user->id);

            event(new OrderPlaced($order));

            return $order->load('items.product', 'user');
        });
    }
}
