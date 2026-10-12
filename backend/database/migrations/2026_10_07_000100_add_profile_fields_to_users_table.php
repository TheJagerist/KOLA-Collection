<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Profil : adresse de livraison par défaut (pré-remplit le paiement) et photo */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('default_city', 40)->nullable()->after('phone');
            $table->string('default_address', 255)->nullable()->after('default_city');
            $table->string('avatar_path')->nullable()->after('default_address');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['default_city', 'default_address', 'avatar_path']);
        });
    }
};
