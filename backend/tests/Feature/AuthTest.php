<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receives_a_token(): void
    {
        $this->postJson('/api/auth/register', [
            'full_name' => 'Nathalie Mbemba',
            'username' => 'Nathalie242',
            'password' => 'motdepasse',
            'role' => 'parent',
        ])
            ->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'full_name', 'username', 'role', 'is_admin']])
            ->assertJsonPath('user.username', 'nathalie242')
            ->assertJsonPath('user.is_admin', false);
    }

    public function test_register_cannot_grant_admin_rights(): void
    {
        $this->postJson('/api/auth/register', [
            'full_name' => 'Pirate', 'username' => 'pirate', 'password' => 'motdepasse', 'role' => 'parent', 'is_admin' => true,
        ])->assertCreated()->assertJsonPath('user.is_admin', false);

        $this->assertFalse(User::query()->where('username', 'pirate')->first()->is_admin);
    }

    public function test_register_validation_messages_are_in_french(): void
    {
        User::factory()->create(['username' => 'pris']);

        $this->postJson('/api/auth/register', ['full_name' => '', 'username' => 'pris', 'password' => 'court', 'role' => 'x'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['full_name', 'username', 'password', 'role'])
            ->assertJsonPath('errors.username.0', "Ce nom d'utilisateur est déjà pris.");
    }

    public function test_login_logout_and_me(): void
    {
        User::factory()->create(['username' => 'eleve01', 'password' => 'secret123', 'full_name' => 'Élève Test']);

        $this->postJson('/api/auth/login', ['username' => 'eleve01', 'password' => 'mauvais'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.username.0', "Nom d'utilisateur ou mot de passe incorrect.");

        $token = $this->postJson('/api/auth/login', ['username' => 'ELEVE01', 'password' => 'secret123'])
            ->assertOk()->json('token');

        $this->withToken($token)->getJson('/api/auth/me')->assertOk()->assertJsonPath('data.full_name', 'Élève Test');
        $this->withToken($token)->postJson('/api/auth/logout')->assertNoContent();

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_google_and_admin_endpoints_not_yet_implemented_return_501_or_403(): void
    {
        $this->getJson('/api/auth/google/redirect')->assertStatus(501);

        $client = User::factory()->create();
        $this->actingAs($client)->getJson('/api/admin/orders')->assertForbidden();

        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->getJson('/api/admin/orders')->assertStatus(501);
    }
}
