<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Phase 1 of Team-vs-Solo differentiation.
 *
 * The `plans` table is the runtime source of truth (config/features.php only
 * seeds fresh installs), so this migration:
 *   1. adds the `team` feature to the enterprise (Team) plan and ensures the
 *      pro (Solo) plan does NOT have it, and refreshes the plan-card copy;
 *   2. grandfathers every pro user who already owns or belongs to a team by
 *      setting feature_overrides['team'] = true, so no existing production team
 *      loses access to team features on deploy.
 *
 * Uses the query builder (not Eloquent) to avoid firing model events/observers
 * during migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Plan feature lists + copy.
        $this->setPlanFeature('enterprise', 'team', true);
        $this->setPlanFeature('pro', 'team', false);

        DB::table('plans')->where('key', 'pro')->update([
            'description' => 'Everything a solo agent needs — websites, IDX, email, phone & AI. One user.',
        ]);
        DB::table('plans')->where('key', 'enterprise')->update([
            'description' => 'Everything in Solo, plus team members, shared inbox, lead assignment & reports.',
        ]);

        // 2. Grandfather existing pro team users (owners and members).
        $ownerIds = DB::table('teams')->pluck('owner_id')->all();

        $rows = DB::table('users')
            ->where('subscription_tier', 'pro')
            ->where(function ($q) use ($ownerIds) {
                $q->whereNotNull('team_id');
                if (! empty($ownerIds)) {
                    $q->orWhereIn('id', $ownerIds);
                }
            })
            ->get(['id', 'feature_overrides']);

        $count = 0;
        foreach ($rows as $row) {
            $overrides = json_decode($row->feature_overrides ?? '[]', true);
            if (! is_array($overrides)) {
                $overrides = [];
            }
            if (array_key_exists('team', $overrides)) {
                continue; // respect any explicit prior override
            }
            $overrides['team'] = true;
            DB::table('users')->where('id', $row->id)->update([
                'feature_overrides' => json_encode($overrides),
            ]);
            $count++;
        }

        Log::info("[team-plan migration] Grandfathered {$count} pro users into the team feature.");
        if ($count > 0 && app()->runningInConsole()) {
            echo "Grandfathered {$count} existing pro team users into the team feature.\n";
        }
    }

    public function down(): void
    {
        $this->setPlanFeature('enterprise', 'team', false);
        // Intentionally NOT removing grandfathered feature_overrides on rollback —
        // doing so would revoke access from live teams.
    }

    private function setPlanFeature(string $key, string $feature, bool $enabled): void
    {
        $plan = DB::table('plans')->where('key', $key)->first();
        if (! $plan) {
            return;
        }

        $features = json_decode($plan->features ?? '[]', true);
        if (! is_array($features)) {
            $features = [];
        }
        $has = in_array($feature, $features, true);

        if ($enabled && ! $has) {
            $features[] = $feature;
        } elseif (! $enabled && $has) {
            $features = array_values(array_filter($features, fn ($f) => $f !== $feature));
        } else {
            return; // already in desired state
        }

        DB::table('plans')->where('key', $key)->update(['features' => json_encode($features)]);
    }
};
