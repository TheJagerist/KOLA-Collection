<?php

namespace Tests\Feature\Admin;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_cannot_access_admin_orders(): void
    {
        $client = User::factory()->create();
        Sanctum::actingAs($client);

        $this->getJson('/api/admin/orders')->assertForbidden();
    }

    public function test_admin_lists_orders_and_can_filter_by_status(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        Order::factory()->create(['status' => OrderStatus::EnAttente]);
        Order::factory()->create(['status' => OrderStatus::Livre]);

        $this->getJson('/api/admin/orders')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/admin/orders?status=en_attente')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'en_attente');
    }

    public function test_admin_rejects_unknown_status_filter(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/orders?status=inconnu')
            ->assertUnprocessable();
    }

    public function test_admin_marking_order_delivered_records_balance_payment(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $order = Order::factory()->create(['status' => OrderStatus::Transit]);

        $this->patchJson("/api/admin/orders/{$order->id}", ['status' => 'livre'])
            ->assertOk()
            ->assertJsonPath('data.status', 'livre')
            ->assertJsonPath('data.balance_paid', true);

        $order->refresh();
        $this->assertTrue($order->balance_paid);
        $this->assertNotNull($order->delivered_at);
    }

    public function test_admin_rejects_invalid_status_on_update(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $order = Order::factory()->create();

        $this->patchJson("/api/admin/orders/{$order->id}", ['status' => 'n_importe_quoi'])
            ->assertUnprocessable();
    }
}