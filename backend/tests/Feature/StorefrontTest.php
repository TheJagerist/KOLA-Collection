<?php

namespace Tests\Feature;

use App\Models\Collection;
use App\Models\Product;
use Database\Seeders\CatalogueSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StorefrontTest extends TestCase
{
    use RefreshDatabase;

    public function test_health(): void
    {
        $this->getJson('/api/health')->assertOk()->assertJson(['status' => 'ok']);
    }

    public function test_storefront_returns_active_collection_with_seeded_content(): void
    {
        Storage::fake('public');
        $this->seed(CatalogueSeeder::class);

        $this->getJson('/api/storefront')
            ->assertOk()
            ->assertJsonPath('collection.slug', 'ecolier')
            ->assertJsonPath('homepage.cta_primary_label', 'Voir le catalogue')
            ->assertJsonCount(5, 'carousel');
    }

    public function test_only_one_collection_can_be_active(): void
    {
        $a = Collection::factory()->active()->create();
        $b = Collection::factory()->create();

        $b->activate();

        $this->assertFalse($a->fresh()->is_active);
        $this->assertTrue($b->fresh()->is_active);
    }

    public function test_products_list_hides_archived_and_inactive_collections(): void
    {
        $visible = Product::factory()->create();
        Product::factory()->create(['collection_id' => $visible->collection_id, 'is_archived' => true]);
        Product::factory()->create(['collection_id' => Collection::factory()->create()->id]); // collection inactive

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $visible->id);
    }

    public function test_products_can_be_filtered_and_sorted(): void
    {
        $col = Collection::factory()->active()->create();
        Product::factory()->create(['collection_id' => $col->id, 'cat' => 'jupe', 'ensemble' => 'fille', 'price' => 5000]);
        Product::factory()->create(['collection_id' => $col->id, 'cat' => 'pantalon', 'ensemble' => 'fille', 'price' => 3000, 'niveaux' => ['lycee']]);
        Product::factory()->create(['collection_id' => $col->id, 'cat' => 'chemise', 'ensemble' => 'garcon', 'price' => 4000, 'niveaux' => ['college']]);

        $this->getJson('/api/products?ensemble[]=fille&sort=prix')
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.price', 3000);

        $this->getJson('/api/products?niveau[]=college')->assertJsonCount(2, 'data');
        $this->getJson('/api/products?cat[]=nimporte')->assertStatus(422);
    }

    public function test_product_can_be_fetched_by_slug_or_id(): void
    {
        $p = Product::factory()->create();

        $this->getJson("/api/products/{$p->slug}")->assertOk()->assertJsonPath('data.id', $p->id);
        $this->getJson("/api/products/{$p->id}")->assertOk()->assertJsonPath('data.slug', $p->slug);
        $this->getJson('/api/products/inexistant')->assertNotFound();
    }
}
