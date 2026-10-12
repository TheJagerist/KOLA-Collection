<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Notifications affichées dans « Mon compte » : chaque utilisateur ne voit et ne modifie que les siennes. */
class NotificationController extends Controller
{
    /** GET /api/notifications : les 50 plus récentes + nombre de non lues. */
    public function index(Request $request)
    {
        $user = $request->user();

        return NotificationResource::collection($user->notifications()->latest()->limit(50)->get())
            ->additional(['meta' => ['unread_count' => $user->unreadNotifications()->count()]]);
    }

    /** POST /api/notifications/{id}/read */
    public function markAsRead(Request $request, string $id): NotificationResource
    {
        // Sous PostgreSQL, un identifiant qui n'est pas un UUID provoquerait une erreur 500 : on répond 404.
        abort_unless(Str::isUuid($id), 404);

        // Recherche dans les notifications de l'utilisateur connecté : celle d'un autre donne 404.
        $notification = $request->user()->notifications()->whereKey($id)->firstOrFail();
        $notification->markAsRead();

        return new NotificationResource($notification);
    }

    /** POST /api/notifications/read-all */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['unread_count' => 0]);
    }
}
