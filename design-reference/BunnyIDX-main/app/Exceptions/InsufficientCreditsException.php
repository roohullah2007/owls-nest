<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by CreditService::charge() when a wallet can't cover a charge. Callers
 * (HTTP vs queued job) decide how to surface it; nothing should be sent/charged
 * when this is thrown.
 */
class InsufficientCreditsException extends RuntimeException
{
    public function __construct(
        public readonly int $requiredCents,
        public readonly int $balanceCents,
    ) {
        parent::__construct('Insufficient phone credits for this action.');
    }
}
