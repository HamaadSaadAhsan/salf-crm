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
        Schema::create('lead_google_drive_files', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('storage_account_id')->constrained()->cascadeOnDelete();
            $table->string('google_file_id');
            $table->string('file_name');
            $table->string('mime_type')->nullable();
            $table->bigInteger('file_size')->nullable();
            $table->string('icon_link')->nullable();
            $table->string('web_view_link', 2048)->nullable();
            $table->string('thumbnail_link', 2048)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_google_drive_files');
    }
};
