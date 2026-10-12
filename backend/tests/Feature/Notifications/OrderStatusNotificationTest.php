<?php

namespace Tests\Feature\Notifications;

use App\Enums\OrderStatus;
use App\Events\OrderStatusChanged;
use App\Listeners\NotifyCustomerOfStatusChange;
use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * ⚠️ Écrit sans pouvoir lancer la suite : suppose Order::factory() et User::factory() valides,
 * et le trait Notifiable sur User. Adapter si un test échoue pour cette raison.
 */
class OrderStatusNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function orderFor(User $user): Order
    {
        return Order::factory()->create(['user_id' => $user->id, 'status' => OrderStatus::EnAttente]);
    }

    public function test_status_change_dispatches_event(): void
    {
        Event::fake([OrderStatusChanged::class]);
        $order = $this->orderFor(User::factory()->create());

        $order->transitionTo(OrderStatus::Livre);

        Event::assertDispatched(
            OrderStatusChanged::class,
            fn (OrderStatusChanged $e) => $e->order->is($order)
                && $e->from === OrderStatus::EnAttente
                && $e->to === OrderStatus::Livre,
        );
    }

    public function test_same_status_dispatches_nothing(): void
    {
        Event::fake([OrderStatusChanged::class]);
        $order = $this->orderFor(User::factory()->create());

        $order->transitionTo(OrderStatus::EnAttente);

        Event::assertNotDispatched(OrderStatusChanged::class);
    }

    public function test_customer_without_email_gets_database_notification_only(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => null]);
        $order = $this->orderFor($user);

        (new NotifyCustomerOfStatusChange)->handle(new OrderStatusChanged($order, OrderStatus::EnAttente, OrderStatus::Livre));

        Notification::assertSentTo($user, OrderStatusNotification::class, fn ($n, $channels) => $channels === ['database']);
    }

    public function test_customer_with_email_gets_database_and_mail(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'client@example.com']);
        $order = $this->orderFor($user);

        (new NotifyCustomerOfStatusChange)->handle(new OrderStatusChanged($order, OrderStatus::EnAttente, OrderStatus::Livre));

        Notification::assertSentTo($user, OrderStatusNotification::class, fn ($n, $channels) => $channels === ['database', 'mail']);
    }

    public function test_back_to_pending_sends_nothing(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $order = $this->orderFor($user);

        (new NotifyCustomerOfStatusChange)->handle(new OrderStatusChanged($order, OrderStatus::Livre, OrderStatus::EnAttente));

        Notification::assertNothingSent();
    }

    public function test_user_lists_only_own_notifications(): void
    {
        $alice = User::factory()->create(['email' => null]);
        $bob = User::factory()->create(['email' => null]);
        Notification::sendNow($alice, new OrderStatusNotification($this->orderFor($alice), OrderStatus::Livre));
        Notification::sendNow($bob, new OrderStatusNotification($this->orderFor($bob), OrderStatus::Livre));

        Sanctum::actingAs($alice);

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.unread_count', 1)
            ->assertJsonPath('data.0.title', 'Commande livrée');
    }

    public function test_user_can_mark_own_notification_as_read(): void
    {
        $user = User::factory()->create(['email' => null]);
        Notification::sendNow($user, new OrderStatusNotification($this->orderFor($user), OrderStatus::Livre));
        $id = $user->notifications()->first()->id;

        Sanctum::actingAs($user);

        $this->postJson("/api/notifications/{$id}/read")->assertOk()->assertJsonPath('data.read', true);
        $this->assertSame(0, $user->unreadNotifications()->count());
    }

    public function test_user_cannot_read_someone_elses_notification(): void
    {
        $alice = User::factory()->create(['email' => null]);
        $bob = User::factory()->create(['email' => null]);
        Notification::sendNow($alice, new OrderStatusNotification($this->orderFor($alice), OrderStatus::Livre));
        $aliceNotificationId = $alice->notifications()->first()->id;

        Sanctum::actingAs($bob);

        $this->postJson("/api/notifications/{$aliceNotificationId}/read")->assertNotFound();
        $this->assertSame(1, $alice->unreadNotifications()->count());
    }

    public function test_malformed_id_returns_404_not_500(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/notifications/pas-un-uuid/read')->assertNotFound();
    }

    public function test_mark_all_as_read_and_guests_are_rejected(): void
    {
        $user = User::factory()->create(['email' => null]);
        Notification::sendNow($user, new OrderStatusNotification($this->orderFor($user), OrderStatus::from('transit')));
        Notification::sendNow($user, new OrderStatusNotification($this->orderFor($user), OrderStatus::Livre));

        $this->postJson('/api/notifications/read-all')->assertUnauthorized();

        Sanctum::actingAs($user);
        $this->postJson('/api/notifications/read-all')->assertOk()->assertJsonPath('unread_count', 0);
        $this->assertSame(0, $user->unreadNotifications()->count());
    }
}
