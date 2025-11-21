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
        Schema::create('sip_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('username')->unique();
            $table->string('password');
            $table->string('domain')->default('localhost');
            $table->string('display_name')->nullable();
            $table->integer('port')->default(5060);
            $table->string('transport')->default('UDP'); // UDP, TCP, TLS
            $table->string('status')->default('inactive'); // active, inactive, registered, unregistered
            $table->timestamp('last_registered_at')->nullable();
            $table->json('sip_headers')->nullable(); // Additional SIP headers
            $table->string('codec_priority')->nullable(); // Preferred codec order
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sip_accounts');
    }
};
