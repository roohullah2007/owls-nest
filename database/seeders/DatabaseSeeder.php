<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // IDX / PrimeMLS wiring. Order matters: providers first (the connection
        // seeder looks up the primemls provider), then flip the ADMIN_EMAIL
        // account to admin, then upsert the single-broker PrimeMLS connection.
        // All three are idempotent and non-destructive.
        $this->call([
            MlsProviderSeeder::class,
            AdminUserSeeder::class,
            PrimeMlsConnectionSeeder::class,
        ]);
    }
}
