<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'username' => $this->username,
            'email' => $this->email,
            'email_notifications' => (bool) $this->email_notifications,
            'phone' => $this->phone,
            'default_city' => $this->default_city,
            'default_address' => $this->default_address,
            // Photo envoyée sur Kōlā, sinon celle du compte Google
            'avatar_url' => Media::url($this->avatar_path) ?? ($this->resource->getAttributes()['avatar'] ?? null),
            'has_password' => $this->password !== null,
            'role' => $this->role?->value,
            'is_admin' => (bool) $this->is_admin,
            'staff_role' => $this->staffRole()?->value,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
