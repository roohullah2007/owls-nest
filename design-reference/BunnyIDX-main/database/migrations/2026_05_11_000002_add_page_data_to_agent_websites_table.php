<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->json('page_data')->nullable()->after('about_extended');
        });

        // Backfill existing sites
        foreach (\App\Models\AgentWebsite::all() as $site) {
            $pageData = [
                'home' => array_filter([
                    'hero_headline' => $site->getRawOriginal('hero_headline'),
                    'hero_subtitle' => $site->getRawOriginal('hero_subtitle'),
                ]),
                'about' => array_filter([
                    'about_extended' => $site->getRawOriginal('about_extended'),
                ]),
                'buy' => array_filter([
                    'headline' => $site->getRawOriginal('buy_headline'),
                    'description' => $site->getRawOriginal('buy_description'),
                ]),
                'sell' => array_filter([
                    'headline' => $site->getRawOriginal('sell_headline'),
                    'description' => $site->getRawOriginal('sell_description'),
                ]),
            ];

            // Only save if there's actual content
            $pageData = array_filter($pageData);
            if (! empty($pageData)) {
                $site->update(['page_data' => $pageData]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropColumn('page_data');
        });
    }
};
