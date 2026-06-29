<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\LoginActivity;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class SecurityController extends Controller
{
    /* ===================== Active devices ===================== */

    public function sessions(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentId = $request->session()->getId();

        $rows = DB::table('sessions')
            ->where('user_id', $user->id)
            ->orderByDesc('last_activity')
            ->get(['id', 'ip_address', 'user_agent', 'last_activity']);

        $list = $rows->map(function ($s) use ($currentId) {
            [$browser, $platform, $device] = $this->parseUserAgent((string) $s->user_agent);
            return [
                'id' => $s->id,
                'ip_address' => $s->ip_address,
                'browser' => $browser,
                'platform' => $platform,
                'device' => $device,
                'last_activity' => $s->last_activity,
                'is_current' => $s->id === $currentId,
            ];
        });

        return response()->json(['sessions' => $list]);
    }

    public function revokeSession(Request $request, string $sessionId): JsonResponse
    {
        $user = $request->user();
        $currentId = $request->session()->getId();

        if ($sessionId === $currentId) {
            return response()->json(['error' => 'Cannot revoke your current session here. Use Log Out instead.'], 422);
        }

        DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', $sessionId)
            ->delete();

        return response()->json(['ok' => true]);
    }

    /* ===================== Access history ===================== */

    public function accessHistory(Request $request): JsonResponse
    {
        $user = $request->user();

        $rows = LoginActivity::query()
            ->where('user_id', $user->id)
            ->orderByDesc('occurred_at')
            ->limit(50)
            ->get(['id', 'event', 'ip_address', 'browser', 'platform', 'device', 'occurred_at']);

        return response()->json(['entries' => $rows]);
    }

    /* ===================== 2FA ===================== */

    public function twoFactorStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'enabled' => $user->hasTwoFactorEnabled(),
            'pending' => ! is_null($user->two_factor_secret) && is_null($user->two_factor_confirmed_at),
        ]);
    }

    /**
     * Generate (or re-generate) a secret + QR. The user must then confirm with
     * a valid code before 2FA is considered enabled.
     */
    public function twoFactorGenerate(Request $request): JsonResponse
    {
        $user = $request->user();
        $google2fa = new Google2FA();

        $secret = $google2fa->generateSecretKey();
        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => null,
        ])->save();

        $issuer = config('app.name', 'BunnyIDX');
        $otpauthUrl = $google2fa->getQRCodeUrl($issuer, $user->email, $secret);

        $renderer = new ImageRenderer(new RendererStyle(192, 1), new SvgImageBackEnd());
        $writer = new Writer($renderer);
        $svg = $writer->writeString($otpauthUrl);

        return response()->json([
            'secret' => $secret,
            'qr_svg' => $svg,
            'otpauth_url' => $otpauthUrl,
        ]);
    }

    /**
     * Confirm 2FA by checking a TOTP code matches the stored secret. On success
     * we set `two_factor_confirmed_at` and return one-time recovery codes.
     */
    public function twoFactorConfirm(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $user = $request->user();
        if (! $user->two_factor_secret) {
            return response()->json(['error' => 'No 2FA setup in progress.'], 422);
        }

        $google2fa = new Google2FA();
        $valid = $google2fa->verifyKey($user->two_factor_secret, $validated['code']);

        if (! $valid) {
            return response()->json(['error' => 'That code is invalid. Try the most recent one shown by your app.'], 422);
        }

        $recovery = collect(range(1, 8))->map(fn () => Str::lower(Str::random(5)) . '-' . Str::lower(Str::random(5)))->all();

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => $recovery,
        ])->save();

        return response()->json([
            'enabled' => true,
            'recovery_codes' => $recovery,
        ]);
    }

    /**
     * Disable 2FA. Re-confirm identity with EITHER the account password OR a
     * current 2FA code (TOTP or recovery code). The 2FA-code path exists so
     * OAuth (e.g. "Sign in with Google") users — who never set a password and
     * only have a random one — aren't permanently locked into 2FA. Possessing
     * either factor proves it's really them.
     */
    public function twoFactorDisable(Request $request): JsonResponse
    {
        $user = $request->user();

        $password = (string) $request->input('password', '');
        $code = preg_replace('/\s+/', '', (string) $request->input('code', ''));

        if ($password !== '') {
            if (! Hash::check($password, (string) $user->password)) {
                return response()->json(['error' => 'That password is incorrect.'], 422);
            }
        } elseif ($code !== '') {
            if (! $this->verifyTwoFactorCode($user, $code)) {
                return response()->json(['error' => 'That code is invalid. Try the most recent one from your app, or a recovery code.'], 422);
            }
        } else {
            return response()->json(['error' => 'Enter your password or a current 2FA code to disable.'], 422);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        return response()->json(['ok' => true]);
    }

    /**
     * Validate a 6-digit TOTP code against the user's secret, or fall back to a
     * one-time recovery code. Used to confirm a 2FA-protected action without a
     * password.
     */
    private function verifyTwoFactorCode(\App\Models\User $user, string $code): bool
    {
        if (! $user->two_factor_secret) {
            return false;
        }

        if (preg_match('/^\d{6}$/', $code)) {
            return (new Google2FA())->verifyKey($user->two_factor_secret, $code);
        }

        // Otherwise treat it as a recovery code.
        return in_array($code, $user->two_factor_recovery_codes ?? [], true);
    }

    public function twoFactorRecoveryCodes(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasTwoFactorEnabled()) {
            return response()->json(['error' => '2FA is not enabled.'], 422);
        }

        return response()->json(['recovery_codes' => $user->two_factor_recovery_codes ?? []]);
    }

    public function twoFactorRegenerateRecoveryCodes(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasTwoFactorEnabled()) {
            return response()->json(['error' => '2FA is not enabled.'], 422);
        }

        $recovery = collect(range(1, 8))->map(fn () => Str::lower(Str::random(5)) . '-' . Str::lower(Str::random(5)))->all();
        $user->forceFill(['two_factor_recovery_codes' => $recovery])->save();

        return response()->json(['recovery_codes' => $recovery]);
    }

    /* ===================== Shared UA parser ===================== */

    /** @return array{0:string,1:string,2:string} */
    private function parseUserAgent(string $ua): array
    {
        $browser = 'Unknown';
        if (str_contains($ua, 'Edg/')) $browser = 'Edge';
        elseif (str_contains($ua, 'OPR/') || str_contains($ua, 'Opera')) $browser = 'Opera';
        elseif (str_contains($ua, 'Chrome/')) $browser = 'Chrome';
        elseif (str_contains($ua, 'Firefox/')) $browser = 'Firefox';
        elseif (str_contains($ua, 'Safari/')) $browser = 'Safari';

        $platform = 'Unknown';
        $device = 'Desktop';
        if (str_contains($ua, 'iPhone')) { $platform = 'iOS'; $device = 'iPhone'; }
        elseif (str_contains($ua, 'iPad')) { $platform = 'iPadOS'; $device = 'iPad'; }
        elseif (str_contains($ua, 'Android')) { $platform = 'Android'; $device = 'Mobile'; }
        elseif (str_contains($ua, 'Mac OS X') || str_contains($ua, 'Macintosh')) { $platform = 'macOS'; }
        elseif (str_contains($ua, 'Windows')) { $platform = 'Windows'; }
        elseif (str_contains($ua, 'Linux')) { $platform = 'Linux'; }

        return [$browser, $platform, $device];
    }
}
