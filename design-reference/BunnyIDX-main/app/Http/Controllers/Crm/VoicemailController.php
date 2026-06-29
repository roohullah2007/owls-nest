<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Voicemail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * CRUD for Voicemail clips. Used by the Settings > Voicemails tab and the
 * Power Dialer's VM Drop picker.
 */
class VoicemailController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $voicemails = Voicemail::visibleTo($user)
            ->orderByDesc('is_default')
            ->orderByDesc('created_at')
            ->get(['id', 'user_id', 'team_id', 'name', 'audio_url', 'duration_seconds', 'is_default', 'is_team_shared', 'created_at']);

        return response()->json(['voicemails' => $voicemails->map(fn ($v) => $this->payload($v, $user))]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'audio' => 'required|file|mimes:mp3,wav,m4a,ogg|max:5120', // 5MB cap
            'is_team_shared' => 'nullable|boolean',
            'is_default' => 'nullable|boolean',
        ]);

        $user = $request->user();
        // Public disk so Telnyx can fetch it. Run `php artisan storage:link` once for the
        // public/storage symlink.
        $path = $request->file('audio')->store("voicemails/{$user->id}", 'public');
        $url = Storage::disk('public')->url($path);

        if (!empty($validated['is_default'])) {
            Voicemail::where('user_id', $user->id)->update(['is_default' => false]);
        }

        $vm = Voicemail::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'name' => $validated['name'],
            'audio_url' => $url,
            'audio_path' => $path,
            'is_default' => !empty($validated['is_default']),
            'is_team_shared' => !empty($validated['is_team_shared']),
        ]);

        return response()->json(['voicemail' => $this->payload($vm->fresh(), $user)], 201);
    }

    public function destroy(Request $request, Voicemail $voicemail): JsonResponse
    {
        $user = $request->user();
        abort_unless($voicemail->user_id === $user->id, 403);

        if ($voicemail->audio_path) {
            Storage::disk('public')->delete($voicemail->audio_path);
        }
        $voicemail->delete();
        return response()->json(['ok' => true]);
    }

    public function setDefault(Request $request, Voicemail $voicemail): JsonResponse
    {
        $user = $request->user();
        abort_unless($voicemail->user_id === $user->id, 403);

        Voicemail::where('user_id', $user->id)->update(['is_default' => false]);
        $voicemail->update(['is_default' => true]);
        return response()->json(['voicemail' => $this->payload($voicemail->fresh(), $user)]);
    }

    private function payload(Voicemail $v, \App\Models\User $user): array
    {
        return [
            'id' => $v->id,
            'name' => $v->name,
            'audio_url' => $v->audio_url,
            'duration_seconds' => $v->duration_seconds,
            'is_default' => $v->is_default,
            'is_team_shared' => $v->is_team_shared,
            'is_mine' => $v->user_id === $user->id,
            'created_at' => $v->created_at,
        ];
    }
}
