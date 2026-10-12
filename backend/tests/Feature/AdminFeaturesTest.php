<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\PromoCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Stock, promos, rôles, commandes manuelles, historique, livraison, clients, équipe, paiement en ligne */
class AdminFeaturesTest extends TestCase
{
    use RefreshDatabase;

    private function staff(string $role = 'gerant', array $attrs = []): User
    {
        $u = User::factory()->create($attrs);
        $u->forceFill(['is_admin' => true, 'staff_role' => $role])->save();

        return $u->fresh();
    }

    private function orderPayload(Product $p, int $qty = 1, array $extra = []): array
    {
        return array_merge([
            'items' => [['product_id' => $p->id, 'size' => '12', 'niveau' => 'college', 'qty' => $qty]],
            'payment_method' => 'mtn', 'payment_phone' => '061234567',
            'delivery_city' => 'Brazzaville', 'delivery_address' => 'Moungali, rue 12',
        ], $extra);
    }

    public function test_stock_is_taken_checked_and_released_on_cancel(): void
    {
        $p = Product::factory()->create(['stock' => ['10' => 5, '12' => 2, '14' => 0, 'M' => 1]]);
        $client = User::factory()->create();

        $this->actingAs($client)->postJson('/api/orders', $this->orderPayload($p, 3))
            ->assertUnprocessable()->assertJsonValidationErrors(['items.0.qty' => "Il ne reste que 2 « {$p->name} » en taille 12."]);

        $id = $this->actingAs($client)->postJson('/api/orders', $this->orderPayload($p, 2))->assertCreated()->json('data.id');
        $this->assertSame(0, $p->fresh()->stock['12']);

        $this->actingAs($this->staff())->patchJson("/api/admin/orders/{$id}", ['status' => 'annulee'])->assertOk();
        $this->assertSame(2, $p->fresh()->stock['12']);

        // Stock non suivi = illimité
        $free = Product::factory()->create(['stock' => null]);
        $this->actingAs($client)->postJson('/api/orders', $this->orderPayload($free, 20))->assertCreated();
    }

    public function test_manager_sets_stock_and_sees_low_stock(): void
    {
        $p = Product::factory()->create(['sizes' => ['10', '12']]);
        $gerant = $this->staff();

        $this->actingAs($gerant)->putJson("/api/admin/products/{$p->id}/stock", ['stock' => ['10' => 7, '12' => 1, 'XXL' => 99]])
            ->assertOk()->assertJsonPath('data.stock.10', 7)->assertJsonPath('data.stock.12', 1)->assertJsonMissingPath('data.stock.XXL');
        $this->actingAs($gerant)->getJson('/api/admin/stock/low')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.size', '12');
    }

    public function test_family_discount_and_promo_code_best_one_applies(): void
    {
        $p = Product::factory()->create(['price' => 5000]);
        PromoCode::query()->create(['label' => 'Remise famille', 'type' => 'percent', 'value' => 10, 'min_items' => 3]);
        PromoCode::query()->create(['code' => 'RENTREE', 'label' => 'Rentrée', 'type' => 'amount', 'value' => 2000]);

        // 3 articles : 15 000 → remise famille 1 500 ; code RENTREE 2 000 (meilleur)
        $this->postJson('/api/orders/quote', ['items' => $this->orderPayload($p, 3)['items']])
            ->assertOk()->assertJsonPath('data.discount', 1500)->assertJsonPath('data.promo.label', 'Remise famille');
        $this->postJson('/api/orders/quote', ['items' => $this->orderPayload($p, 3)['items'], 'promo_code' => 'rentree'])
            ->assertOk()->assertJsonPath('data.discount', 2000)->assertJsonPath('data.total', 13000)->assertJsonPath('data.deposit', 6500);
        $this->postJson('/api/orders/quote', ['items' => $this->orderPayload($p, 1)['items'], 'promo_code' => 'FAUX'])
            ->assertUnprocessable()->assertJsonValidationErrors('promo_code');

        $res = $this->actingAs(User::factory()->create())->postJson('/api/orders', $this->orderPayload($p, 3, ['promo_code' => 'RENTREE']))
            ->assertCreated()->assertJsonPath('data.subtotal', 15000)->assertJsonPath('data.discount', 2000)->assertJsonPath('data.total', 13000);
        $this->assertSame(1, PromoCode::query()->where('code', 'RENTREE')->first()->uses);
        $this->assertSame('RENTREE', $res->json('data.promo_code'));
    }

