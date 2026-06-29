<?php

declare(strict_types=1);

namespace App\Services\Mls\Dto;

/**
 * Driver-level capability flags. The aggregating gateway uses these to skip
 * operations a provider can't do (rather than fail) — e.g. webhook subscription
 * for a driver that only supports polling.
 */
final readonly class MlsCapabilities
{
    public function __construct(
        public bool $supportsWebhooks = false,
        public bool $supportsVow = false,
        public bool $supportsAgentScoping = false,
        public bool $supportsOfficeScoping = false,
        public bool $supportsRawODataFilter = false,
    ) {}
}
