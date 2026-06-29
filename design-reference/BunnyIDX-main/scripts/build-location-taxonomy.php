<?php

/**
 * Build per-dataset location data files (subdivisions + ZIP codes) from the
 * facet scans produced by scripts/export-location-facets.php, and audit the
 * dataset classes' curated getCounties()/getCities() lists against the live
 * feed's exact stored values (filters match byte-for-byte — any spelling
 * drift = silent 0-result filter).
 *
 * Run: php artisan tinker --execute="require 'scripts/build-location-taxonomy.php';"
 */

$targets = [
    [
        'slug' => 'miamire',
        'class' => App\Services\Mls\Datasets\Bridge\MiamiReMls::class,
        'dataDir' => app_path('Services/Mls/Datasets/Bridge/data'),
    ],
    [
        'slug' => 'beachesmls',
        'class' => App\Services\Mls\Datasets\Realtyna\BeachesMls::class,
        'dataDir' => app_path('Services/Mls/Datasets/Realtyna/data'),
    ],
];

/** Placeholder junk that pollutes SubdivisionName facets — not real subdivisions. */
$isJunkSubdivision = function (string $v): bool {
    $t = trim($v);
    if (mb_strlen($t) < 3) {
        return true;
    }
    if (preg_match('/^[\d\s\.\-]+$/', $t)) {            // numeric-only codes
        return true;
    }

    return (bool) preg_match(
        '/^(\(empty\)|n\/?a|none|no subdivision.*|not? applicable|unknown|unplatted|metes (and|&) bounds|other|tbd|various|see remarks|0+)$/i',
        $t,
    );
};

foreach ($targets as $t) {
    $slug = $t['slug'];
    $path = storage_path("app/exports/{$slug}-location-facets.json");
    if (! is_file($path)) {
        echo "== {$slug}: facet scan missing, skipping ==\n";

        continue;
    }
    $scan = json_decode((string) file_get_contents($path), true);
    $facets = $scan['facets'];
    $total = (int) $scan['total'];
    echo "== {$slug} ({$total} active listings scanned) ==\n";

    if (! is_dir($t['dataDir'])) {
        mkdir($t['dataDir'], 0775, true);
    }

    // ── Subdivisions: junk-filtered, seen on ≥2 active listings ───────────
    $subs = [];
    foreach ($facets['SubdivisionName'] as $name => $count) {
        if ($count >= 2 && ! $isJunkSubdivision((string) $name)) {
            $subs[] = (string) $name;
        }
    }
    sort($subs, SORT_NATURAL | SORT_FLAG_CASE);
    file_put_contents(
        $t['dataDir']."/{$slug}-subdivisions.json",
        json_encode($subs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    );
    echo 'subdivisions: '.count($subs).' kept (of '.count($facets['SubdivisionName'])." raw)\n";

    // ── ZIP codes: well-formed, seen on ≥2 active listings ────────────────
    $zips = [];
    foreach ($facets['PostalCode'] as $zip => $count) {
        if ($count >= 2 && preg_match('/^\d{5}$/', (string) $zip)) {
            $zips[] = (string) $zip;
        }
    }
    sort($zips);
    file_put_contents(
        $t['dataDir']."/{$slug}-zips.json",
        json_encode($zips, JSON_PRETTY_PRINT),
    );
    echo 'zips: '.count($zips).' kept (of '.count($facets['PostalCode'])." raw)\n";

    // ── County audit ───────────────────────────────────────────────────────
    $dataset = new $t['class'];
    $feedCounties = $facets['CountyOrParish'];
    echo "\ncounties in class:\n";
    foreach ($dataset->getCounties() as $county) {
        $n = $feedCounties[$county] ?? 0;
        echo sprintf("  %-28s %s\n", $county, $n > 0 ? "{$n} active" : '** 0 — NOT a stored feed value **');
    }
    echo "feed counties NOT in class (≥40 active):\n";
    $classCounties = $dataset->getCounties();
    foreach ($feedCounties as $county => $n) {
        if ($n >= 40 && ! in_array($county, $classCounties, true) && $county !== '(empty)' && strtolower((string) $county) !== 'other') {
            echo sprintf("  %-28s %d active\n", $county, $n);
        }
    }

    // ── City audit ─────────────────────────────────────────────────────────
    $feedCities = $facets['City'];
    $classCities = array_map(
        static fn (string $c) => preg_replace('/,\s*[A-Z]{2}$/', '', $c),
        $dataset->getCities(),
    );
    echo "\nclass cities with ZERO active feed matches:\n";
    foreach ($classCities as $city) {
        if (! isset($feedCities[$city])) {
            echo "  {$city}\n";
        }
    }
    echo "feed cities NOT in class (≥20 active):\n";
    foreach ($feedCities as $city => $n) {
        if ($n >= 20 && ! in_array($city, $classCities, true) && $city !== '(empty)' && strtolower((string) $city) !== 'other') {
            echo sprintf("  %-28s %d active\n", $city, $n);
        }
    }
    echo "\n";
}

echo "DONE\n";
