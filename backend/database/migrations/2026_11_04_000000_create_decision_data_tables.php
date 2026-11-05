<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 64);
            $table->string('description', 160)->default('');
            $table->timestamps();
            $table->unique(['user_id', 'name']);
        });

        Schema::create('decision_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('name', 64);
            $table->string('description', 160)->default('');
            $table->boolean('is_favorite')->default(false);
            $table->boolean('is_excluded')->default(false);
            $table->timestamps();
            $table->unique(['category_id', 'name']);
            $table->index(['category_id', 'is_excluded']);
            $table->index(['category_id', 'is_favorite']);
        });

        Schema::create('decision_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('category_name', 64);
            $table->foreignId('selected_option_id')->nullable()->constrained('decision_options')->nullOnDelete();
            $table->string('selected_option_name', 64);
            $table->string('status', 16)->default('pending');
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'category_id', 'created_at']);
            $table->index(['user_id', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('decision_histories');
        Schema::dropIfExists('decision_options');
        Schema::dropIfExists('categories');
    }
};
