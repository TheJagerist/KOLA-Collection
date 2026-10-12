<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LoginCodeNotification extends Notification
{
    public function __construct(public string $code) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("{$this->code} — votre code de connexion Kōlā")
            ->greeting('Bonjour '.explode(' ', (string) $notifiable->full_name)[0].',')
            ->line('Voici votre code pour vous connecter à Kōlā Collection :')
            ->line("# {$this->code}")
            ->line('Il est valable 10 minutes. Si vous n’avez rien demandé, ignorez simplement cet e-mail.');
    }
}
