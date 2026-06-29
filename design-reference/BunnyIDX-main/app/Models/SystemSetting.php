<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * Simple key/value store for app-level settings (OAuth credentials, feature
 * flags, etc.). Values flagged encrypted are run through Crypt so secrets
 * never sit on disk in plaintext.
 *
 * Prefer SystemSetting::get('foo') / set('foo', $value) over direct queries
 * so callers don't have to think about the encryption flag.
 */
#[Fillable(['key', 'value', 'is_encrypted'])]
class SystemSetting extends Model
{
    protected function casts(): array
    {
        return ['is_encrypted' => 'boolean'];
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $row = static::query()->where('key', $key)->first();
        if (! $row) return $default;
        if ($row->value === null) return $default;
        if ($row->is_encrypted) {
            try {
                return Crypt::decryptString($row->value);
            } catch (\Throwable) {
                return $default;
            }
        }
        return $row->value;
    }

    public static function set(string $key, ?string $value, bool $encrypt = false): void
    {
        static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value === null ? null : ($encrypt ? Crypt::encryptString($value) : $value),
                'is_encrypted' => $encrypt,
            ],
        );
    }
}
