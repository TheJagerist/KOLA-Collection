<?php

namespace App\Http\Middleware;

use App\Enums\StaffRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restreint une route à certains rôles de l'équipe (à placer après « admin »).
 * Exemple : ->middleware('staff:gerant,preparateur')
 */
class EnsureStaffRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        $allowed = array_map(fn ($r) => StaffRole::from($r), $roles);

        if (! $user?->is_admin || ! $user->hasStaffRole(...$allowed)) {
            abort(403, 'Votre rôle ne permet pas cette action.');
        }

        return $next($request);
    }
}
