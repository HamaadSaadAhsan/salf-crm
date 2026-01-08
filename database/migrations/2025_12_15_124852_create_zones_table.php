<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $useSqlite = config('database.default') === 'sqlite' || app()->environment('testing');

        Schema::create('zones', function (Blueprint $table) use ($useSqlite) {
            $table->id();
            $table->string('name')->unique();
            $table->string('code', 50)->nullable()->unique();
            $table->text('description')->nullable();
            $table->string('country_code', 2)->nullable();
            $table->boolean('is_active')->default(true);

            if ($useSqlite) {
                $table->json('metadata')->nullable();
            } else {
                $table->jsonb('metadata')->nullable();
            }

            $table->timestamps();
            $table->softDeletes();

            $table->index('is_active');
            $table->index('country_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('zones');
    }
};
