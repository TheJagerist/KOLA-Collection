<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentClaimTest extends TestCase
{
    use RefreshDatabase;

    private function order(User $client): string
    {
        $this->seed(\Database\Seeders\CatalogueSeeder::class);
        $p = Product::query()->first();

        return $this->actingAs($client)->postJson('/api/orders', [
            'items' => [['product_id' => $p->id, 'size' => $p->sizes[0], 'niveau' => $p->niveaux[0], 'qty' => 2]],
            'payment_method' => 'mtn', 'payment_phone' => '061112233', 'delivery_city' => 'Brazzaville', 'delivery_address' => 'Moungali, rue Mbaka',
        ])->assertCreated()->json('data.reference');
    }

    public function test_gerant_configures_mobile_money_numbers_and_client_sees_them(): void
    {
        $gerant = User::factory()->admin()->create();
        $this->actingAs($gerant)->putJson('/api/admin/settings', [
            'payment' => ['mtn' => ['number' => '06 444 55 66', 'name' => 'Kola Collection', 'ussd' => '*105#', 'fee_percent' => 1.5], 'note' => 'Frais à votre charge.'],
            'whatsapp' => ['shop_number' => '06 444 55 66', 'alerts' => [['name' => 'Gérant', 'phone' => '06 444 55 66', 'apikey' => '123456']]],
        ])->assertOk()
            ->assertJsonPath('data.payment.mtn.number', '064445566')
            ->assertJsonPath('data.whatsapp.shop_number', '242064445566')
            ->assertJsonPath('data.whatsapp.alerts.0.phone', '242064445566');

        $this->getJson('/api/payments/config')->assertOk()
            ->assertJsonPath('data.enabled', false)
            ->assertJsonPath('data.manual.mtn.number', '064445566')
            ->assertJsonPath('data.manual.mtn.fee_percent', 1.5)
            ->assertJsonPath('data.manual.note', 'Frais à votre charge.')
            ->assertJsonPath('data.manual.whatsapp', '242064445566')
            ->assertJsonMissingPath('data.whatsapp'); // les clés CallMeBot ne sont jamais publiques

        // Un préparateur n'a pas accès aux paramètres
        $prep = User::factory()->admin()->create(['staff_role' => 'preparateur']);
        $this->actingAs($prep)->getJson('/api/admin/settings')->assertForbidden();

        $this->actingAs($gerant)->putJson('/api/admin/settings', ['payment' => ['airtel' => ['number' => '123']]])
            ->assertUnprocessable()->assertJsonValidationErrors('payment.airtel.number');
    }

    public function test_client_declares_payment_team_is_alerted_and_claim_clears_on_validation(): void
    {
        $client = User::factory()->create();
        $ref = $this->order($client);

        $this->actingAs($client)->postJson("/api/orders/{$ref}/payment-claim", ['operator' => 'mtn', 'payer_phone' => '+242 06 111 22 33', 'transaction_ref' => 'MP2410.1234'])
            ->assertOk()
            ->assertJsonPath('data.payment_claim.kind', 'deposit')
            ->assertJsonPath('data.payment_claim.payer_phone', '061112233')
            ->assertJsonPath('data.payment_claim.transaction_ref', 'MP2410.1234')
            ->assertJsonPath('data.status', 'en_attente');

        $order = Order::query()->where('reference', $ref)->first();
        $this->assertStringContainsString('déclare avoir envoyé l’acompte', $order->events()->where('type', 'payment')->first()->body);

        // Un autre client ne peut pas déclarer sur cette commande
        $this->actingAs(User::factory()->create())->postJson("/api/orders/{$ref}/payment-claim", ['operator' => 'mtn', 'payer_phone' => '061112233'])->assertNotFound();

        // L'équipe valide : la déclaration est traitée
        $order->transitionTo(OrderStatus::Validee);
        $this->assertNull($order->fresh()->payment_claim);
    }

    public function test_whatsapp_alerts_are_sent_with_callmebot(): void
    {
        config(['kola.whatsapp_alerts' => 'callmebot']);
        Http::fake(['api.callmebot.com/*' => Http::response('ok')]);
        $gerant = User::factory()->admin()->create();
        $this->actingAs($gerant)->putJson('/api/admin/settings', ['whatsapp' => ['alerts' => [['name' => 'Gérant', 'phone' => '064445566', 'apikey' => '999']]]])->assertOk();

        $client = User::factory()->create(['full_name' => 'Awa Ngoma']);
        $ref = $this->order($client);

        Http::assertSent(fn ($r) => str_contains($r->url(), 'callmebot') && $r['phone'] === '+242064445566' && $r['apikey'] === '999' && str_contains($r['text'], $ref) && str_contains($r['text'], 'Awa Ngoma'));
    }
}
