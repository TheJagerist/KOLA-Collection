<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $items, array $overrides = []): array
    {
        return array_merge([
            'items' => $items,
            'payment_method' => 'mtn',
            'payment_phone' => '06 123 45 67',
            'delivery_city' => 'Brazzaville',
            'delivery_address' => 'Moungali, rue 12',
        ], $overrides);
    }

    public function test_guest_cannot_order(): void
    {
        $this->postJson('/api/orders', [])->assertUnauthorized();
    }

    public function test_prices_are_computed_server_side_and_client_prices_are_ignored(): void
    {
        $user = User::factory()->create();
        $chemise = Product::factory()->create(['price' => 5000]);
        $pantalon = Product::factory()->create(['collection_id' => $chemise->collection_id, 'price' => 6500, 'sizes' => ['12', 'S']]);

        $res = $this->actingAs($user)->postJson('/api/orders', $this->payload([
            ['product_id' => $chemise->id, 'size' => '12', 'niveau' => 'college', 'qty' => 2, 'unit_price' => 1],
            ['product_id' => $pantalon->id, 'size' => 'S', 'niveau' => 'lycee', 'qty' => 1],
        ], ['total' => 100, 'deposit' => 1]));

        $res->assertCreated()
            ->assertJsonPath('data.total', 16500)
            ->assertJsonPath('data.deposit', 8250)
            ->assertJsonPath('data.balance', 8250)
            ->assertJsonPath('data.status', 'en_attente')
            ->assertJsonPath('data.payment_phone', '061234567')
            ->assertJsonPath('data.items.0.unit_price', 5000)
            ->assertJsonPath('data.items.0.line_total', 10000);

        $this->assertMatchesRegularExpression('/^KLA-\d{4}-[A-Z2-9]{6}$/', $res->json('data.reference'));
        $this->assertSame(2, $chemise->fresh()->order_count);
    }

    public function test_odd_total_deposit_is_rounded_and_balance_completes_it(): void
    {
        $user = User::factory()->create();
        $p = Product::factory()->create(['price' => 3333]);

        $this->actingAs($user)->postJson('/api/orders', $this->payload([
            ['product_id' => $p->id, 'size' => '10', 'niveau' => 'college', 'qty' => 1],
        ]))->assertCreated()->assertJsonPath('data.deposit', 1667)->assertJsonPath('data.balance', 1666);
    }

    public function test_archived_product_wrong_size_and_bad_phone_are_rejected(): void
    {
        $user = User::factory()->create();
        $archived = Product::factory()->create(['is_archived' => true]);
        $ok = Product::factory()->create();

        $this->actingAs($user)->postJson('/api/orders', $this->payload([
            ['product_id' => $archived->id, 'size' => '10', 'niveau' => 'college', 'qty' => 1],
        ]))->assertUnprocessable()->assertJsonValidationErrors('items.0.product_id');

        $this->actingAs($user)->postJson('/api/orders', $this->payload([
            ['product_id' => $ok->id, 'size' => 'XXL', 'niveau' => 'college', 'qty' => 1],
        ]))->assertUnprocessable()->assertJsonValidationErrors('items.0.size');

        $this->actingAs($user)->postJson('/api/orders', $this->payload([
            ['product_id' => $ok->id, 'size' => '10', 'niveau' => 'college', 'qty' => 1],
        ], ['payment_phone' => '123', 'delivery_city' => 'Dolisie']))
            ->assertUnprocessable()->assertJsonValidationErrors(['payment_phone', 'delivery_city']);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_user_only_sees_own_orders(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $p = Product::factory()->create();
        $ref = $this->actingAs($alice)->postJson('/api/orders', $this->payload([
            ['product_id' => $p->id, 'size' => '10', 'niveau' => 'college', 'qty' => 1],
        ]))->json('data.reference');

        $this->actingAs($alice)->getJson('/api/orders')->assertJsonCount(1, 'data');
        $this->actingAs($alice)->getJson("/api/orders/{$ref}")->assertOk();

        $this->actingAs($bob)->getJson('/api/orders')->assertJsonCount(0, 'data');
        $this->actingAs($bob)->getJson("/api/orders/{$ref}")->assertNotFound();

        $this->actingAs(User::factory()->admin()->create())->getJson("/api/orders/{$ref}")
            ->assertOk()->assertJsonPath('data.customer.id', $alice->id);
    }

    public function test_ordered_product_cannot_be_hard_deleted(): void
    {
        $user = User::factory()->create();
        $p = Product::factory()->create();
        $this->actingAs($user)->postJson('/api/orders', $this->payload([
            ['product_id' => $p->id, 'size' => '10', 'niveau' => 'college', 'qty' => 1],
        ]))->assertCreated();

        $this->expectException(QueryException::class);
        $p->delete();
    }
}
