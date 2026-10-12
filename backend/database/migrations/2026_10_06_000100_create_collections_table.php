<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collections', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        // Une seule collection active à la fois (index unique partiel, PostgreSQL et SQLite)
        DB::statement('CREATE UNIQUE INDEX collections_one_active ON collections (is_active) WHERE is_active');

        Schema::create('homepage_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collection_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('hero_eyebrow')->nullable();
            $table->string('hero_title');
            $table->text('hero_lede')->nullable();
            $table->string('cta_primary_label')->nullable();
            $table->timestamps();
        });

        Schema::create('carousel_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collection_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
            $table->index(['collection_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carousel_images');
        Schema::dropIfExists('homepage_contents');
        Schema::dropIfExists('collections');
    }
};
