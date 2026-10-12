<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewOrderNotification extends Notification
{
    public function __construct(public Order $order) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $o = $this->order->loadMissing('items', 'user');
        $fcfa = fn (int $n) => number_format($n, 0, ',', ' ').' FCFA';

        $mail = (new MailMessage)
            ->subject("Nouvelle commande {$o->reference} — {$fcfa($o->total)}")
            ->greeting('Nouvelle commande sur Kōlā')
            ->line("**{$o->reference}** · {$o->user->full_name} · {$o->delivery_city}");

        foreach ($o->items as $i) {
            $mail->line("• {$i->qty} × {$i->product_name} — taille {$i->size}");
        }

        return $mail
            ->line("Total : {$fcfa($o->total)} — acompte à vérifier : {$fcfa($o->deposit)}")
            ->action('Ouvrir dans le tableau de bord', rtrim((string) config('app.frontend_url'), '/').'/admin/commandes?q='.$o->reference);
    }
}
