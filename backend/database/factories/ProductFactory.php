<?php

namespace Database\Factories;

use App\Models\Collection;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = 'Chemise '.fake()->unique()->word();

        return [
            // Réutilise la collection active (une seule autorisée) ou en crée une
            'collection_id' => fn () => Collection::active()?->id ?? Collection::factory()->active()->create()->id,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)),
            'name' => $name,
            'ensemble' => 'garcon',
            'cat' => 'chemise',
            'sizes' => ['10', '12', '14', 'M'],
            'niveaux' => ['college', 'lycee'],
            'price' => 5000,
            'description' => fake()->sentence(),
            'construction' => [],
        ];
    }
}
