<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class GrantAdmin extends Command
{
    protected $signature = 'admin:grant {email} {--role=superadmin : superadmin or admin}';

    protected $description = 'Grant admin access to a user. Use this to bootstrap the first superadmin.';

    public function handle(): int
    {
        $role = $this->option('role');

        if (! in_array($role, User::ADMIN_ROLES, true)) {
            $this->error("Invalid role '{$role}'. Valid: " . implode(', ', User::ADMIN_ROLES));
            return self::FAILURE;
        }

        $user = User::where('email', $this->argument('email'))->first();
        if (! $user) {
            $this->error("No user found with email {$this->argument('email')}.");
            return self::FAILURE;
        }

        $user->update(['role' => $role]);

        $this->info("Granted role '{$role}' to {$user->name} ({$user->email}).");
        return self::SUCCESS;
    }
}
