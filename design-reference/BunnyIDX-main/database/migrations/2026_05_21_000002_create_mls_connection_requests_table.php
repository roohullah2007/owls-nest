<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mls_connection_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('mls_provider_id')->constrained()->cascadeOnDelete();

            // pending → in_process → completed → integrated, OR pending → denied
            $table->enum('status', ['pending', 'in_process', 'completed', 'integrated', 'denied'])->default('pending');

            // Which feeds the user wants (must be a subset of what the MlsProvider supports).
            $table->json('feed_types_requested');           // ['idx'] or ['idx', 'vow']

            // What the user gives us to identify themselves to the MLS.
            $table->string('agent_mls_id')->nullable();     // their MLS-issued agent ID
            $table->string('agent_license_number')->nullable();
            $table->string('office_mls_id')->nullable();
            $table->text('user_notes')->nullable();         // why they need it, special instructions

            // Admin processing.
            $table->text('admin_notes')->nullable();
            $table->text('denied_reason')->nullable();
            $table->foreignId('processed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('integrated_at')->nullable();

            // Link back to the provisioned connection once integrated.
            $table->foreignId('idx_connection_id')->nullable()->constrained()->nullOnDelete();

            $table->timestamps();
            $table->index(['status', 'created_at']);
            $table->index(['user_id', 'status']);
            $table->unique(['user_id', 'mls_provider_id'], 'one_active_request_per_user_per_mls');
        });

        // Link existing idx_connections back to the new catalog + request flow.
        Schema::table('idx_connections', function (Blueprint $table) {
            $table->foreignId('mls_provider_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->foreignId('connection_request_id')->nullable()->after('mls_provider_id')->constrained('mls_connection_requests')->nullOnDelete();
            $table->json('feed_types')->nullable()->after('connection_request_id');
        });
    }

    public function down(): void
    {
        Schema::table('idx_connections', function (Blueprint $table) {
            $table->dropConstrainedForeignId('mls_provider_id');
            $table->dropConstrainedForeignId('connection_request_id');
            $table->dropColumn('feed_types');
        });

        Schema::dropIfExists('mls_connection_requests');
    }
};
