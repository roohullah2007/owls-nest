<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Models\LoginActivity;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Http\Request;

class RecordLoginActivity
{
    public function __construct(private Request $request)
    {
    }

    public function login(Login $event): void
    {
        $this->record(LoginActivity::EVENT_LOGIN, $event->user->id);
    }

    public function logout(Logout $event): void
    {
        $this->record(LoginActivity::EVENT_LOGOUT, $event->user?->id);
    }

    public function failed(Failed $event): void
    {
        $this->record(LoginActivity::EVENT_FAILED, $event->user?->id);
    }

    private function record(string $event, ?int $userId): void
    {
        $ua = (string) $this->request->userAgent();
        [$browser, $platform, $device] = $this->parseUserAgent($ua);

        LoginActivity::create([
            'user_id' => $userId,
            'event' => $event,
            'ip_address' => $this->request->ip(),
            'user_agent' => $ua,
            'device' => $device,
            'browser' => $browser,
            'platform' => $platform,
            'occurred_at' => now(),
        ]);
    }

    /**
     * Very small UA sniffer — good enough for showing "Chrome on macOS / iPhone"
     * in the access-history list without pulling in a UA-parser dependency.
     *
     * @return array{0:string,1:string,2:string} [browser, platform, device]
     */
    private function parseUserAgent(string $ua): array
    {
        $browser = 'Unknown';
        if (str_contains($ua, 'Edg/')) $browser = 'Edge';
        elseif (str_contains($ua, 'OPR/') || str_contains($ua, 'Opera')) $browser = 'Opera';
        elseif (str_contains($ua, 'Chrome/')) $browser = 'Chrome';
        elseif (str_contains($ua, 'Firefox/')) $browser = 'Firefox';
        elseif (str_contains($ua, 'Safari/')) $browser = 'Safari';

        $platform = 'Unknown';
        $device = 'Desktop';
        if (str_contains($ua, 'iPhone')) { $platform = 'iOS'; $device = 'iPhone'; }
        elseif (str_contains($ua, 'iPad')) { $platform = 'iPadOS'; $device = 'iPad'; }
        elseif (str_contains($ua, 'Android')) { $platform = 'Android'; $device = 'Mobile'; }
        elseif (str_contains($ua, 'Mac OS X') || str_contains($ua, 'Macintosh')) { $platform = 'macOS'; }
        elseif (str_contains($ua, 'Windows')) { $platform = 'Windows'; }
        elseif (str_contains($ua, 'Linux')) { $platform = 'Linux'; }

        return [$browser, $platform, $device];
    }
}
