<?php

use App\Http\Controllers\Api\Admin;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\StorefrontController;
use Illuminate\Support\Facades\Route;


/*
|--------------------------------------------------------------------------
| API Kōlā — préfixe /api
|--------------------------------------------------------------------------
| Contrat complet : docs/API.md (à la racine du dépôt).
| ✅ = implémenté et testé   🚧 = squelette à compléter (renvoie 501)
*/


Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'app' => config('app.name'),
    'time' => now()->toIso8601String(),
]));

// ---------------------------------------------------------------- Vitrine (public) ✅
Route::get('/storefront', StorefrontController::class);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{idOrSlug}', [ProductController::class, 'show']);

// ---------------------------------------------------------------- Authentification
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');   // ✅
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');         // ✅
    Route::get('/google/redirect', [GoogleAuthController::class, 'redirect']);                     // ✅
    Route::get('/google/callback', [GoogleAuthController::class, 'callback']);                     // ✅

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);                                 // ✅
        Route::get('/me', [AuthController::class, 'me']);                                          // ✅
    });
});

// ---------------------------------------------------------------- Commandes client ✅
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:orders');
    Route::get('/orders/{reference}', [OrderController::class, 'show']);
});

// ---------------------------------------------------------------- Administration 🚧
Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/orders', [Admin\OrderController::class, 'index']);
    Route::patch('/orders/{order}', [Admin\OrderController::class, 'update']);

    Route::get('/collections', [Admin\CollectionController::class, 'index']);
    Route::post('/collections', [Admin\CollectionController::class, 'store']);
    Route::post('/collections/{collection}/activate', [Admin\CollectionController::class, 'activate']);

    Route::put('/homepage', [Admin\HomepageController::class, 'update']);

    Route::get('/carousel', [Admin\CarouselController::class, 'index']);
    Route::post('/carousel', [Admin\CarouselController::class, 'store']);
    Route::post('/carousel/reorder', [Admin\CarouselController::class, 'reorder']);
    Route::delete('/carousel/{image}', [Admin\CarouselController::class, 'destroy']);

    Route::get('/products', [Admin\ProductController::class, 'index']);
    Route::post('/products', [Admin\ProductController::class, 'store']);
    Route::put('/products/{product}', [Admin\ProductController::class, 'update']);  // le front envoie POST + _method=PUT
    Route::delete('/products/{product}', [Admin\ProductController::class, 'destroy']);
    Route::post('/products/{product}/restore', [Admin\ProductController::class, 'restore']);
});
