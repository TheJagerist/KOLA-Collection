<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collection_id')->constrained()->cascadeOnDelete();
            $table->string('slug')->unique();
            $table->string('name');
            $table->enum('ensemble', ['garcon', 'fille']);
            $table->enum('cat', ['chemise', 'pantalon', 'jupe']);
            $table->jsonb('sizes');                  // ["10","12","14","16","S","M"]
            $table->jsonb('niveaux');                // ["college","lycee"]
            $table->unsignedInteger('price');        // FCFA, entier
            $table->text('description')->nullable();
            $table->jsonb('construction')->nullable(); // liste de détails
            $table->string('badge', 40)->nullable();
            $table->string('image_path')->nullable();
            $table->string('sketch_path')->nullable();
            $table->unsignedInteger('order_count')->default(0);
            $table->boolean('is_archived')->default(false);
            $table->timestamps();

            $table->index(['collection_id', 'is_archived']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