    public function test_roles_restrict_access(): void
    {
        $livreur = $this->staff('livreur');
        $prep = $this->staff('preparateur');

        $this->actingAs($livreur)->getJson('/api/admin/orders')->assertForbidden();
        $this->actingAs($livreur)->getJson('/api/admin/deliveries')->assertOk();
        $this->actingAs($prep)->getJson('/api/admin/orders')->assertOk();
        $this->actingAs($prep)->getJson('/api/admin/team')->assertForbidden();
        $this->actingAs($prep)->postJson('/api/admin/collections', ['name' => 'X'])->assertForbidden();
        $this->actingAs($livreur)->getJson('/api/auth/me')->assertJsonPath('data.staff_role', 'livreur');

        // Ancien compte admin sans rôle = gérant
        $old = User::factory()->admin()->create();
        $this->actingAs($old)->getJson('/api/admin/team')->assertOk();
    }

    public function test_manual_order_creates_customer_and_logs_history_and_notes(): void
    {
        $p = Product::factory()->create(['price' => 5000]);
        $prep = $this->staff('preparateur');

        $res = $this->actingAs($prep)->postJson('/api/admin/orders', $this->orderPayload($p, 2, [
            'customer' => ['full_name' => 'Grâce Loubaki', 'phone' => '+242 05 111 22 33'],
            'deposit_received' => true,
        ]))->assertCreated()->assertJsonPath('data.status', 'validee')->assertJsonPath('data.source', 'manuel');

        $customer = User::query()->where('phone', '051112233')->first();
        $this->assertNotNull($customer);
        $this->assertFalse($customer->is_admin);

        // Même téléphone → même client
        $this->actingAs($prep)->postJson('/api/admin/orders', $this->orderPayload($p, 1, ['customer' => ['full_name' => 'Grace L.', 'phone' => '051112233']]))->assertCreated();
        $this->assertSame(2, $customer->orders()->count());

        $id = $res->json('data.id');
        $this->actingAs($prep)->postJson("/api/admin/orders/{$id}/notes", ['body' => 'Livrer après 17 h'])->assertCreated();
        $events = $this->actingAs($prep)->getJson("/api/admin/orders/{$id}/events")->assertOk()->json('data');
        $this->assertSame(['note', 'status', 'created'], array_column($events, 'type'));
        $this->assertSame($prep->full_name, $events[0]['user']['full_name']);
    }

    public function test_courier_assignment_and_delivery_flow(): void
    {
        $p = Product::factory()->create();
        $order = $this->actingAs(User::factory()->create())->postJson('/api/orders', $this->orderPayload($p))->json('data.id');
        $gerant = $this->staff();
        $livreur = $this->staff('livreur', ['full_name' => 'Junior Livreur']);
        $other = $this->staff('livreur');

        $this->actingAs($gerant)->patchJson("/api/admin/orders/{$order}", ['status' => 'validee'])->assertOk();
        $this->actingAs($gerant)->patchJson("/api/admin/orders/{$order}/delivery", ['courier_id' => $livreur->id, 'delivery_date' => now()->addDay()->toDateString(), 'delivery_slot' => '14h – 17h'])
            ->assertOk()->assertJsonPath('data.courier.full_name', 'Junior Livreur')->assertJsonPath('data.delivery_slot', '14h – 17h');

        $this->actingAs($livreur)->getJson('/api/admin/deliveries')->assertJsonCount(1, 'data');
        $this->actingAs($other)->getJson('/api/admin/deliveries')->assertJsonCount(0, 'data');
        $this->actingAs($other)->postJson("/api/admin/deliveries/{$order}/delivered")->assertForbidden();

        $this->actingAs($livreur)->postJson("/api/admin/deliveries/{$order}/start")->assertOk()->assertJsonPath('data.status', 'transit');
        $this->actingAs($livreur)->postJson("/api/admin/deliveries/{$order}/delivered", ['note' => 'Remis à la maman'])
            ->assertOk()->assertJsonPath('data.status', 'livre')->assertJsonPath('data.balance_paid', true);
    }

    public function test_customers_list_detail_and_note(): void
    {
        $p = Product::factory()->create(['price' => 5000]);
        $client = User::factory()->create(['full_name' => 'Ruth Moukala']);
        $this->actingAs($client)->postJson('/api/orders', $this->orderPayload($p, 2))->assertCreated();
        $gerant = $this->staff();

        $this->actingAs($gerant)->getJson('/api/admin/customers')->assertOk()
            ->assertJsonPath('data.0.full_name', 'Ruth Moukala')->assertJsonPath('data.0.orders_count', 1)->assertJsonPath('data.0.total_spent', 10000);
        $this->actingAs($gerant)->getJson("/api/admin/customers/{$client->id}")->assertOk()
            ->assertJsonPath('data.usual_sizes.0.size', '12')->assertJsonCount(1, 'data.orders');
        $this->actingAs($gerant)->patchJson("/api/admin/customers/{$client->id}", ['admin_note' => 'Cliente fidèle'])->assertOk();
        $this->assertSame('Cliente fidèle', $client->fresh()->admin_note);
        $this->actingAs($gerant)->getJson("/api/admin/customers/{$gerant->id}")->assertNotFound();
    }

