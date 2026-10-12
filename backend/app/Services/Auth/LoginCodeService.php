<?php

namespace App\Services\Auth;

use App\Models\LoginCode;
use App\Models\User;
use App\Notifications\LoginCodeNotification;
use App\Services\Sms\SmsSender;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Connexion sans mot de passe : un code à 6 chiffres envoyé par e-mail ou par SMS.
 * Valable 10 minutes, 5 essais au maximum, utilisable une seule fois.
 */
class LoginCodeService
{
    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    public function __construct(private SmsSender $sms) {}

    /** @return array{channel: string, destination: string, code: string} */
    public function send(User $user, string $preferred): array
    {
        $channel = match (true) {
            $preferred === 'email' && $user->email => 'email',
            $preferred === 'sms' && $user->phone => 'sms',
            (bool) $user->email => 'email',
            (bool) $user->phone => 'sms',
            default => throw ValidationException::withMessages([
                'login' => 'Ce compte n’a ni e-mail ni téléphone : connectez-vous avec votre mot de passe.',
            ]),
        };

        // Anti-abus : un nouveau code au plus toutes les 45 secondes
        $last = LoginCode::query()->where('user_id', $user->id)->latest('id')->first();
        if ($last && $last->created_at->gt(now()->subSeconds(45))) {
            throw ValidationException::withMessages(['login' => 'Un code vient d’être envoyé. Patientez quelques secondes avant d’en demander un autre.']);
        }

        $code = (string) random_int(100000, 999999);
        LoginCode::query()->where('user_id', $user->id)->whereNull('consumed_at')->update(['consumed_at' => now()]);
        LoginCode::query()->create([
            'user_id' => $user->id,
            'code_hash' => Hash::make($code),
            'channel' => $channel,
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        if ($channel === 'email') {
            $user->notify(new LoginCodeNotification($code));
        } else {
            $this->sms->send($user->phone, "Kola Collection : votre code de connexion est {$code}. Valable 10 min. Ne le partagez avec personne.");
        }

        return ['channel' => $channel, 'destination' => $channel === 'email' ? self::maskEmail($user->email) : self::maskPhone($user->phone), 'code' => $code];
    }

    public function verify(User $user, string $code): void
    {
        $login = LoginCode::query()->where('user_id', $user->id)->whereNull('consumed_at')->latest('id')->first();
        $fail = fn (string $m) => throw ValidationException::withMessages(['code' => $m]);

        if (! $login || $login->expires_at->isPast()) {
            $fail('Ce code a expiré. Demandez-en un nouveau.');
        }
        if ($login->attempts >= self::MAX_ATTEMPTS) {
            $login->update(['consumed_at' => now()]);
            $fail('Trop d’essais. Demandez un nouveau code.');
        }
        if (! Hash::check($code, $login->code_hash)) {
            $login->increment('attempts');
            $left = self::MAX_ATTEMPTS - $login->attempts;
            $fail($left > 0 ? "Code incorrect. Il vous reste {$left} essai(s)." : 'Trop d’essais. Demandez un nouveau code.');
        }

        $login->update(['consumed_at' => now()]);
        // Le code reçu par e-mail prouve que l'adresse appartient bien à la personne
        if ($login->channel === 'email' && ! $user->email_verified_at) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }
    }

    public static function maskEmail(string $email): string
    {
        [$name, $domain] = explode('@', $email, 2) + [1 => ''];

        return mb_substr($name, 0, 2).str_repeat('•', max(1, mb_strlen($name) - 2)).'@'.$domain;
    }

    public static function maskPhone(string $phone): string
    {
        return '+242 '.substr($phone, 0, 2).' ••• •• '.substr($phone, -2);
    }
}
