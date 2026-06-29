<?php

declare(strict_types=1);

namespace App\Services\Idx;

use App\Models\IdxConnection;

/**
 * Credential set for a Realtyna / RealtyFeed account.
 *
 * Realtyna accounts are provisioned per customer by our admin team when an MLS
 * request is integrated — client_id / client_secret / api_key are stored
 * (encrypted) on the IdxConnection. The platform-wide .env credentials remain
 * as a fallback so legacy connections and admin smoke tests keep working.
 */
final class RealtynaCredentials
{
    public function __construct(
        public readonly ?string $clientId,
        public readonly ?string $clientSecret,
        public readonly ?string $apiKey,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            clientId: config('idx.realtyna.client_id') ?: null,
            clientSecret: config('idx.realtyna.client_secret') ?: null,
            apiKey: config('idx.realtyna.api_key') ?: null,
        );
    }

    /**
     * Connection-stored credentials win; any missing piece falls back to the
     * platform-wide config so partially-migrated connections don't break.
     */
    public static function fromConnection(IdxConnection $connection): self
    {
        $config = self::fromConfig();

        return new self(
            clientId: $connection->client_id ?: $config->clientId,
            clientSecret: $connection->client_secret ?: $config->clientSecret,
            apiKey: $connection->api_key ?: $config->apiKey,
        );
    }

    public function hasClientPair(): bool
    {
        return ! empty($this->clientId) && ! empty($this->clientSecret);
    }

    /** Stable cache discriminator — tokens are cached per Realtyna account. */
    public function cacheKey(): string
    {
        return sha1((string) $this->clientId);
    }
}
