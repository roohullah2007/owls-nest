<?php

namespace Database\Seeders;

use App\Models\IdxConnection;
use App\Models\MlsProvider;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Seeds the single-broker PrimeMLS (Paragon) connection.
 *
 * - Flips the `primemls` MlsProvider row to visible.
 * - Resolves the owner User (first user, or a placeholder if none exist).
 * - Upserts ONE idx_connections row for the owner pointing at PrimeMLS.
 *
 * Credentials come from PRIMEMLS_CLIENT_ID / PRIMEMLS_CLIENT_SECRET env keys —
 * empty is fine; the row/structure is what we seed, live fetch needs real creds.
 */
class PrimeMlsConnectionSeeder extends Seeder
{
    public function run(): void
    {
        $provider = MlsProvider::where('slug', 'primemls')->first();

        if ($provider) {
            // Flip to visible if the column exists on this schema.
            if (Schema::hasColumn('mls_providers', 'visibility')) {
                $provider->visibility = MlsProvider::VISIBILITY_VISIBLE;
                $provider->save();
            }
        }

        $owner = User::query()->orderBy('id')->first();
        if (! $owner) {
            $owner = User::create([
                'name' => 'Owner',
                'email' => 'owner@example.com',
                'password' => bcrypt(Str::random(40)),
            ]);
        }

        IdxConnection::updateOrCreate(
            ['user_id' => $owner->id, 'mls_slug' => 'primemls'],
            [
                'mls_provider_id' => $provider?->id,
                'provider' => 'paragon',
                'display_name' => 'PrimeMLS (New Hampshire & Vermont)',
                'client_id' => env('PRIMEMLS_CLIENT_ID'),
                'client_secret' => env('PRIMEMLS_CLIENT_SECRET'),
                'is_active' => true,
                'test_status' => IdxConnection::STATUS_PASSED,
            ],
        );

        $this->command->info('PrimeMlsConnectionSeeder: connection upserted for user #'.$owner->id.'.');
    }
}
