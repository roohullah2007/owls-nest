<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deals', function (Blueprint $table) {
            // Investor fields
            $table->decimal('arv', 12, 2)->nullable()->after('commission_amount');
            $table->decimal('repair_cost', 12, 2)->nullable()->after('arv');
            $table->decimal('assignment_fee', 12, 2)->nullable()->after('repair_cost');

            // Key dates
            $table->date('inspection_date')->nullable()->after('actual_close_date');
            $table->date('walkthrough_date')->nullable()->after('inspection_date');
            $table->date('possession_date')->nullable()->after('walkthrough_date');
            $table->date('earnest_money_due_date')->nullable()->after('possession_date');
            $table->date('due_diligence_date')->nullable()->after('earnest_money_due_date');

            // Stalled deal tracking
            $table->timestamp('last_activity_at')->nullable()->after('position');
            $table->index('last_activity_at');
        });
    }

    public function down(): void
    {
        Schema::table('deals', function (Blueprint $table) {
            $table->dropIndex(['last_activity_at']);
            $table->dropColumn([
                'arv',
                'repair_cost',
                'assignment_fee',
                'inspection_date',
                'walkthrough_date',
                'possession_date',
                'earnest_money_due_date',
                'due_diligence_date',
                'last_activity_at',
            ]);
        });
    }
};
