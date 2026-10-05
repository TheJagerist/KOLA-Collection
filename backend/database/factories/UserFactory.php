<?php

namespace Database\Factories;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'full_name' => fake()->name(),
            'username' => Str::lower(Str::random(3)).fake()->unique()->numberBetween(100, 99999),
            'email' => null,
            'password' => static::$password ??= Hash::make('password'),
            'role' => Role::Parent,
            'remember_token' => Str::random(10),
        ];
    }

    /** Compte administrateur */
    public function admin(): static
    {
        return $this->afterMaking(fn (User $u) => $u->is_admin = true);
    }
}
