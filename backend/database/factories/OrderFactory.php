<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        return [
            'reference' => Order::generateReference(),
            'user_id' => User::factory(),
            'status' => 'en_attente',
            'total' => 10000,
            'deposit' => 5000,
            'balance' => 5000,
            'payment_method' => 'mtn',
            'payment_phone' => '061234567',
            'delivery_city' => 'Brazzaville',
            'delivery_address' => 'Moungali, rue 12',
        ];
    }
}
