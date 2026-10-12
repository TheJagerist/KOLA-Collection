<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Passkey extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['public_key'];

    protected $attributes = ['sign_count' => 0, 'last_used_at' => null];

    protected function casts(): array
    {
        return ['last_used_at' => 'datetime', 'sign_count' => 'integer'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
