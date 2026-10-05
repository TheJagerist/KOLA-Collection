<?php

namespace Database\Seeders;

use App\Enums\OrderStatus;
use App\Enums\Role;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Database\Seeder;

/** Données de démonstration — jamais en production */
class DemoSeeder extends Seeder
{
    public function run(OrderService $orders): void
    {
        $client = User::query()->firstOrCreate(
            ['username' => 'nathalie242'],
            ['full_name' => 'Nathalie Mbemba', 'password' => 'kola1234', 'role' => Role::Parent],
        );

        if ($client->orders()->exists()) {
            return;
        }

        $order = $orders->place($client, [
            'items' => [
                ['product_id' => $this->id('chemise-epaulette-kaki'), 'size' => '12', 'niveau' => 'college', 'qty' => 2],
                ['product_id' => $this->id('pantalon-homme-coupe-large'), 'size' => '12', 'niveau' => 'college', 'qty' => 1],
            ],
            'payment_method' => 'mtn',
            'payment_phone' => '061234567',
            'delivery_city' => 'Pointe-Noire',
            'delivery_address' => 'Quartier Mpita, avenue de la Paix',
        ]);
        $order->transitionTo(OrderStatus::Validee);
    }

    private function id(string $slug): int
    {
        return Product::query()->where('slug', $slug)->value('id');
    }
}
