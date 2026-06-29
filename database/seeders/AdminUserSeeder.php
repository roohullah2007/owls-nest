<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Grants admin access (users.is_admin = true) to the account in ADMIN_EMAIL.
 *
 * Reproducible and non-destructive: it only flips an EXISTING user to admin —
 * it never creates an account or sets a password. Register the account through
 * the app first, then run:  php artisan db:seed --class=AdminUserSeeder
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'visaab9002@gmail.com');

        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->command?->warn(
                "AdminUserSeeder: no user found with email {$email}. ".
                'Register that account first, then re-run this seeder '.
                '(or set ADMIN_EMAIL in your .env to an existing account).'
            );

            return;
        }

        $user->forceFill(['is_admin' => true])->save();

        $this->command?->info("AdminUserSeeder: {$email} is now an admin.");
    }
}
