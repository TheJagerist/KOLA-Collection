<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\LoginCode;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\LoginCodeNotification;
use App\Notifications\OrderUpdateForCustomer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class LoginMethodsTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_requires_phone_and_password_confirmation(): void
    {
        $this->postJson('/api/auth/register', ['full_name' => 'Awa Ngoma', 'username' => 'awa', 'password' => 'motdepasse', 'password_confirmation' => 'motdepass', 'role' => 'parent'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.password.0', 'Les deux mots de passe ne correspondent pas.')
            ->assertJsonPath('errors.phone.0', 'Indiquez votre numéro de téléphone.');

        $this->postJson('/api/auth/register', [
            'full_name' => 'Awa Ngoma', 'username' => 'awa', 'password' => 'motdepasse', 'password_confirmation' => 'motdepasse', 'role' => 'parent',
            'email' => ' Awa@Exemple.CG ', 'phone' => '+242 06 111 22 33',
        ])->assertCreated()
            ->assertJsonPath('user.email', 'awa@exemple.cg')
            ->assertJsonPath('user.phone', '061112233')
            ->assertJsonPath('user.email_notifications', true);

        // E-mail facultatif
        $this->postJson('/api/auth/register', ['full_name' => 'Sans Mail', 'username' => 'sansmail', 'password' => 'motdepasse', 'password_confirmation' => 'motdepasse', 'phone' => '069998877', 'role' => 'eleve'])
            ->assertCreated()->assertJsonPath('user.email', null);

        // E-mail et téléphone déjà pris
        $this->postJson('/api/auth/register', ['full_name' => 'Doublon', 'username' => 'doublon', 'password' => 'motdepasse', 'password_confirmation' => 'motdepasse', 'role' => 'parent', 'email' => 'awa@exemple.cg', 'phone' => '061112233'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Cette adresse e-mail est déjà utilisée par un autre compte.')
            ->assertJsonPath('errors.phone.0', 'Ce numéro est déjà utilisé par un autre compte. Connectez-vous ou utilisez un autre numéro.');

        // Un client ne peut pas effacer son téléphone
        $token = $this->postJson('/api/auth/login', ['login' => 'awa', 'password' => 'motdepasse'])->json('token');
        $this->withToken($token)->patchJson('/api/auth/me', ['phone' => ''])->assertUnprocessable()->assertJsonPath('errors.phone.0', 'Le numéro de téléphone est obligatoire.');
    }

    public function test_password_login_with_username_email_or_phone(): void
    {
        User::factory()->create(['username' => 'awa', 'email' => 'awa@exemple.cg', 'phone' => '061112233', 'password' => 'secret123']);

        foreach (['awa', 'AWA@exemple.cg', '06 111 22 33', '+242061112233', '61112233'] as $login) {
            $this->postJson('/api/auth/login', ['login' => $login, 'password' => 'secret123'])->assertOk()->assertJsonStructure(['token']);
        }
        $this->postJson('/api/auth/login', ['login' => 'awa@exemple.cg', 'password' => 'mauvais'])
            ->assertUnprocessable()->assertJsonPath('errors.login.0', 'Identifiant ou mot de passe incorrect.');
    }

    public function test_one_time_code_by_email(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'awa@exemple.cg', 'email_verified_at' => null]);

        $res = $this->postJson('/api/auth/code', ['login' => 'awa@exemple.cg'])->assertOk()
            ->assertJsonPath('channel', 'email')
            ->assertJsonPath('destination', 'aw•@exemple.cg');

        $code = null;
        Notification::assertSentTo($user, LoginCodeNotification::class, function ($n) use (&$code) {
            $code = $n->code;

            return true;
        });
        $this->assertSame($code, $res->json('dev_code')); // dev : renvoyé pour tester sans boîte mail

        // Mauvais code : il reste des essais
        $this->postJson('/api/auth/code/verify', ['login' => 'awa@exemple.cg', 'code' => $code === '111111' ? '222222' : '111111'])
            ->assertUnprocessable()->assertJsonPath('errors.code.0', 'Code incorrect. Il vous reste 4 essai(s).');

        $this->postJson('/api/auth/code/verify', ['login' => 'awa@exemple.cg', 'code' => $code])->assertOk()->assertJsonStructure(['token', 'user']);
        $this->assertNotNull($user->fresh()->email_verified_at);

        // Usage unique
        $this->postJson('/api/auth/code/verify', ['login' => 'awa@exemple.cg', 'code' => $code])->assertUnprocessable();
    }

    public function test_one_time_code_by_sms_and_limits(): void
    {
        $user = User::factory()->create(['email' => null, 'phone' => '061112233']);

        $code = $this->postJson('/api/auth/code', ['login' => '06 111 22 33'])->assertOk()
            ->assertJsonPath('channel', 'sms')
            ->assertJsonPath('destination', '+242 06 ••• •• 33')
            ->json('dev_code');
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);

        // Pas de nouveau code dans les 45 secondes
        $this->postJson('/api/auth/code', ['login' => '061112233'])->assertUnprocessable();

        // Code expiré
        LoginCode::query()->update(['expires_at' => now()->subMinute()]);
        $this->postJson('/api/auth/code/verify', ['login' => '061112233', 'code' => $code])
            ->assertUnprocessable()->assertJsonPath('errors.code.0', 'Ce code a expiré. Demandez-en un nouveau.');

        // Compte sans e-mail ni téléphone / identifiant inconnu
        User::factory()->create(['username' => 'nul', 'email' => null, 'phone' => null]);
        $this->postJson('/api/auth/code', ['login' => 'nul'])->assertUnprocessable()->assertJsonValidationErrors('login');
        $this->postJson('/api/auth/code', ['login' => 'inconnu@exemple.cg'])->assertUnprocessable()
            ->assertJsonPath('errors.login.0', 'Aucun compte ne correspond à cet identifiant.');
        $this->assertNotNull($user->id);
    }

    public function test_passkey_endpoints(): void
    {
        $user = User::factory()->create(['username' => 'awa']);

        $this->actingAs($user)->postJson('/api/auth/passkeys/options')->assertOk()
            ->assertJsonPath('publicKey.rp.id', 'localhost')
            ->assertJsonPath('publicKey.authenticatorSelection.residentKey', 'required')
            ->assertJsonPath('publicKey.authenticatorSelection.userVerification', 'required');
        $this->actingAs($user)->getJson('/api/auth/passkeys')->assertOk()->assertJsonPath('data', []);

        $opts = $this->postJson('/api/auth/passkeys/login/options')->assertOk()->assertJsonStructure(['challenge_id', 'options' => ['publicKey' => ['challenge']]]);

        // Clé inconnue → refus propre
        $this->postJson('/api/auth/passkeys/login', [
            'challenge_id' => $opts->json('challenge_id'), 'id' => 'inconnu', 'client_data_json' => 'e30', 'authenticator_data' => 'AA', 'signature' => 'AA',
        ])->assertUnprocessable()->assertJsonValidationErrors('passkey');
    }

    public function test_customer_gets_order_emails_unless_disabled(): void
    {
        Notification::fake();
        $this->seed(\Database\Seeders\CatalogueSeeder::class);
        $client = User::factory()->create(['email' => 'awa@exemple.cg']);
        $product = Product::query()->first();

        $ref = $this->actingAs($client)->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'size' => $product->sizes[0], 'niveau' => $product->niveaux[0], 'qty' => 1]],
            'payment_method' => 'mtn', 'payment_phone' => '061112233', 'delivery_city' => 'Brazzaville', 'delivery_address' => 'Moungali, rue Mbaka',
        ])->assertCreated()->json('data.reference');

        Notification::assertSentTo($client, OrderUpdateForCustomer::class, fn ($n) => $n->event === 'placed');
        Order::query()->where('reference', $ref)->first()->transitionTo(OrderStatus::Validee);
        Notification::assertSentTo($client, OrderUpdateForCustomer::class, fn ($n) => $n->event === 'validee');

        // Le client coupe les e-mails depuis son profil
        $this->actingAs($client)->patchJson('/api/auth/me', ['email_notifications' => false])->assertOk()->assertJsonPath('data.email_notifications', false);
        Order::query()->where('reference', $ref)->first()->transitionTo(OrderStatus::Transit);
        Notification::assertNotSentTo($client, OrderUpdateForCustomer::class, fn ($n) => $n->event === 'transit');

        // Chaque e-mail se génère sans erreur
        $order = Order::query()->where('reference', $ref)->first();
        foreach (['placed', 'validee', 'transit', 'livre', 'annulee'] as $event) {
            $html = (string) (new OrderUpdateForCustomer($order, $event))->toMail($client)->render();
            $this->assertStringContainsString($ref, $html);
        }
        $this->assertStringContainsString('123456', (string) (new LoginCodeNotification('123456'))->toMail($client)->render());
    }
}
