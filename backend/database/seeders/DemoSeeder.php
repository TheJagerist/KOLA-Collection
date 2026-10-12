<?php

namespace Database\Seeders;

use App\Enums\OrderStatus;
use App\Enums\Role;
use App\Models\Product;
use App\Models\PromoCode;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Database\Seeder;

/** Données de démonstration — jamais en production */
class DemoSeeder extends Seeder
{
    public function run(OrderService $orders): void
    {
        // Équipe de démonstration (rôles) — mot de passe kola1234
        foreach ([['prepa', 'Préparateur Kōlā', 'preparateur'], ['livreur', 'Livreur Kōlā', 'livreur']] as [$username, $name, $role]) {
            $staff = User::query()->firstOrCreate(['username' => $username], ['full_name' => $name, 'password' => 'kola1234', 'role' => Role::Parent, 'phone' => $role === 'livreur' ? '055555555' : null]);
            $staff->forceFill(['is_admin' => true, 'staff_role' => $role])->save();
        }

        // Exemple de remise automatique (désactivée : à activer depuis Admin → Promotions)
        PromoCode::query()->firstOrCreate(
            ['code' => null, 'label' => 'Remise famille dès 3 articles'],
            ['type' => 'percent', 'value' => 10, 'min_items' => 3, 'is_active' => false],
        );

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
