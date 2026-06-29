<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\LeadImport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class LeadImportController extends Controller
{
    /**
     * Fields the user can map a CSV column to.
     */
    private const TARGET_FIELDS = [
        'first_name' => 'First Name',
        'last_name' => 'Last Name',
        'email' => 'Email',
        'phone' => 'Phone',
        'mobile' => 'Mobile',
        'address' => 'Address',
        'city' => 'City',
        'state_province' => 'State / Province',
        'postal_code' => 'Postal Code',
        'country' => 'Country',
        'description' => 'Notes',
        'type' => 'Lead Type',
        'status' => 'Status',
        'source' => 'Source',
    ];

    public function upload(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $user = $request->user();
        $file = $request->file('file');
        $path = $file->store('lead-imports/'.$user->id, 'local');

        [$headers, $rowCount] = $this->scanCsv(Storage::disk('local')->path($path));

        $import = LeadImport::create([
            'user_id' => $user->id,
            'team_id' => $user->isInTeamContext() ? $user->team_id : null,
            'original_filename' => $file->getClientOriginalName(),
            'stored_path' => $path,
            'headers' => $headers,
            'row_count' => $rowCount,
            'mapping' => $this->guessMapping($headers),
            'status' => 'pending',
        ]);

        return redirect()->route('crm.lead-imports.show', $import);
    }

    public function show(Request $request, LeadImport $leadImport): Response
    {
        $this->authorize($request, $leadImport);

        $preview = $this->loadPreview($this->resolveStoredPath($leadImport), 10);
        $user = $request->user();

        return Inertia::render('Crm/Settings/LeadImportShow', [
            'import' => $leadImport->only([
                'id', 'original_filename', 'headers', 'mapping', 'row_count',
                'status', 'imported_count', 'skipped_count', 'default_type',
                'default_source', 'error', 'created_at', 'completed_at',
            ]),
            'preview' => $preview,
            'targetFields' => self::TARGET_FIELDS,
            'leadTypes' => $user->getLeadTypes(),
        ]);
    }

    public function process(Request $request, LeadImport $leadImport): RedirectResponse
    {
        $this->authorize($request, $leadImport);

        $data = $request->validate([
            'mapping' => 'required|array',
            'mapping.*' => 'nullable|string',
            'default_type' => 'nullable|string|max:50',
            'default_source' => 'nullable|string|max:50',
        ]);

        $mapping = array_filter($data['mapping'], fn ($v) => filled($v));

        if (! in_array('email', $mapping, true) && ! in_array('first_name', $mapping, true) && ! in_array('last_name', $mapping, true)) {
            return back()->withErrors(['mapping' => 'Map at least one of: Email, First Name, or Last Name.']);
        }

        $leadImport->update([
            'mapping' => $mapping,
            'default_type' => $data['default_type'] ?? null,
            'default_source' => $data['default_source'] ?? 'Import',
            'status' => 'processing',
        ]);

        try {
            [$imported, $skipped, $reasons] = $this->import($leadImport);

            $leadImport->update([
                'status' => 'completed',
                'imported_count' => $imported,
                'skipped_count' => $skipped,
                'completed_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $leadImport->update([
                'status' => 'failed',
                'error' => Str::limit($e->getMessage(), 1000),
            ]);

            return redirect()->route('crm.settings', ['tab' => 'lead-imports'])
                ->with('error', 'Import failed: '.$e->getMessage());
        }

        return redirect()->route('crm.settings', ['tab' => 'lead-imports'])
            ->with('success', $this->resultMessage($imported, $skipped, $reasons));
    }

    /**
     * Download the example CSV so users can match the expected column layout.
     */
    public function sample(): BinaryFileResponse
    {
        $path = public_path('samples/lead-import-sample.csv');
        abort_unless(is_file($path), 404);

        return response()->download($path, 'lead-import-sample.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * Build a human-readable summary of an import run with a skip breakdown.
     */
    private function resultMessage(int $imported, int $skipped, array $reasons): string
    {
        $message = "Imported {$imported} contact".($imported === 1 ? '' : 's').'.';

        if ($skipped > 0) {
            $parts = [];
            if ($reasons['duplicates']) {
                $parts[] = "{$reasons['duplicates']} duplicate".($reasons['duplicates'] === 1 ? '' : 's');
            }
            if ($reasons['invalid']) {
                $parts[] = "{$reasons['invalid']} invalid email".($reasons['invalid'] === 1 ? '' : 's');
            }
            if ($reasons['empty']) {
                $parts[] = "{$reasons['empty']} empty";
            }
            if ($reasons['failed']) {
                $parts[] = "{$reasons['failed']} failed";
            }
            $message .= " Skipped {$skipped}".($parts ? ' ('.implode(', ', $parts).')' : '').'.';
        }

        return $message;
    }

    public function destroy(Request $request, LeadImport $leadImport): RedirectResponse
    {
        $this->authorize($request, $leadImport);

        // Only delete the file if it lives inside the expected directory for this import's owner.
        $expectedPrefix = 'lead-imports/'.$leadImport->user_id.'/';
        if (
            $leadImport->stored_path
            && str_starts_with($leadImport->stored_path, $expectedPrefix)
            && Storage::disk('local')->exists($leadImport->stored_path)
        ) {
            Storage::disk('local')->delete($leadImport->stored_path);
        }

        $leadImport->delete();

        return redirect()->route('crm.settings', ['tab' => 'lead-imports']);
    }

    private function scanCsv(string $absolutePath): array
    {
        $handle = fopen($absolutePath, 'r');
        if (! $handle) {
            return [[], 0];
        }

        $headers = fgetcsv($handle) ?: [];
        $headers = array_map(fn ($h) => trim((string) $h), $headers);
        $count = 0;
        while (fgetcsv($handle) !== false) {
            $count++;
        }
        fclose($handle);

        return [$headers, $count];
    }

    private function loadPreview(string $absolutePath, int $limit): array
    {
        $handle = fopen($absolutePath, 'r');
        if (! $handle) {
            return [];
        }

        fgetcsv($handle); // skip headers
        $rows = [];
        for ($i = 0; $i < $limit; $i++) {
            $row = fgetcsv($handle);
            if ($row === false) {
                break;
            }
            $rows[] = $row;
        }
        fclose($handle);

        return $rows;
    }

    private function guessMapping(array $headers): array
    {
        $mapping = [];
        foreach ($headers as $i => $header) {
            $norm = strtolower(preg_replace('/[^a-z0-9]+/i', '_', (string) $header));
            $match = match (true) {
                in_array($norm, ['first_name', 'first', 'firstname', 'given_name'], true) => 'first_name',
                in_array($norm, ['last_name', 'last', 'lastname', 'surname', 'family_name'], true) => 'last_name',
                in_array($norm, ['email', 'email_address', 'e_mail'], true) => 'email',
                in_array($norm, ['phone', 'phone_number', 'telephone', 'home_phone'], true) => 'phone',
                in_array($norm, ['mobile', 'cell', 'cell_phone', 'mobile_phone'], true) => 'mobile',
                in_array($norm, ['address', 'street', 'street_address'], true) => 'address',
                $norm === 'city' => 'city',
                in_array($norm, ['state', 'state_province', 'province', 'region'], true) => 'state_province',
                in_array($norm, ['zip', 'zip_code', 'postal_code', 'postcode'], true) => 'postal_code',
                $norm === 'country' => 'country',
                in_array($norm, ['notes', 'note', 'description', 'comments'], true) => 'description',
                in_array($norm, ['type', 'lead_type'], true) => 'type',
                $norm === 'status' => 'status',
                $norm === 'source' => 'source',
                default => null,
            };
            if ($match) {
                $mapping[(string) $i] = $match;
            }
        }

        return $mapping;
    }

    /**
     * Stream the CSV and create one Contact per usable row. Rows are processed
     * independently (no all-or-nothing transaction) so a single bad row can't
     * abort the whole import. Returns [imported, skipped, reasons].
     */
    private function import(LeadImport $leadImport): array
    {
        $absolutePath = $this->resolveStoredPath($leadImport);
        $handle = fopen($absolutePath, 'r');
        if (! $handle) {
            throw new \RuntimeException('Could not open uploaded file.');
        }

        fgetcsv($handle); // skip headers

        $mapping = $leadImport->mapping ?? [];
        $imported = 0;
        $duplicates = 0;
        $invalid = 0;
        $empty = 0;
        $failed = 0;
        $firstError = null;

        while (($row = fgetcsv($handle)) !== false) {
            $attrs = [
                'user_id' => $leadImport->user_id,
                'team_id' => $leadImport->team_id,
                'source' => $leadImport->default_source ?: 'Import',
            ];
            if ($leadImport->default_type) {
                $attrs['type'] = $leadImport->default_type;
            }

            foreach ($mapping as $colIndex => $field) {
                $value = $row[(int) $colIndex] ?? null;
                if ($value === null) {
                    continue;
                }
                $value = trim((string) $value);
                if ($value === '') {
                    continue;
                }
                $attrs[$field] = $value;
            }

            // Skip rows with no usable identity (also covers blank lines).
            if (empty($attrs['email']) && empty($attrs['phone']) && empty($attrs['first_name']) && empty($attrs['last_name'])) {
                $empty++;

                continue;
            }

            // Reject malformed emails rather than importing bad data silently.
            if (! empty($attrs['email']) && ! filter_var($attrs['email'], FILTER_VALIDATE_EMAIL)) {
                $invalid++;

                continue;
            }

            // Duplicate guard: email first, then phone when email is absent.
            if ($this->isDuplicate($leadImport, $attrs)) {
                $duplicates++;

                continue;
            }

            // contacts.source is a strict enum — coerce free-text to an allowed member.
            $attrs['source'] = $this->normalizeSource($attrs['source'] ?? '');

            // contacts.first_name / last_name are NOT NULL — always provide a value.
            if (empty($attrs['first_name'])) {
                $attrs['first_name'] = ! empty($attrs['email']) ? Str::before($attrs['email'], '@') : 'Lead';
            }
            $attrs['last_name'] ??= '';

            try {
                Contact::create($attrs);
                $imported++;
            } catch (\Throwable $e) {
                $failed++;
                $firstError ??= $e->getMessage();
            }
        }

        fclose($handle);

        $skipped = $duplicates + $invalid + $empty + $failed;

        return [$imported, $skipped, compact('duplicates', 'invalid', 'empty', 'failed', 'firstError')];
    }

    /**
     * Is this row already a contact? Matches on email first, then phone
     * (raw + digits-normalized) when no email is present — within the import's
     * user/team scope.
     */
    private function isDuplicate(LeadImport $leadImport, array $attrs): bool
    {
        $scope = function ($q) use ($leadImport) {
            $leadImport->team_id
                ? $q->where('team_id', $leadImport->team_id)
                : $q->where('user_id', $leadImport->user_id)->whereNull('team_id');
        };

        if (! empty($attrs['email'])) {
            return Contact::where($scope)->where('email', $attrs['email'])->exists();
        }

        if (! empty($attrs['phone'])) {
            $normalized = $this->normalizePhone($attrs['phone']);

            return Contact::where($scope)
                ->where(function ($q) use ($attrs, $normalized) {
                    $q->where('phone', $attrs['phone'])->orWhere('mobile', $attrs['phone']);
                    if ($normalized !== '' && $normalized !== $attrs['phone']) {
                        $q->orWhere('phone', $normalized)->orWhere('mobile', $normalized);
                    }
                })
                ->exists();
        }

        return false;
    }

    private function normalizePhone(string $value): string
    {
        return preg_replace('/[^0-9+]/', '', $value) ?? '';
    }

    /**
     * Map a free-text source to one of the contacts.source enum members,
     * falling back to "other" for anything unrecognised.
     */
    private function normalizeSource(string $value): string
    {
        $allowed = ['website', 'referral', 'open_house', 'social_media', 'cold_call', 'idx', 'manual', 'other'];
        $key = strtolower((string) preg_replace('/[^a-z0-9]+/i', '_', trim($value)));

        return in_array($key, $allowed, true) ? $key : 'other';
    }

    /**
     * Resolve the import's stored CSV to an absolute path on disk, guarding against
     * any path-traversal attempt (the column is set by upload(), but treat it as
     * tainted in case a record is ever created another way).
     */
    private function resolveStoredPath(LeadImport $leadImport): string
    {
        $stored = (string) $leadImport->stored_path;
        $expectedPrefix = 'lead-imports/'.$leadImport->user_id.'/';
        if ($stored === '' || ! str_starts_with($stored, $expectedPrefix) || str_contains($stored, '..')) {
            abort(404);
        }
        $abs = Storage::disk('local')->path($stored);
        // Resolve symlinks/relative segments and confirm the result still lives
        // under the local disk's root and inside the user's expected directory.
        $resolved = realpath($abs);
        $rootResolved = realpath(Storage::disk('local')->path(''));
        if (! $resolved || ! $rootResolved || ! str_starts_with($resolved, rtrim($rootResolved, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR)) {
            abort(404);
        }

        return $resolved;
    }

    private function authorize(Request $request, LeadImport $leadImport): void
    {
        $user = $request->user();
        $ownsImport = $leadImport->user_id === $user->id
            || ($user->isInTeamContext() && $user->team_id && $leadImport->team_id === $user->team_id);
        abort_unless($ownsImport, 403);
    }
}
