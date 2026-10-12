<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fonctionnalités d'administration :
 * stock par taille, rôles de l'équipe, note client, promotions, historique des commandes,
 * livraisons (livreur, créneau), commandes saisies à la main, paiements Mobile Money.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Stock par taille : {"10": 12, "12": 4}. NULL = stock non suivi pour cet article.
        Schema::table('products', function (Blueprint $table) {
            $table->jsonb('stock')->nullable()->after('sizes');
        });

        Schema::table('users', function (Blueprint $table) {
            // gerant | preparateur | livreur (uniquement pour is_admin = true)
            $table->string('staff_role', 20)->nullable()->after('is_admin');
            $table->text('admin_note')->nullable()->after('staff_role');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedInteger('subtotal')->default(0)->after('status');
            $table->unsignedInteger('discount')->default(0)->after('subtotal');
            $table->string('promo_code', 40)->nullable()->after('discount');
            $table->string('promo_label', 120)->nullable()->after('promo_code');
            $table->string('source', 10)->default('web')->after('promo_label'); // web | manuel
            $table->foreignId('created_by')->nullable()->after('source')->constrained('users')->nullOnDelete();
            $table->foreignId('courier_id')->nullable()->after('delivery_address')->constrained('users')->nullOnDelete();
            $table->date('delivery_date')->nullable()->after('courier_id');
            $table->string('delivery_slot', 60)->nullable()->after('delivery_date');
            $table->timestamp('deposit_paid_at')->nullable()->after('delivery_slot');
            $table->index('courier_id');
        });
        DB::table('orders')->update(['subtotal' => DB::raw('total')]);

        // Historique : changements de statut, notes internes, paiements, affectations
        Schema::create('order_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 20); // created | status | note | payment | delivery
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20)->nullable();
            $table->text('body')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['order_id', 'created_at']);
        });

        Schema::create('promo_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->nullable()->unique(); // NULL = remise automatique (ex. remise famille)
            $table->string('label', 120);
            $table->string('type', 10); // percent | amount
            $table->unsignedInteger('value');
            $table->unsignedSmallInteger('min_items')->default(0);
            $table->unsignedInteger('min_total')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('uses')->default(0);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 20);          // fake | cinetpay
            $table->string('kind', 10)->default('deposit'); // deposit | balance
            $table->unsignedInteger('amount');
            $table->string('status', 10)->default('pending'); // pending | success | failed
            $table->string('transaction_id', 64)->unique();
            $table->string('provider_ref')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('promo_codes');
        Schema::dropIfExists('order_events');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropConstrainedForeignId('courier_id');
            $table->dropColumn(['subtotal', 'discount', 'promo_code', 'promo_label', 'source', 'delivery_date', 'delivery_slot', 'deposit_paid_at']);
        });
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['staff_role', 'admin_note']));
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('stock'));
    }
};
