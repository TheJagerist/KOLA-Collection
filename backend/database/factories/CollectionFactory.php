<?php

namespace Database\Factories;

use App\Models\Collection;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Collection>
 */
class CollectionFactory extends Factory
{
    protected $model = Collection::class;

    public function definition(): array
    {
        $name = 'Collection '.fake()->unique()->word();

        return ['name' => $name, 'slug' => Str::slug($name), 'is_active' => false];
    }

    public function active(): static
    {
        return $this->state(['is_active' => true]);
    }
}
