<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\CallRecord;
use App\Models\Contact;
use App\Models\PhoneNumber;
use App\Models\VoicemailDrop;
use App\Services\Telnyx\TelnyxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Storage;

class VoicemailDropController extends Controller implements HasMiddleware
{
    /** Voicemail drops are outbound telephony — paid Phone feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:phone')];
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $drops = VoicemailDrop::query()
            ->withPermissions($user, 'phone')
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();

        return response()->json($drops);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:500',
            'audio' => 'required|file|mimes:mp3,wav,m4a,ogg|max:5120', // 5MB cap
            'is_default' => 'sometimes|boolean',
        ]);

        $file = $request->file('audio');
        $path = $file->store('voicemail-drops', 'public');
        $url = Storage::disk('public')->url($path);

        if (! empty($validated['is_default'])) {
            VoicemailDrop::where('user_id', $user->id)->update(['is_default' => false]);
        }

        $drop = VoicemailDrop::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'audio_path' => $path,
            'audio_url' => $url,
            'size_bytes' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'is_default' => (bool) ($validated['is_default'] ?? false),
        ]);

        return response()->json($drop, 201);
    }

    public function destroy(Request $request, VoicemailDrop $voicemailDrop): JsonResponse
    {
        $user = $request->user();
        abort_unless($voicemailDrop->user_id === $user->id || $voicemailDrop->team_id === $user->team_id, 403);

        Storage::disk('public')->delete($voicemailDrop->audio_path);
        $voicemailDrop->delete();

        return response()->json(['deleted' => true]);
    }

    /**
     * Trigger a voicemail drop to a contact.
     */
    public function send(Request $request, TelnyxService $telnyx): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'contact_id' => 'required|exists:contacts,id',
            'voicemail_drop_id' => 'required|exists:voicemail_drops,id',
        ]);

        $contact = Contact::findOrFail($validated['contact_id']);
        abort_unless($contact->user_id === $user->id || $contact->team_id === $user->team_id, 403);

        $drop = VoicemailDrop::findOrFail($validated['voicemail_drop_id']);
        abort_unless($drop->user_id === $user->id || $drop->team_id === $user->team_id, 403);

        // Check DND
        if (in_array($contact->dnd_mode, ['all', 'calls'], true)) {
            return response()->json(['error' => 'This contact has Do Not Disturb enabled for calls.'], 422);
        }

        $toNumber = $contact->phone ?? $contact->mobile;
        if (! $toNumber) {
            return response()->json(['error' => 'Contact has no phone number.'], 422);
        }

        $phone = PhoneNumber::where('user_id', $user->id)->active()->orderByDesc('is_default')->first();
        if (! $phone) {
            return response()->json(['error' => 'No active phone number. Provision one in Settings.'], 422);
        }

        $connectionId = config('telnyx.call_control_app_id');
        if (! $connectionId) {
            return response()->json(['error' => 'Call Control App not configured. Set TELNYX_CALL_CONTROL_APP_ID.'], 500);
        }

        $callControlId = $telnyx->dropVoicemail(
            from: $phone->phone_number,
            to: $toNumber,
            connectionId: $connectionId,
            audioUrl: $drop->audio_url,
        );

        if (! $callControlId) {
            return response()->json(['error' => 'Telnyx rejected the call. Check API key + Call Control App ID.'], 502);
        }

        $call = CallRecord::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'contact_id' => $contact->id,
            'phone_number_id' => $phone->id,
            'telnyx_call_control_id' => $callControlId,
            'direction' => 'outbound',
            'from_number' => $phone->phone_number,
            'to_number' => $toNumber,
            'status' => 'initiated',
            'is_voicedrop' => true,
            'voicemail_drop_id' => $drop->id,
            'started_at' => now(),
        ]);

        return response()->json([
            'call' => $call,
            'message' => 'Voicedrop initiated. The recipient will hear your message when their voicemail answers.',
        ], 202);
    }
}
