<?php

namespace Tests\Feature\Notifications;

use App\Enums\Niveau;
use App\Enums\PaymentMethod;
use App\Events\OrderPlaced;
use App\Listeners\SendNewOrderNotification;
use App\Models\Collection;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\NewOrderNotification;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * ⚠️ Écrit sans pouvoir lancer la suite : les factories User/Product et les colonnes de Product
 * (sizes, niveaux, price) sont supposées d'après OrderService. Adapter `makeOrder()` si besoin.
 */
class OrderPlacedNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function makeOrder(): Order
    {
        $user = User::factory()->create();
        $niveau = Niveau::cases()[0]->value; // vraie valeur de l'enum, pas une valeur inventée
        // Product::visible() suppose une collection active : adapter 'collection_id' au vrai nom de colonne si besoin
        $collection = Collection::factory()->active()->create();
        $product = Product::factory()->create([
            'collection_id' => $collection->id,
            'price' => 10000,
            'sizes' => ['M'],
            'niveaux' => [$niveau],
        ]);

        return app(OrderService::class)->place($user, [
            'items' => [['product_id' => $product->id, 'size' => 'M', 'niveau' => $niveau, 'qty' => 2]],
            'payment_method' => PaymentMethod::cases()[0]->value,
            'payment_phone' => '060000000',
            'delivery_city' => 'Brazzaville',
            'delivery_address' => 'Poto-Poto, avenue de la Paix',
        ]);
    }

    public function test_placing_an_order_dispatches_order_placed(): void
    {
        Event::fake([OrderPlaced::class]);

        $order = $this->makeOrder();

        Event::assertDispatched(OrderPlaced::class, fn (OrderPlaced $e) => $e->order->is($order));
    }

    public function test_listener_notifies_the_team_by_mail(): void
    {
        config(['kola.notify_emails' => ['KolaCollection@gmail.com']]);
        Event::fake([OrderPlaced::class]); // on appelle le listener à la main
        Notification::fake();

        $order = $this->makeOrder();
        (new SendNewOrderNotification)->handle(new OrderPlaced($order));

        Notification::assertSentOnDemand(
            NewOrderNotification::class,
            fn ($notification, $channels, $notifiable) => $channels === ['mail']
                && $notifiable->routes['mail'] === ['KolaCollection@gmail.com'],
        );
    }

    public function test_no_notification_when_team_email_is_not_configured(): void
    {
        config(['kola.notify_emails' => []]);
        Event::fake([OrderPlaced::class]);
        Notification::fake();

        $order = $this->makeOrder();
        (new SendNewOrderNotification)->handle(new OrderPlaced($order));

        Notification::assertNothingSent();
    }

    public function test_mail_contains_reference_total_and_deposit(): void
    {
        Event::fake([OrderPlaced::class]);
        $order = $this->makeOrder();

        $html = (string) (new NewOrderNotification($order))->toMail(new \Illuminate\Notifications\AnonymousNotifiable)->render();

        $this->assertStringContainsString($order->reference, $html);
        $this->assertStringContainsString('20 000 FCFA', $html); // total : 2 × 10 000
        $this->assertStringContainsString('10 000 FCFA', $html); // acompte 50 %
    }

    public function test_invalid_order_dispatches_no_event(): void
    {
        Event::fake([OrderPlaced::class]);
        $user = User::factory()->create();

        try {
            app(OrderService::class)->place($user, [
                'items' => [['product_id' => 999999, 'size' => 'M', 'niveau' => '6e', 'qty' => 1]],
                'payment_method' => PaymentMethod::cases()[0]->value,
                'payment_phone' => '060000000',
                'delivery_city' => 'Brazzaville',
                'delivery_address' => 'x',
            ]);
        } catch (\Illuminate\Validation\ValidationException) {
        }

        Event::assertNotDispatched(OrderPlaced::class);
    }
}
