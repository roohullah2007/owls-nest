<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->string('agent_whatsapp')->nullable()->after('agent_phone');
            $table->string('office_address')->nullable()->after('agent_whatsapp');
            // Which contact methods are shown on the public site, e.g.
            // { "email": true, "phone": true, "whatsapp": false, "address": false }.
            $table->json('contact_display')->nullable()->after('office_address');
        });
    }

    public function down(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropColumn(['agent_whatsapp', 'office_address', 'contact_display']);
        });
    }
};
