<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_profile_and_phone_is_normalized(): void
    {
        $user = User::factory()->create(['username' => 'nathalie']);
        Sanctum::actingAs($user);

        $this->patchJson('/api/auth/me', [
            'full_name' => '  Nathalie Mbemba ',
            'username' => 'Nath242',
            'email' => 'nath@example.cg',
            'phone' => '+242 06 444 55 66',
            'default_city' => 'Pointe-Noire',
            'default_address' => 'Quartier Mpita',
        ])
            ->assertOk()
            ->assertJsonPath('data.full_name', 'Nathalie Mbemba')
            ->assertJsonPath('data.username', 'nath242')
            ->assertJsonPath('data.phone', '064445566')
            ->assertJsonPath('data.default_city', 'Pointe-Noire');
    }

    public function test_profile_update_cannot_grant_admin_and_validates_in_french(): void
    {
        User::factory()->create(['username' => 'pris']);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->patchJson('/api/auth/me', ['is_admin' => true, 'full_name' => 'X'])->assertOk()->assertJsonPath('data.is_admin', false);

        $this->patchJson('/api/auth/me', ['username' => 'pris', 'phone' => '123', 'default_city' => 'Dolisie'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.username.0', "Ce nom d'utilisateur est déjà pris.")
            ->assertJsonValidationErrors(['phone', 'default_city']);
    }

    public function test_password_change_checks_current_and_revokes_other_tokens(): void
    {
        $user = User::factory()->create(['password' => 'ancienmdp1']);
        $other = $user->createToken('telephone')->plainTextToken;
        $token = $user->createToken('web')->plainTextToken;

        $this->withToken($token)->putJson('/api/auth/password', [
            'current_password' => 'mauvais', 'password' => 'nouveaumdp1', 'password_confirmation' => 'nouveaumdp1',
        ])->assertUnprocessable()->assertJsonPath('errors.current_password.0', 'Le mot de passe actuel est incorrect.');

        $this->withToken($token)->putJson('/api/auth/password', [
            'current_password' => 'ancienmdp1', 'password' => 'nouveaumdp1', 'password_confirmation' => 'nouveaumdp1',
        ])->assertOk();

        $this->assertTrue(Hash::check('nouveaumdp1', $user->fresh()->password));
        $this->assertSame(1, $user->tokens()->count()); // seul le jeton courant reste
        $this->assertNotNull($other);
    }

    public function test_avatar_upload_and_delete(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $url = $this->post('/api/auth/me/avatar', ['avatar' => UploadedFile::fake()->image('moi.jpg', 300, 300)], ['Accept' => 'application/json'])
            ->assertOk()
            ->json('data.avatar_url');
        $this->assertStringStartsWith('/storage/avatars/', $url);
        Storage::disk('public')->assertExists($user->fresh()->avatar_path);

        $this->deleteJson('/api/auth/me/avatar')->assertOk()->assertJsonPath('data.avatar_url', null);
    }
}
