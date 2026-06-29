<?php

namespace App\Providers;

use App\Listeners\RecordLoginActivity;
use App\Models\SystemSetting;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Strong password policy applied everywhere Password::defaults() is used
        // (registration, password reset, profile password change). Only affects
        // newly set/changed passwords — existing stored hashes are untouched.
        Password::defaults(fn () => Password::min(8)
            ->mixedCase()
            ->numbers()
            ->symbols());

        Event::listen(Login::class, [RecordLoginActivity::class, 'login']);
        Event::listen(Logout::class, [RecordLoginActivity::class, 'logout']);
        Event::listen(Failed::class, [RecordLoginActivity::class, 'failed']);

        $this->mergeOAuthCredentialsFromDb();
    }

    /**
     * Allow admins to configure Google/Microsoft OAuth credentials at runtime
     * (via the Connected Accounts pane) instead of having to redeploy with
     * new .env values. DB-stored values override anything in .env.
     */
    private function mergeOAuthCredentialsFromDb(): void
    {
        // Skip during fresh installs (migrations not yet run) and console
        // bootstrap that doesn't need OAuth.
        try {
            if (! Schema::hasTable('system_settings')) return;
        } catch (\Throwable) {
            return;
        }

        foreach (['google', 'microsoft'] as $provider) {
            $clientId = SystemSetting::get("{$provider}_client_id");
            $clientSecret = SystemSetting::get("{$provider}_client_secret");

            if ($clientId) Config::set("services.{$provider}.client_id", $clientId);
            if ($clientSecret) Config::set("services.{$provider}.client_secret", $clientSecret);

            // The Gmail OAuth flow reads from config('google.*') (legacy
            // config/google.php) — mirror Google creds there too so admins
            // don't have to set them in two places.
            if ($provider === 'google') {
                if ($clientId) Config::set('google.client_id', $clientId);
                if ($clientSecret) Config::set('google.client_secret', $clientSecret);
            }
        }
    }
}
