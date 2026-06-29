<?php

/**
 * One-off export: every BeachesMLS agent (RESO Member resource via Realtyna)
 * with all fields the feed exposes, STREAMED to a CSV page-by-page so progress
 * is visible and a crash doesn't lose collected rows.
 *
 * Run: php artisan tinker --execute="require 'scripts/export-beaches-agents.php';"
 * Pagination: $top=200 (server cap) + $skip; no @odata.count / nextLink, so we
 * page until a short page. Dedupes on MemberKey. Handles 429s and re-fetches
 * the OAuth token on 401. Unknown fields land JSON-packed in the last column.
 */

use App\Models\IdxConnection;
use App\Services\Idx\RealtynaCredentials;
use App\Services\Idx\RealtynaTokenManager;
use Illuminate\Support\Facades\Http;

$conn = IdxConnection::where('mls_slug', 'beachesmls')->where('is_active', true)->firstOrFail();
$creds = RealtynaCredentials::fromConnection($conn);
$tokenManager = app(RealtynaTokenManager::class);
$token = $tokenManager->getToken($creds);
$base = rtrim((string) config('idx.realtyna.base_url'), '/');
$apiKey = $creds->apiKey ?: config('idx.realtyna.api_key');

$columns = [
    'MemberKey', 'MemberMlsId', 'MemberFullName', 'MemberFirstName', 'MemberLastName',
    'MemberEmail', 'MemberDirectPhone', 'MemberPreferredPhoneExt', 'MemberStatus',
    'OfficeMlsId', 'OfficeName', 'OriginatingSystemName', 'ModificationTimestamp',
];

$dir = storage_path('app/exports');
if (! is_dir($dir)) {
    mkdir($dir, 0775, true);
}
$path = $dir.'/beachesmls-agents.csv';
$progressPath = $dir.'/beachesmls-agents.progress.log';
$fh = fopen($path, 'w');
fputcsv($fh, array_merge($columns, ['ExtraFields']));
fflush($fh);

$progress = function (string $msg) use ($progressPath) {
    file_put_contents($progressPath, '['.date('H:i:s').'] '.$msg.PHP_EOL, FILE_APPEND);
};

$perPage = 200;
$skip = 0;
$written = 0;
$withEmail = 0;
$withPhone = 0;
$active = 0;
$seen = [];

$progress('start');

for ($page = 0; $page < 1500; $page++) {
    $attempt = 0;
    retry:
    $r = Http::withToken($token ?? '')
        ->withHeaders(['x-api-key' => (string) $apiKey])
        ->timeout(30)
        ->get($base.'/realtyfeed/odata/Member', [
            '$top' => $perPage,
            '$skip' => $skip,
            '$filter' => "OriginatingSystemName eq 'BeachesMLS'",
        ]);

    if (in_array($r->status(), [429, 401, 500, 502, 503], true) && $attempt < 6) {
        $attempt++;
        if ($r->status() === 401) {
            $token = $tokenManager->getToken($creds);
        }
        $progress("page {$page}: HTTP {$r->status()} — retry {$attempt}");
        sleep(2 * $attempt);
        goto retry;
    }
    if (! $r->successful()) {
        $progress("STOP page {$page}: HTTP {$r->status()} ".substr($r->body(), 0, 200));
        break;
    }

    $value = $r->json('value');
    if (! is_array($value) || count($value) === 0) {
        break;
    }

    foreach ($value as $m) {
        $key = (string) ($m['MemberKey'] ?? json_encode($m));
        if (isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;
        unset($m['@odata.id']);

        $extra = array_diff_key($m, array_flip($columns));
        $row = array_map(
            fn ($c) => is_scalar($m[$c] ?? null) ? (string) $m[$c] : (isset($m[$c]) ? json_encode($m[$c]) : ''),
            $columns,
        );
        $row[] = $extra ? json_encode($extra) : '';
        fputcsv($fh, $row);

        $written++;
        if (! empty($m['MemberEmail'])) {
            $withEmail++;
        }
        if (! empty($m['MemberDirectPhone'])) {
            $withPhone++;
        }
        if (($m['MemberStatus'] ?? '') === 'Active') {
            $active++;
        }
    }
    fflush($fh);

    if ($page % 10 === 0) {
        $progress("page {$page} (skip {$skip}): {$written} agents");
    }

    if (count($value) < $perPage) {
        break;
    }
    $skip += $perPage;
    usleep(400_000);
}

fclose($fh);
$progress("DONE: {$written} agents → {$path} | with email: {$withEmail} | with phone: {$withPhone} | active: {$active}");
echo "DONE: {$written} agents → {$path}".PHP_EOL;
echo "with email: {$withEmail} | with phone: {$withPhone} | active: {$active}".PHP_EOL;
