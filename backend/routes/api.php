<?php

use App\Http\Controllers\Api\Admin;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\LoginCodeController;
use App\Http\Controllers\Api\PasskeyController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProfileController;
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
    // Code à usage unique par e-mail / SMS
    Route::post('/code', [LoginCodeController::class, 'request'])->middleware(['throttle:auth', 'throttle:login-code']);
    Route::post('/code/verify', [LoginCodeController::class, 'verify'])->middleware('throttle:auth');
    // Empreinte / Face ID (passkeys)
    Route::post('/passkeys/login/options', [PasskeyController::class, 'loginOptions'])->middleware('throttle:auth');
    Route::post('/passkeys/login', [PasskeyController::class, 'login'])->middleware('throttle:auth');
    Route::get('/google/redirect', [GoogleAuthController::class, 'redirect']);                     // ✅
    Route::get('/google/callback', [GoogleAuthController::class, 'callback']);                     // ✅

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);                                 // ✅
        Route::get('/me', [AuthController::class, 'me']);                                          // ✅

        // Profil (client et admin) ✅
        Route::patch('/me', [ProfileController::class, 'update']);
        Route::post('/me/avatar', [ProfileController::class, 'uploadAvatar']);
        Route::delete('/me/avatar', [ProfileController::class, 'deleteAvatar']);
        Route::put('/password', [ProfileController::class, 'updatePassword'])->middleware('throttle:auth');
        Route::post('/logout-others', [ProfileController::class, 'logoutOthers']);

        // Appareils autorisés à se connecter par empreinte / Face ID
        Route::get('/passkeys', [PasskeyController::class, 'index']);
        Route::post('/passkeys/options', [PasskeyController::class, 'registerOptions']);
        Route::post('/passkeys', [PasskeyController::class, 'store']);
        Route::delete('/passkeys/{passkey}', [PasskeyController::class, 'destroy']);
    });
});

// ---------------------------------------------------------------- Commandes client ✅
Route::post('/orders/quote', [OrderController::class, 'quote'])->middleware('throttle:60,1'); // aperçu remise / stock
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:orders');
    Route::get('/orders/{reference}', [OrderController::class, 'show']);
});

// ---------------------------------------------------------------- Paiement Mobile Money en ligne
Route::get('/payments/config', [PaymentController::class, 'config']);
Route::post('/payments/cinetpay/notify', [PaymentController::class, 'cinetpayNotify']); // appel serveur CinetPay
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/orders/{reference}/pay', [PaymentController::class, 'start']);
    Route::get('/payments/{transaction}', [PaymentController::class, 'show']);
    Route::post('/payments/fake/{transaction}', [PaymentController::class, 'fakeComplete']); // simulateur (dev)
});

// ---------------------------------------------------------------- Administration ✅
// Rôles : gérant (tout) · préparateur (commandes, clients) · livreur (ses livraisons)
Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function () {
    // Tous les rôles
    Route::get('/deliveries', [Admin\DeliveryController::class, 'index']);
    Route::post('/deliveries/{order}/start', [Admin\DeliveryController::class, 'start']);
    Route::post('/deliveries/{order}/delivered', [Admin\DeliveryController::class, 'delivered']);

    // Gérant + préparateur
    Route::middleware('staff:gerant,preparateur')->group(function () {
        Route::get('/orders', [Admin\OrderController::class, 'index']);
        Route::post('/orders', [Admin\OrderOpsController::class, 'store']);
        Route::patch('/orders/{order}', [Admin\OrderController::class, 'update']);
        Route::get('/orders/{order}/events', [Admin\OrderOpsController::class, 'events']);
        Route::post('/orders/{order}/notes', [Admin\OrderOpsController::class, 'addNote']);
        Route::patch('/orders/{order}/delivery', [Admin\OrderOpsController::class, 'delivery']);
        Route::get('/couriers', [Admin\OrderOpsController::class, 'couriers']);

        Route::get('/customers', [Admin\CustomerController::class, 'index']);
        Route::get('/customers/{user}', [Admin\CustomerController::class, 'show']);
        Route::patch('/customers/{user}', [Admin\CustomerController::class, 'update']);

        Route::get('/products', [Admin\ProductController::class, 'index']);
        Route::get('/stock/low', [Admin\StockController::class, 'low']);
    });

    // Gérant uniquement
    Route::middleware('staff:gerant')->group(function () {
        Route::get('/collections', [Admin\CollectionController::class, 'index']);
        Route::post('/collections', [Admin\CollectionController::class, 'store']);
        Route::post('/collections/{collection}/activate', [Admin\CollectionController::class, 'activate']);

        Route::put('/homepage', [Admin\HomepageController::class, 'update']);

        Route::get('/carousel', [Admin\CarouselController::class, 'index']);
        Route::post('/carousel', [Admin\CarouselController::class, 'store']);
        Route::post('/carousel/reorder', [Admin\CarouselController::class, 'reorder']);
        Route::delete('/carousel/{image}', [Admin\CarouselController::class, 'destroy']);

        Route::post('/products', [Admin\ProductController::class, 'store']);
        Route::put('/products/{product}', [Admin\ProductController::class, 'update']);  // le front envoie POST + _method=PUT
        Route::delete('/products/{product}', [Admin\ProductController::class, 'destroy']);
        Route::post('/products/{product}/restore', [Admin\ProductController::class, 'restore']);
        Route::put('/products/{product}/stock', [Admin\StockController::class, 'update']);

        Route::get('/promos', [Admin\PromoController::class, 'index']);
        Route::post('/promos', [Admin\PromoController::class, 'store']);
        Route::put('/promos/{promo}', [Admin\PromoController::class, 'update']);
        Route::delete('/promos/{promo}', [Admin\PromoController::class, 'destroy']);

        Route::get('/team', [Admin\TeamController::class, 'index']);
        Route::post('/team', [Admin\TeamController::class, 'store']);
        Route::patch('/team/{user}', [Admin\TeamController::class, 'update']);
        Route::delete('/team/{user}', [Admin\TeamController::class, 'destroy']);
    });
});
