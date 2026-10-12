<?php

namespace App\Notifications;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

/**
 * Notification au client quand sa commande change de statut.
 * Canal « database » pour tous (affichée dans « Mon compte »), e-mail en plus seulement si le client a une adresse.
 */
class OrderStatusNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> secondes entre deux tentatives */
    public array $backoff = [30, 120];

    public function __construct(public Order $order, public OrderStatus $status) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return $notifiable->email ? ['database', 'mail'] : ['database'];
    }

    /** @return array{order_reference: string, status: string, title: string, message: string} */
    public function toDatabase(object $notifiable): array
    {
        [$title, $message] = $this->texts();

        return [
            'order_reference' => $this->order->reference,
            'status' => $this->status->value,
            'title' => $title,
            'message' => $message,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        [$title, $message] = $this->texts();

        return (new MailMessage)
            ->subject("{$title} · commande {$this->order->reference}")
            ->greeting('Bonjour '.($notifiable->full_name ?: $notifiable->username).',')
            ->line($message)
            ->line("Référence de votre commande : **{$this->order->reference}**")
            ->salutation('Kōlā Collection');
    }

    /** @return array{0: string, 1: string} [titre, message] */
    private function texts(): array
    {
        $ref = $this->order->reference;

        return match ($this->status->value) {
            'validee' => [
                'Acompte reçu',
                "Nous avons bien reçu votre acompte de {$this->money($this->order->deposit)}. Votre commande {$ref} est validée et part en préparation.",
            ],
            'transit' => [
                'Commande en route',
                "Votre commande {$ref} est en route vers vous.",
            ],
            'livre' => [
                'Commande livrée',
                "Votre commande {$ref} a été livrée et le solde de {$this->money($this->order->balance)} a été encaissé. Merci de votre confiance !",
            ],
            // Statut qu'on n'a pas prévu (ajout futur dans l'enum) : message neutre plutôt que rien.
            default => [
                'Mise à jour de votre commande',
                "Le statut de votre commande {$ref} a changé.",
            ],
        };
    }

    private function money(int $amount): string
    {
        return number_format($amount, 0, ',', ' ').' FCFA';
    }
}
