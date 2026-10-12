<?php

namespace Tests\Feature;

use App\Models\Collection;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $u = User::factory()->create();
        $u->forceFill(['is_admin' => true])->save();

        return $u;
    }

    private function placeOrder(Product $p): string
    {
        $client = User::factory()->create(['full_name' => 'Nathalie Mbemba']);

        return $this->actingAs($client)->postJson('/api/orders', [
            'items' => [['product_id' => $p->id, 'size' => $p->sizes[0], 'niveau' => 'college', 'qty' => 1]],
            'payment_method' => 'airtel', 'payment_phone' => '055530853',
            'delivery_city' => 'Pointe-Noire', 'delivery_address' => 'Mpita',
        ])->assertCreated()->json('data.id');
    }

    public function test_non_admin_is_forbidden(): void
    {
        $this->getJson('/api/admin/orders')->assertUnauthorized();
        $this->actingAs(User::factory()->create())->getJson('/api/admin/orders')->assertForbidden();
    }

    public function test_admin_lists_orders_with_customer_and_changes_status(): void
    {
        $p = Product::factory()->create(['price' => 5000]);
        $id = $this->placeOrder($p);
        $admin = $this->admin();

        $this->actingAs($admin)->getJson('/api/admin/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.customer.full_name', 'Nathalie Mbemba');

        $this->actingAs($admin)->getJson('/api/admin/orders?status=livre')->assertOk()->assertJsonCount(0, 'data');

        $this->actingAs($admin)->patchJson("/api/admin/orders/{$id}", ['status' => 'livre'])
            ->assertOk()
            ->assertJsonPath('data.status', 'livre')
            ->assertJsonPath('data.balance_paid', true);

        $this->actingAs($admin)->patchJson("/api/admin/orders/{$id}", ['status' => 'nimporte'])->assertUnprocessable();
    }

    public function test_product_crud_with_images_and_archiving(): void
    {
        Storage::fake('public');
        Collection::factory()->create(['is_active' => true]);
        $admin = $this->actingAs($this->admin());

        $res = $admin->post('/api/admin/products', [
            'name' => 'Chemise kaki', 'ensemble' => 'garcon', 'cat' => 'chemise', 'price' => 5000,
            'sizes' => ['10', '12'], 'niveaux' => ['college'], 'construction' => ['Coton'],
            'image' => UploadedFile::fake()->image('c.jpg'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $id = $res->json('data.id');
        $this->assertSame('chemise-kaki', $res->json('data.slug'));
        $this->assertSame(['Coton'], $res->json('data.construction'));
        $this->assertStringStartsWith('/storage/products/', $res->json('data.image_url'));

        // Même nom → slug différent
        $admin->post('/api/admin/products', [
            'name' => 'Chemise kaki', 'ensemble' => 'garcon', 'cat' => 'chemise', 'price' => 5000, 'sizes' => ['10'], 'niveaux' => ['lycee'],
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.slug', 'chemise-kaki-1');

        // Modification partielle (POST + _method=PUT comme le front)
        $admin->post("/api/admin/products/{$id}", ['_method' => 'PUT', 'price' => 5500], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('data.price', 5500)->assertJsonPath('data.name', 'Chemise kaki');

        // Déjà commandé → archivé, puis réactivé
        $this->placeOrder(Product::query()->find($id));
        $admin = $this->actingAs(User::query()->where('is_admin', true)->first());
        $admin->deleteJson("/api/admin/products/{$id}")->assertOk()->assertJsonPath('archived', true);
        $this->getJson('/api/products')->assertJsonMissing(['id' => $id]);
        $admin->postJson("/api/admin/products/{$id}/restore")->assertOk()->assertJsonPath('data.is_archived', false);

        $this->assertCount(2, $admin->getJson('/api/admin/products')->json('data'));

        $admin->postJson('/api/admin/products', ['name' => ''])->assertUnprocessable()->assertJsonValidationErrors(['name', 'ensemble', 'price']);
    }

    public function test_collections_homepage_and_carousel(): void
    {
        Storage::fake('public');
        $admin = $this->actingAs($this->admin());

        // Sans collection active : 409 explicite
        $admin->putJson('/api/admin/homepage', ['hero_title' => 'Titre'])->assertStatus(409);

        $id = $admin->postJson('/api/admin/collections', ['name' => 'Rentrée 2026'])->assertCreated()->assertJsonPath('data.slug', 'rentree-2026')->json('data.id');
        $admin->postJson('/api/admin/collections', ['name' => 'Rentrée 2026'])->assertUnprocessable()->assertJsonPath('errors.slug.0', 'Une collection porte déjà ce nom.');
        $admin->postJson("/api/admin/collections/{$id}/activate")->assertOk()->assertJsonPath('data.is_active', true);
        $this->assertSame($id, Collection::active()->id);

        $admin->putJson('/api/admin/homepage', ['hero_title' => 'Les uniformes sont là', 'hero_lede' => 'Commandez en ligne'])
            ->assertSuccessful()->assertJsonPath('data.hero_title', 'Les uniformes sont là');
        $this->getJson('/api/storefront')->assertJsonPath('homepage.hero_title', 'Les uniformes sont là');

        $list = $admin->post('/api/admin/carousel', ['images' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.jpg')]], ['Accept' => 'application/json'])
            ->assertOk()->json('data');
        $this->assertCount(2, $list);

        [$a, $b] = [$list[0]['id'], $list[1]['id']];
        $admin->postJson('/api/admin/carousel/reorder', ['ids' => [$b, $a]])->assertOk()->assertJsonPath('data.0.id', $b);
        $admin->deleteJson("/api/admin/carousel/{$a}")->assertNoContent();
        $this->assertCount(1, $admin->getJson('/api/admin/carousel')->json('data'));
    }
}
