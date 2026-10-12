<?php

namespace App\Models;

use App\Enums\Role;
use App\Enums\StaffRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $full_name
 * @property ?string $username
 * @property Role $role
 * @property bool $is_admin
 */
// ⚠️ is_admin n'est volontairement PAS dans Fillable : impossible de se donner les droits via une requête.
#[Fillable(['full_name', 'username', 'email', 'email_notifications', 'password', 'google_id', 'phone', 'role', 'default_city', 'default_address'])]
#[Hidden(['password', 'remember_token', 'google_id'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /** Valeurs par défaut (identiques à la base) pour un modèle tout juste créé */
    protected $attributes = [
        'role' => 'parent',
        'is_admin' => false,
        'phone' => null,
        'default_city' => null,
        'default_address' => null,
        'avatar_path' => null,
        'staff_role' => null,
        'admin_note' => null,
        'email_notifications' => true,
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => Role::class,
            'is_admin' => 'boolean',
            'staff_role' => StaffRole::class,
            'email_notifications' => 'boolean',
        ];
    }

    /** Empreinte / Face ID enregistrés sur ses appareils */
    public function passkeys(): HasMany
    {
        return $this->hasMany(Passkey::class);
    }

    /** Peut recevoir les e-mails de suivi (reçus, statuts) */
    public function wantsEmails(): bool
    {
        return (bool) $this->email && $this->email_notifications;
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /** Commandes à livrer par ce livreur */
    public function deliveries(): HasMany
    {
        return $this->hasMany(Order::class, 'courier_id');
    }

    /** Rôle effectif dans l'équipe : un admin sans rôle précisé est gérant (comptes créés avant les rôles) */
    public function staffRole(): ?StaffRole
    {
        if (! $this->is_admin) {
            return null;
        }

        return $this->staff_role ?? StaffRole::Gerant;
    }

    public function hasStaffRole(StaffRole ...$roles): bool
    {
        $role = $this->staffRole();

        return $role !== null && in_array($role, $roles, true);
    }
}
