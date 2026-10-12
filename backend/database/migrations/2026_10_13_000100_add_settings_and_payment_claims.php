<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Réglages modifiables depuis l'admin (numéros Mobile Money, frais, WhatsApp de l'équipe)
 * et « paiement déclaré » par le client (dépôt Mobile Money manuel, à vérifier par l'équipe).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 60)->primary();
            $table->json('value')->nullable();
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->json('payment_claim')->nullable()->after('deposit_paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', fn (Blueprint $table) => $table->dropColumn('payment_claim'));
        Schema::dropIfExists('settings');
    }
};
