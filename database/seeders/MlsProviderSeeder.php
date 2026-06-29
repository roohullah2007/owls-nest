<?php

namespace Database\Seeders;

use App\Models\MlsProvider;
use Illuminate\Database\Seeder;

/**
 * Seeds the mls_providers table from config/idx.php.
 *
 * All entries are seeded as DRAFT — admin flips `visibility=visible` once an MLS
 * is configured and tested. Run with: php artisan db:seed --class=MlsProviderSeeder
 *
 * Idempotent: re-running will update display_name / region / logo / property_types /
 * statuses to match config, but will NOT change visibility, fees, or feed flags
 * (those are admin-managed once a provider exists in the DB).
 */
class MlsProviderSeeder extends Seeder
{
    public function run(): void
    {
        $datasets = config('idx.datasets', []);
        if (empty($datasets)) {
            $this->command->warn('No datasets found in config/idx.php.');

            return;
        }

        $created = 0;
        $updated = 0;
        $order = 0;

        foreach ($datasets as $slug => $data) {
            $order += 10;
            $provider = $this->mapProvider($data['provider'] ?? 'bridge');

            $existing = MlsProvider::where('slug', $slug)->first();

            $mutable = [
                'display_name' => $data['name'] ?? $slug,
                'region' => $data['region'] ?? null,
                'country' => str_contains(($data['region'] ?? ''), 'CA') ? 'CA' : 'US',
                'logo_url' => $data['logo'] ?? null,
                'property_types' => $data['property_types'] ?? null,
                'statuses' => $data['statuses'] ?? null,
                'data_source' => $provider,
            ];

            // Realtyna providers need their OriginatingSystemName in
            // data_source_config — the connection test + legacy search read it
            // from there. Merge it in without clobbering admin-set keys.
            $sourceConfig = ['dataset_slug' => $slug];
            if (! empty($data['originating_system_name'])) {
                $sourceConfig['originating_system_name'] = $data['originating_system_name'];
            }
            // Paragon providers need the OData service-root base_url in
            // data_source_config — the admin connection test reads it from there.
            if (! empty($data['base_url'])) {
                $sourceConfig['base_url'] = $data['base_url'];
            }

            if ($existing) {
                $existing->fill($mutable);
                $existing->data_source_config = array_merge($sourceConfig, $existing->data_source_config ?? []);
                $existing->save();
                $updated++;

                continue;
            }

            // New row — seed with safe admin-controlled defaults.
            MlsProvider::create([
                'slug' => $slug,
                ...$mutable,
                'data_source_config' => $sourceConfig,
                'has_idx_feed' => true,
                'has_vow_feed' => false,
                'monthly_fee_cents' => 0,
                'visibility' => MlsProvider::VISIBILITY_DRAFT,
                'sort_order' => $order,
            ]);
            $created++;
        }

        $this->command->info("MlsProviderSeeder: {$created} created, {$updated} updated. All new entries are DRAFT — admin can flip visibility per MLS.");
    }

    private function mapProvider(string $legacy): string
    {
        return match ($legacy) {
            'repliers' => MlsProvider::SOURCE_REPLIERS,
            'realtyna' => MlsProvider::SOURCE_REALTYNA,
            'paragon' => MlsProvider::SOURCE_PARAGON,
            default => MlsProvider::SOURCE_BRIDGE,
        };
    }
}
