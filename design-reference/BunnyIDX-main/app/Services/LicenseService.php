<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\License;
use App\Models\LicenseDomain;
use Illuminate\Support\Facades\Cache;

class LicenseService
{
    public function generate(string $email, string $purchaseRef, string $source = 'stripe', ?int $userId = null): License
    {
        $key = $this->generateKey();

        return License::create([
            'key' => $key,
            'email' => $email,
            'purchase_ref' => $purchaseRef,
            'purchase_source' => $source,
            'user_id' => $userId,
            'status' => 'active',
        ]);
    }

    public function activate(string $key, string $domain, ?string $ip = null): LicenseDomain
    {
        $license = License::where('key', $key)->firstOrFail();

        abort_unless($license->isActive(), 403, 'License is not active.');

        // Deactivate any existing domain
        $license->domains()->where('is_active', true)->update([
            'is_active' => false,
            'deactivated_at' => now(),
        ]);

        $licenseDomain = $license->domains()->create([
            'domain' => $this->normalizeDomain($domain),
            'is_active' => true,
            'activated_at' => now(),
            'ip_address' => $ip,
        ]);

        $this->bustVerifyCache($key, $domain);

        return $licenseDomain;
    }

    public function verify(string $key, string $domain): bool
    {
        $cacheKey = "license:verify:{$key}:{$this->normalizeDomain($domain)}";

        return Cache::remember($cacheKey, config('idx.license.cache_ttl'), function () use ($key, $domain) {
            $license = License::where('key', $key)
                ->where('status', 'active')
                ->first();

            if (!$license) {
                return false;
            }

            $activeDomain = $license->activeDomain;

            return $activeDomain && $activeDomain->domain === $this->normalizeDomain($domain);
        });
    }

    public function deactivate(string $key, string $domain): void
    {
        $license = License::where('key', $key)->firstOrFail();

        $license->domains()
            ->where('domain', $this->normalizeDomain($domain))
            ->where('is_active', true)
            ->update([
                'is_active' => false,
                'deactivated_at' => now(),
            ]);

        $this->bustVerifyCache($key, $domain);
    }

    public function revoke(License $license, string $reason): void
    {
        $license->update([
            'status' => 'revoked',
            'revoked_at' => now(),
            'revoked_reason' => $reason,
        ]);

        // Bust cache for active domain
        if ($activeDomain = $license->activeDomain) {
            $this->bustVerifyCache($license->key, $activeDomain->domain);
        }
    }

    private function generateKey(): string
    {
        $prefix = config('idx.license.key_prefix');
        $charset = config('idx.license.charset');
        $segmentLength = config('idx.license.segment_length');
        $segments = config('idx.license.segments');

        do {
            $parts = [];
            for ($s = 0; $s < $segments; $s++) {
                $segment = '';
                for ($i = 0; $i < $segmentLength; $i++) {
                    $segment .= $charset[random_int(0, strlen($charset) - 1)];
                }
                $parts[] = $segment;
            }
            $key = $prefix . '-' . implode('-', $parts);
        } while (License::where('key', $key)->exists());

        return $key;
    }

    private function normalizeDomain(string $domain): string
    {
        $domain = strtolower(trim($domain));
        $domain = preg_replace('#^https?://#', '', $domain);
        $domain = rtrim($domain, '/');

        return $domain;
    }

    private function bustVerifyCache(string $key, string $domain): void
    {
        Cache::forget("license:verify:{$key}:{$this->normalizeDomain($domain)}");
    }
}
