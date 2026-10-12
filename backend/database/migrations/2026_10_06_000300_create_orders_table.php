<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 20)->unique();   // KLA-2026-7F3K9Q
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->enum('status', ['en_attente', 'validee', 'transit', 'livre', 'annulee'])->default('en_attente');
            // Montants en FCFA, toujours calculés côté serveur
            $table->unsignedInteger('total');
            $table->unsignedInteger('deposit');
            $table->unsignedInteger('balance');
            $table->boolean('balance_paid')->default(false);
            $table->enum('payment_method', ['airtel', 'mtn']);
            $table->string('payment_phone', 9);
            $table->string('delivery_city', 40);
            $table->string('delivery_address');
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index('status');
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            // restrict : un produit déjà commandé ne peut pas être supprimé (il est archivé)
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->string('product_name');              // copie au moment de la commande
            $table->string('size', 10);
            $table->enum('niveau', ['college', 'lycee']);
            $table->unsignedSmallInteger('qty');
            $table->unsignedInteger('unit_price');       // copie au moment de la commande
            $table->unsignedInteger('line_total');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
