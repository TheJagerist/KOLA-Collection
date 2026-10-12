<?php

namespace App\Notifications;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * E-mail au client : confirmation de commande puis chaque étape (acompte reçu, en route, livrée).
 * Le lien ouvre sa commande, d'où il télécharge son reçu à jour.
 */
class OrderUpdateForCustomer extends Notification
{
    public function __construct(public Order $order, public string $event) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $o = $this->order->loadMissing('items', 'courier');
        $fcfa = fn (int $n) => number_format($n, 0, ',', ' ').' FCFA';
        $first = explode(' ', (string) $notifiable->full_name)[0];
        $url = rtrim((string) config('app.frontend_url'), '/').'/commande/confirmation/'.$o->reference;

        [$subject, $intro] = match ($this->event) {
            'placed' => ["Commande {$o->reference} enregistrée", "Merci pour votre commande ! Pour la confirmer, réglez l’acompte de **{$fcfa($o->deposit)}** par Mobile Money."],
            OrderStatus::Validee->value => ["Acompte reçu — commande {$o->reference}", "Nous avons bien reçu votre acompte de **{$fcfa($o->deposit)}**. Votre commande est en préparation."],
            OrderStatus::Transit->value => ["Votre commande {$o->reference} est en route", 'Votre commande est en cours de livraison'.($o->courier ? " avec {$o->courier->full_name}" : '').". Prévoyez **{$fcfa($o->balance_paid ? 0 : $o->balance)}** pour le solde."],
            OrderStatus::Livre->value => ["Commande {$o->reference} livrée", 'Votre commande a été livrée et entièrement réglée. Merci pour votre confiance !'],
            OrderStatus::Annulee->value => ["Commande {$o->reference} annulée", 'Votre commande a été annulée. Pour toute question, répondez simplement à cet e-mail ou écrivez-nous sur WhatsApp.'],
            default => ["Mise à jour de votre commande {$o->reference}", 'Le statut de votre commande a changé.'],
        };

        $mail = (new MailMessage)->subject($subject.' · Kōlā Collection')->greeting("Bonjour {$first},")->line($intro);

        if ($this->event === 'placed') {
            foreach ($o->items as $i) {
                $mail->line("• {$i->qty} × {$i->product_name} — taille {$i->size}");
            }
            $mail->line("Total : **{$fcfa($o->total)}**".($o->discount ? " (remise de {$fcfa($o->discount)} incluse)" : ''));
        }
        if ($o->delivery_date && in_array($this->event, [OrderStatus::Validee->value, OrderStatus::Transit->value], true)) {
            $mail->line('Livraison prévue le '.$o->delivery_date->locale('fr')->isoFormat('dddd D MMMM').($o->delivery_slot ? " ({$o->delivery_slot})" : '').'.');
        }

        return $mail
            ->action($this->event === OrderStatus::Annulee->value ? 'Voir ma commande' : 'Voir ma commande et mon reçu', $url)
            ->salutation('L’équipe Kōlā Collection');
    }
}
