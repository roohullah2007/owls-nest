<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\CalendarAccount;
use App\Models\CalendarFeed;
use Carbon\Carbon;
use Google\Client as GoogleClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class CalendarFeedController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $feeds = $user->calendarFeeds()
            ->orderBy('name')
            ->get(['id', 'name', 'url', 'color', 'last_synced_at', 'is_active'])
            ->map(fn ($f) => [
                'id' => $f->id,
                'kind' => 'ical',
                'name' => $f->name,
                'subtitle' => $f->url,
                'color' => $f->color,
                'last_synced_at' => $f->last_synced_at,
                'is_active' => $f->is_active,
                'provider' => 'ical',
            ])
            ->all();

        $accounts = CalendarAccount::where('user_id', $user->id)
            ->orderBy('email_address')
            ->get(['id', 'provider', 'email_address', 'color', 'last_synced_at', 'is_active'])
            ->map(fn ($a) => [
                'id' => $a->id,
                'kind' => 'oauth',
                'name' => ucfirst($a->provider) . ' Calendar',
                'subtitle' => $a->email_address,
                'color' => $a->color,
                'last_synced_at' => $a->last_synced_at,
                'is_active' => $a->is_active,
                'provider' => $a->provider,
            ])
            ->all();

        return response()->json([
            'feeds' => array_merge($accounts, $feeds),
            'providers' => [
                'google' => ! empty(config('google.client_id') ?: config('services.google.client_id')),
                'microsoft' => ! empty(config('services.microsoft.client_id')),
            ],
        ]);
    }

    /* ===================== Google Calendar OAuth ===================== */

    public function redirectToGoogle(Request $request): RedirectResponse
    {
        $clientId = config('google.client_id') ?: config('services.google.client_id');
        $clientSecret = config('google.client_secret') ?: config('services.google.client_secret');

        if (! $clientId || ! $clientSecret) {
            return redirect()->route('crm.settings.tab', 'profile')
                ->with('error', 'Google OAuth is not configured.');
        }

        $client = new GoogleClient();
        $client->setClientId($clientId);
        $client->setClientSecret($clientSecret);
        $client->setRedirectUri(url(config('google.calendar_redirect')));
        $client->setScopes(config('google.calendar_scopes'));
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        $client->setState(csrf_token());

        return redirect()->away($client->createAuthUrl());
    }

    public function handleGoogleCallback(Request $request): RedirectResponse
    {
        $user = $request->user();
        $back = redirect()->route('crm.settings.tab', 'profile');

        if ($request->has('error')) {
            return $back->with('error', 'Google Calendar authorization was cancelled.');
        }

        $code = $request->get('code');
        if (! $code) return $back->with('error', 'Invalid authorization response.');

        try {
            $clientId = config('google.client_id') ?: config('services.google.client_id');
            $clientSecret = config('google.client_secret') ?: config('services.google.client_secret');

            $client = new GoogleClient();
            $client->setClientId($clientId);
            $client->setClientSecret($clientSecret);
            $client->setRedirectUri(url(config('google.calendar_redirect')));

            $token = $client->fetchAccessTokenWithAuthCode($code);

            if (isset($token['error'])) {
                return $back->with('error', 'Failed to authenticate with Google: ' . ($token['error_description'] ?? $token['error']));
            }

            $client->setAccessToken($token);

            $calendarSvc = new \Google\Service\Calendar($client);
            $primary = $calendarSvc->calendars->get('primary');
            $emailAddress = $primary->getId(); // primary calendar ID == email

            CalendarAccount::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'provider' => 'google',
                    'email_address' => $emailAddress,
                ],
                [
                    'calendar_id' => 'primary',
                    'access_token' => $token['access_token'],
                    'refresh_token' => $token['refresh_token'] ?? null,
                    'token_expires_at' => now()->addSeconds($token['expires_in'] ?? 3600),
                    'is_active' => true,
                ],
            );

            return $back->with('success', "Google Calendar ({$emailAddress}) connected.");
        } catch (\Throwable $e) {
            return $back->with('error', 'Failed to connect Google Calendar: ' . $e->getMessage());
        }
    }

    public function disconnectAccount(Request $request, CalendarAccount $account): JsonResponse
    {
        abort_unless($account->user_id === $request->user()->id, 403);
        $account->delete();
        return response()->json(['ok' => true]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'url' => 'required|url|max:2048',
            'color' => 'nullable|string|max:7',
        ]);

        $feed = $request->user()->calendarFeeds()->create($validated);

        // Immediately sync the feed
        $this->syncFeed($feed);

        return back()->with('success', 'Calendar feed added.');
    }

    public function destroy(Request $request, CalendarFeed $calendarFeed): RedirectResponse
    {
        abort_unless($calendarFeed->user_id === $request->user()->id, 403);

        $calendarFeed->delete();

        return back()->with('success', 'Calendar feed removed.');
    }

    public function sync(Request $request, CalendarFeed $calendarFeed): JsonResponse
    {
        abort_unless($calendarFeed->user_id === $request->user()->id, 403);

        $this->syncFeed($calendarFeed);

        return response()->json(['success' => true, 'events' => $calendarFeed->fresh()->cached_events]);
    }

    /**
     * Fetch and parse an iCal feed, caching the parsed events.
     */
    private function syncFeed(CalendarFeed $feed): void
    {
        try {
            $response = Http::timeout(15)
                ->withHeaders(['Accept' => 'text/calendar'])
                ->get($feed->url);

            if (! $response->successful()) {
                return;
            }

            $events = $this->parseIcal($response->body());

            $feed->update([
                'cached_events' => $events,
                'last_synced_at' => now(),
            ]);
        } catch (\Throwable) {
            // Silently fail — feed might be temporarily unavailable
        }
    }

    /**
     * Parse iCal text into an array of event objects.
     */
    private function parseIcal(string $ical): array
    {
        $events = [];
        $lines = preg_split('/\r?\n/', $ical);
        $inEvent = false;
        $event = [];

        // Unfold lines (iCal continuation lines start with space/tab)
        $unfolded = [];
        foreach ($lines as $line) {
            if (preg_match('/^[ \t]/', $line) && count($unfolded) > 0) {
                $unfolded[count($unfolded) - 1] .= ltrim($line, " \t");
            } else {
                $unfolded[] = $line;
            }
        }

        foreach ($unfolded as $line) {
            $line = trim($line);

            if ($line === 'BEGIN:VEVENT') {
                $inEvent = true;
                $event = [];
                continue;
            }

            if ($line === 'END:VEVENT') {
                $inEvent = false;
                if (! empty($event['summary']) && ! empty($event['dtstart'])) {
                    $events[] = [
                        'title' => $this->unescapeIcal($event['summary']),
                        'starts_at' => $this->parseIcalDate($event['dtstart']),
                        'ends_at' => isset($event['dtend']) ? $this->parseIcalDate($event['dtend']) : null,
                        'location' => isset($event['location']) ? $this->unescapeIcal($event['location']) : null,
                        'description' => isset($event['description']) ? $this->unescapeIcal($event['description']) : null,
                    ];
                }
                continue;
            }

            if ($inEvent && str_contains($line, ':')) {
                // Handle properties with parameters like DTSTART;TZID=...
                $colonPos = strpos($line, ':');
                $key = strtolower(explode(';', substr($line, 0, $colonPos))[0]);
                $value = substr($line, $colonPos + 1);
                $event[$key] = $value;
            }
        }

        // Only keep events within reasonable range (past 3 months to future 12 months)
        $rangeStart = now()->subMonths(3)->startOfDay()->toISOString();
        $rangeEnd = now()->addMonths(12)->endOfDay()->toISOString();

        return array_values(array_filter($events, function ($e) use ($rangeStart, $rangeEnd) {
            return $e['starts_at'] && $e['starts_at'] >= $rangeStart && $e['starts_at'] <= $rangeEnd;
        }));
    }

    private function parseIcalDate(string $value): ?string
    {
        try {
            // Format: 20240101T120000Z or 20240101T120000 or 20240101
            $value = trim($value);
            if (strlen($value) === 8) {
                return Carbon::createFromFormat('Ymd', $value)->startOfDay()->toISOString();
            }
            $value = str_replace('Z', '', $value);
            return Carbon::createFromFormat('Ymd\THis', $value)->toISOString();
        } catch (\Throwable) {
            return null;
        }
    }

    private function unescapeIcal(string $text): string
    {
        return str_replace(['\\n', '\\,', '\\;', '\\\\'], ["\n", ',', ';', '\\'], $text);
    }
}
