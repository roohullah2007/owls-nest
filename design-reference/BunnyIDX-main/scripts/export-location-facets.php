<?php

/**
 * One-off scan: distinct location facets (CountyOrParish, City, PostalCode,
 * SubdivisionName) with active-listing counts for every connected MLS feed.
 * Source data for the per-dataset getCounties()/getCities()/getSubdivisions()/
 * getZipCodes() lists and for auditing them against what the feed actually
 * stores (exact spelling matters — filters match byte-for-byte).
 *
 * Run: php artisan tinker --execute="require 'scripts/export-location-facets.php';"
 * Output: storage/app/exports/{slug}-location-facets.json
 * Progress: storage/app/exports/location-facets.progress.log
 */

use App\Models\IdxConnection;
use App\Services\Idx\RealtynaCredentials;
use App\Services\Idx\RealtynaTokenManager;
use Illuminate\Support\Facades\Http;

$dir = storage_path('app/exports');
if (! is_dir($dir)) {
    mkdir($dir, 0775, true);
}
$progressPath = $dir.'/location-facets.progress.log';
$progress = function (string $msg) use ($progressPath) {
    file_put_contents($progressPath, '['.date('H:i:s').'] '.$msg.PHP_EOL, FILE_APPEND);
};

$facetFields = ['CountyOrParish', 'City', 'PostalCode', 'SubdivisionName'];

$tally = function (array $rows, array &$facets) use ($facetFields): int {
    $n = 0;
    foreach ($rows as $row) {
        $n++;
        foreach ($facetFields as $f) {
            $v = trim((string) ($row[$f] ?? ''));
            if ($v === '') {
                $v = '(empty)';
            }
            $facets[$f][$v] = ($facets[$f][$v] ?? 0) + 1;
        }
    }

    return $n;
};

$save = function (string $slug, array $facets, int $total) use ($dir) {
    foreach ($facets as &$counts) {
        arsort($counts);
    }
    unset($counts);
    file_put_contents(
        $dir."/{$slug}-location-facets.json",
        json_encode(['total' => $total, 'facets' => $facets], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    );
};

// ── Miami (Bridge) — keyset paging on ListingKey (Bridge omits
//    @odata.nextLink at $top=200 and caps $skip at 10000; `$orderby=ListingKey`
//    + `ListingKey gt 'last'` walks the full set — verified live) ───────────
if (is_file($dir.'/miamire-location-facets.json')) {
    $progress('miamire: output exists, skipping');
} else {
    $progress('miamire: start');
    $facets = [];
    $total = 0;
    $url = rtrim((string) config('idx.bridge.odata_url'), '/').'/miamire/Property';
    $perPage = 200;
    $lastKey = '';

    for ($page = 0; $page < 1500; $page++) {
        $filter = "StandardStatus eq 'Active'";
        if ($lastKey !== '') {
            $filter .= " and ListingKey gt '{$lastKey}'";
        }

        $attempt = 0;
        bridge_retry:
        $r = Http::timeout(30)->get($url, [
            'access_token' => config('idx.bridge.server_token'),
            '$top' => $perPage,
            '$orderby' => 'ListingKey',
            '$select' => 'ListingKey,'.implode(',', $facetFields),
            '$filter' => $filter,
        ]);

        if (in_array($r->status(), [429, 500, 502, 503], true) && $attempt < 6) {
            $attempt++;
            $progress("miamire page {$page}: HTTP {$r->status()} — retry {$attempt}");
            sleep(2 * $attempt);
            goto bridge_retry;
        }
        if (! $r->successful()) {
            $progress("miamire STOP page {$page}: HTTP {$r->status()} ".substr($r->body(), 0, 200));
            break;
        }

        $value = $r->json('value');
        if (! is_array($value) || count($value) === 0) {
            break;
        }
        $total += $tally($value, $facets);
        $lastKey = (string) (end($value)['ListingKey'] ?? '');

        if ($page % 20 === 0) {
            $progress("miamire page {$page}: {$total} listings");
        }

        if (count($value) < $perPage || $lastKey === '') {
            break;
        }
        usleep(250_000);
    }
    $save('miamire', $facets, $total);
    $progress("miamire DONE: {$total} listings");
}

// ── Beaches (Realtyna) — $skip paging ────────────────────────────────────
if (is_file($dir.'/beachesmls-location-facets.json')) {
    $progress('beachesmls: output exists, skipping');

    echo 'DONE (beaches skipped)'.PHP_EOL;

    return;
}
$progress('beachesmls: start');
$facets = [];
$total = 0;

$conn = IdxConnection::where('mls_slug', 'beachesmls')->where('is_active', true)->firstOrFail();
$creds = RealtynaCredentials::fromConnection($conn);
$tokenManager = app(RealtynaTokenManager::class);
$token = $tokenManager->getToken($creds);
$base = rtrim((string) config('idx.realtyna.base_url'), '/');
$apiKey = $creds->apiKey ?: config('idx.realtyna.api_key');

$perPage = 200;
$skip = 0;

for ($page = 0; $page < 1500; $page++) {
    $attempt = 0;
    realtyna_retry:
    $r = Http::withToken($token ?? '')
        ->withHeaders(['x-api-key' => (string) $apiKey])
        ->timeout(30)
        ->get($base.'/realtyfeed/odata/Property', [
            '$top' => $perPage,
            '$skip' => $skip,
            '$select' => implode(',', $facetFields),
            '$filter' => "OriginatingSystemName eq 'Beaches' and StandardStatus eq 'Active'",
        ]);

    if (in_array($r->status(), [429, 401, 500, 502, 503], true) && $attempt < 6) {
        $attempt++;
        if ($r->status() === 401) {
            $token = $tokenManager->getToken($creds);
        }
        $progress("beachesmls page {$page}: HTTP {$r->status()} — retry {$attempt}");
        sleep(2 * $attempt);
        goto realtyna_retry;
    }
    if (! $r->successful()) {
        $progress("beachesmls STOP page {$page}: HTTP {$r->status()} ".substr($r->body(), 0, 200));
        break;
    }

    $value = $r->json('value');
    if (! is_array($value) || count($value) === 0) {
        break;
    }
    $total += $tally($value, $facets);

    if ($page % 20 === 0) {
        $progress("beachesmls page {$page} (skip {$skip}): {$total} listings");
    }

    if (count($value) < $perPage) {
        break;
    }
    $skip += $perPage;
    usleep(400_000);
}
$save('beachesmls', $facets, $total);
$progress("beachesmls DONE: {$total} listings");

echo 'DONE'.PHP_EOL;