    public function test_team_management_keeps_one_manager(): void
    {
        $gerant = $this->staff();
        $id = $this->actingAs($gerant)->postJson('/api/admin/team', ['full_name' => 'Hervé', 'username' => 'herve', 'password' => 'motdepasse', 'staff_role' => 'livreur'])
            ->assertCreated()->assertJsonPath('data.staff_role', 'livreur')->json('data.id');
        $this->postJson('/api/auth/login', ['username' => 'herve', 'password' => 'motdepasse'])->assertOk()->assertJsonPath('user.staff_role', 'livreur');

        $this->actingAs($gerant)->patchJson("/api/admin/team/{$gerant->id}", ['staff_role' => 'livreur'])->assertStatus(422);
        $this->actingAs($gerant)->deleteJson("/api/admin/team/{$gerant->id}")->assertStatus(422);
        $this->actingAs($gerant)->deleteJson("/api/admin/team/{$id}")->assertOk();
        $this->assertFalse(User::query()->find($id)->is_admin);
    }

    public function test_promo_crud(): void
    {
        $gerant = $this->staff();
        $id = $this->actingAs($gerant)->postJson('/api/admin/promos', ['code' => 'famille10', 'label' => 'Famille', 'type' => 'percent', 'value' => 10, 'min_items' => 3])
            ->assertCreated()->assertJsonPath('data.code', 'FAMILLE10')->json('data.id');
        $this->actingAs($gerant)->postJson('/api/admin/promos', ['code' => 'FAMILLE10', 'label' => 'x', 'type' => 'percent', 'value' => 5])->assertUnprocessable();
        $this->actingAs($gerant)->putJson("/api/admin/promos/{$id}", ['label' => 'Famille', 'type' => 'percent', 'value' => 15, 'is_active' => false])->assertOk()->assertJsonPath('data.value', 15);
        $this->actingAs($gerant)->deleteJson("/api/admin/promos/{$id}")->assertNoContent();
    }

    public function test_online_deposit_payment_with_simulator_validates_order(): void
    {
        config(['kola.payments.driver' => 'fake']);
        $p = Product::factory()->create(['price' => 5000]);
        $client = User::factory()->create();
        Sanctum::actingAs($client);
        $ref = $this->postJson('/api/orders', $this->orderPayload($p, 2))->json('data.reference');

        $this->getJson('/api/payments/config')->assertJsonPath('data.enabled', true);
        $tx = $this->postJson("/api/orders/{$ref}/pay")->assertCreated()->assertJsonPath('data.amount', 5000)->json('data.transaction_id');
        $this->postJson("/api/payments/fake/{$tx}", ['success' => true])->assertOk()->assertJsonPath('data.status', 'success');

        $order = Order::query()->where('reference', $ref)->first();
        $this->assertSame('validee', $order->status->value);
        $this->assertNotNull($order->deposit_paid_at);
        $this->postJson("/api/orders/{$ref}/pay")->assertUnprocessable(); // déjà réglé

        // Un autre client ne voit pas ce paiement
        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/payments/{$tx}")->assertNotFound();
    }

    public function test_cinetpay_notification_is_verified_with_cinetpay(): void
    {
        config(['kola.payments.driver' => 'cinetpay', 'kola.payments.cinetpay.site_id' => '123', 'kola.payments.cinetpay.api_key' => 'k']);
        Http::fake([
            '*/payment/check' => Http::response(['code' => '00', 'data' => ['status' => 'ACCEPTED', 'operator_id' => 'MP2610']]),
            '*/payment' => Http::response(['code' => '201', 'data' => ['payment_url' => 'https://checkout.cinetpay.com/payment/abc']]),
        ]);
        $p = Product::factory()->create(['price' => 5000]);
        Sanctum::actingAs(User::factory()->create());
        $ref = $this->postJson('/api/orders', $this->orderPayload($p, 1))->json('data.reference');

        $res = $this->postJson("/api/orders/{$ref}/pay")->assertCreated()->assertJsonPath('data.url', 'https://checkout.cinetpay.com/payment/abc');
        $this->postJson('/api/payments/cinetpay/notify', ['cpm_trans_id' => $res->json('data.transaction_id')])->assertOk();

        $this->assertSame('validee', Order::query()->where('reference', $ref)->first()->status->value);
        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/payment/check') && $r['transaction_id'] === $res->json('data.transaction_id'));
    }
}
