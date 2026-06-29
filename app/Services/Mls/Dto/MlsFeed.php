<?php

declare(strict_types=1);

namespace App\Services\Mls\Dto;

/**
 * Which feed a query targets.
 *
 *  - IDX (Internet Data Exchange): public-facing dataset, restricted fields.
 *    Default for all consumer/agent UIs. Compliance-safe.
 *  - VOW (Virtual Office Website): authenticated-user dataset, broader fields
 *    (sold prices, withdrawn/expired listings, agent-only remarks). Requires
 *    user registration in most jurisdictions — use only when displayed behind
 *    a login.
 *
 * Drivers and datasets advertise feed support via MlsDataset::supportedFeeds().
 * Querying a feed the dataset doesn't support returns an empty result with an
 * error rather than silently downgrading.
 */
enum MlsFeed: string
{
    case IDX = 'idx';
    case VOW = 'vow';
}
