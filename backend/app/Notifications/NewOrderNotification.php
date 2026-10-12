<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

/** E-mail envoyé à l'équipe Kōlā pour chaque nouvelle commande (envoyé via la file d'attente). */
class NewOrderNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> secondes entre deux tentatives */
    public array $backoff = [30, 120];

    public function __construct(public Order $order) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $order = $this->order->loadMissing('items', 'user');
        $user = $order->user;

        $lines = $order->items->map(fn ($item) => sprintf(
            '- %d × %s (taille %s, niveau %s) : %s',
            $item->qty,
            $item->product_name,
            $item->size,
            $item->niveau instanceof \BackedEnum ? $item->niveau->value : $item->niveau,
            $this->money($item->line_total),
        ))->implode("\n");

        return (new MailMessage)
            ->subject("Nouvelle commande {$order->reference} · ".$this->money($order->total))
            ->greeting('Nouvelle commande reçue')
            ->line("Référence : **{$order->reference}**")
            ->line('**Client** : '.($user?->full_name ?: $user?->username ?: 'inconnu')
                .($user?->phone ? " · {$user->phone}" : '')
                .($user?->email ? " · {$user->email}" : ''))
            ->line("**Articles**\n\n{$lines}")
            ->line('**Total** : '.$this->money($order->total))
            ->line('**Acompte attendu (50 %)** : '.$this->money($order->deposit))
            ->line('**Solde à la livraison** : '.$this->money($order->balance))
            ->line('**Paiement** : '.$order->payment_method->value." · numéro {$order->payment_phone}")
            ->line("**Livraison** : {$order->delivery_city}, {$order->delivery_address}")
            ->salutation('Kōlā Collection');
    }

    private function money(int $amount): string
    {
        return number_format($amount, 0, ',', ' ').' FCFA';
    }
}
