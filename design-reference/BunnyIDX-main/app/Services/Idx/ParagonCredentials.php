<?php

declare(strict_types=1);

namespace App\Services\Idx;

use App\Models\IdxConnection;

/**
 * Credential set for a Paragon (paragonrels.com) OData account.
 *
 * Paragon is provisioned per customer AND per MLS: each MLS lives on its own
 * subdomain (e.g. https://PrimeMLS.paragonrels.com/OData/PrimeMLS) and the
 * customer's login/password act as the OAuth client_id/client_secret.
 *
 *  - clientId / clientSecret — per-connection, admin-provisioned at integration
 *    time, stored on the IdxConnection (client_secret encrypted).
 *  - baseUrl — per-MLS, supplied by the dataset (canonical) or the provider's
 *    data_source_config.base_url (admin test). It is the OData service root that
 *    both the identity token endpoint and the data resources hang off.
 *
 * Paragon has no platform-wide fallback account (unlike Bridge/Realtyna) — every
 * connection carries its own credentials.
 */
final class ParagonCredentials
{
    public function __construct(
        public readonly ?string $clientId,
        public readonly ?string $clientSecret,
        public readonly string $baseUrl,
    ) {}

    public static function fromConnection(IdxConnection $connection, string $baseUrl): self
    {
        return new self(
            clientId: $connection->client_id ?: null,
            clientSecret: $connection->client_secret ?: null,
            baseUrl: $baseUrl,
        );
    }

    public function hasClientPair(): bool
    {
        return ! empty($this->clientId) && ! empty($this->clientSecret);
    }

    /** OAuth2 token endpoint: {service root}/identity/connect/token. */
    public function tokenUrl(): string
    {
        return rtrim($this->baseUrl, '/').'/identity/connect/token';
    }

    /** OData resource URL: {service root}/{datasetPath}/{Resource}. */
    public function resourceUrl(string $datasetPath, string $resource): string
    {
        return rtrim($this->baseUrl, '/').'/'.trim($datasetPath, '/').'/'.$resource;
    }

    /** Stable cache discriminator — tokens are cached per (server, account). */
    public function cacheKey(): string
    {
        return sha1(rtrim($this->baseUrl, '/').'|'.(string) $this->clientId);
    }
}
