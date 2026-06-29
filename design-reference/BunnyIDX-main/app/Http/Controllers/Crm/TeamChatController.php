<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Events\ChatMessageDeleted;
use App\Events\ChatMessageUpdated;
use App\Events\NewChatMessage;
use App\Events\UserTyping;
use App\Http\Controllers\Controller;
use App\Models\ChatAttachment;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Listing;
use App\Models\TeamChatMessage;
use App\Models\User;
use App\Notifications\TeamMentionNotification;
use App\Services\Ai\TeamChatAiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Storage;

class TeamChatController extends Controller implements HasMiddleware
{
    /** Team chat is a Team-plan collaboration feature. */
    public static function middleware(): array
    {
        return [new Middleware('team.plan')];
    }

    private array $eagerLoads = [
        'user:id,name',
        'contact:id,first_name,last_name,uuid',
        'attachments',
        'replyTo:id,user_id,body',
        'replyTo.user:id,name',
        'listing:id,title,address,city,state_province,price,bedrooms,bathrooms,photos,mls_number,status',
        'deal:id,title',
    ];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->team_id, 403);

        $query = TeamChatMessage::where('team_id', $user->team_id)
            ->with($this->eagerLoads);

        // DM filtering: if recipient_id given, show DM conversation; otherwise team-wide only
        if ($request->filled('recipient_id')) {
            $recipientId = (int) $request->input('recipient_id');
            $query->where(function ($q) use ($user, $recipientId) {
                $q->where(function ($inner) use ($user, $recipientId) {
                    $inner->where('user_id', $user->id)->where('recipient_id', $recipientId);
                })->orWhere(function ($inner) use ($user, $recipientId) {
                    $inner->where('user_id', $recipientId)->where('recipient_id', $user->id);
                });
            });
        } else {
            $query->whereNull('recipient_id');
        }

        if ($request->has('before')) {
            // Load older messages (infinite scroll up)
            $messages = $query->where('id', '<', (int) $request->input('before'))
                ->orderByDesc('id')
                ->limit(50)
                ->get()
                ->reverse()
                ->values();
        } elseif ($request->has('after')) {
            $messages = $query->where('id', '>', (int) $request->input('after'))
                ->orderBy('id')
                ->limit(100)
                ->get();
        } else {
            $messages = $query->orderByDesc('id')
                ->limit(50)
                ->get()
                ->reverse()
                ->values();
        }

        return response()->json(['messages' => $messages]);
    }

    public function latestId(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->team_id, 403);

        $query = TeamChatMessage::where('team_id', $user->team_id);

        if ($request->filled('recipient_id')) {
            $recipientId = (int) $request->input('recipient_id');
            $query->where(function ($q) use ($user, $recipientId) {
                $q->where(function ($inner) use ($user, $recipientId) {
                    $inner->where('user_id', $user->id)->where('recipient_id', $recipientId);
                })->orWhere(function ($inner) use ($user, $recipientId) {
                    $inner->where('user_id', $recipientId)->where('recipient_id', $user->id);
                });
            });
        } else {
            $query->whereNull('recipient_id');
        }

        $latestId = $query->max('id') ?? 0;

        return response()->json(['latest_id' => $latestId]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->team_id, 403);

        $validated = $request->validate([
            'body' => 'required_without_all:attachments,listing_id|nullable|string|max:5000',
            'mentions' => 'nullable|array',
            'mentions.*' => 'integer',
            'contact_id' => 'nullable|integer',
            'reply_to_id' => 'nullable|integer',
            'listing_id' => 'nullable|integer',
            'deal_id' => 'nullable|integer',
            'recipient_id' => 'nullable|integer',
            'attachments' => 'nullable|array|max:5',
            'attachments.*' => 'file|max:10240|mimes:jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,txt,csv,mp3,ogg,webm,wav,m4a,mp4',
        ]);

        // Validate mentions are team members
        if (!empty($validated['mentions'])) {
            $teamUserIds = $user->team->members()->pluck('user_id')->toArray();
            $validated['mentions'] = array_values(array_intersect($validated['mentions'], $teamUserIds));
        }

        // Validate contact belongs to same team
        if (!empty($validated['contact_id'])) {
            $contact = Contact::where('team_id', $user->team_id)->find($validated['contact_id']);
            if (!$contact) {
                $validated['contact_id'] = null;
            }
        }

        // Validate reply_to belongs to same team
        if (!empty($validated['reply_to_id'])) {
            $replyMsg = TeamChatMessage::where('team_id', $user->team_id)->find($validated['reply_to_id']);
            if (!$replyMsg) {
                $validated['reply_to_id'] = null;
            }
        }

        // Validate listing belongs to same team
        if (!empty($validated['listing_id'])) {
            $listing = Listing::where('team_id', $user->team_id)->find($validated['listing_id']);
            if (!$listing) {
                $validated['listing_id'] = null;
            }
        }

        // Validate deal belongs to same team
        if (!empty($validated['deal_id'])) {
            $deal = Deal::where('team_id', $user->team_id)->find($validated['deal_id']);
            if (!$deal) {
                $validated['deal_id'] = null;
            }
        }

        // Validate recipient is a team member
        if (!empty($validated['recipient_id'])) {
            $isTeamMember = $user->team->members()->where('user_id', $validated['recipient_id'])->exists();
            if (!$isTeamMember) {
                $validated['recipient_id'] = null;
            }
        }

        $message = TeamChatMessage::create([
            'team_id' => $user->team_id,
            'user_id' => $user->id,
            'body' => $validated['body'] ?? '',
            'mentions' => $validated['mentions'] ?? null,
            'contact_id' => $validated['contact_id'] ?? null,
            'reply_to_id' => $validated['reply_to_id'] ?? null,
            'listing_id' => $validated['listing_id'] ?? null,
            'deal_id' => $validated['deal_id'] ?? null,
            'recipient_id' => $validated['recipient_id'] ?? null,
        ]);

        // Handle file attachments
        if ($request->hasFile('attachments')) {
            $disk = config('services.chat.attachments_disk', env('CHAT_ATTACHMENTS_DISK', 'public'));

            foreach ($request->file('attachments') as $file) {
                $path = $file->store("chat-attachments/{$user->team_id}", $disk);

                ChatAttachment::create([
                    'team_chat_message_id' => $message->id,
                    'disk' => $disk,
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ]);
            }
        }

        $message->load($this->eagerLoads);

        broadcast(new NewChatMessage($message))->toOthers();

        // Notify mentioned users
        if (!empty($validated['mentions'])) {
            $mentionedUsers = User::whereIn('id', $validated['mentions'])
                ->where('id', '!=', $user->id)
                ->get();
            foreach ($mentionedUsers as $mentionedUser) {
                $mentionedUser->notify(new TeamMentionNotification($user, $validated['body'] ?? ''));
            }
        }

        // AI assistant trigger — the AI reply is a paid feature, but team chat
        // itself is not, so we gate only the assistant (free users' @BunnyAI
        // messages still post as normal chat, just without an AI response).
        $body = $validated['body'] ?? '';
        if ($user->hasFeature('ai') && (preg_match('/^@BunnyAI\s+/i', $body) || preg_match('/^\/ai\s+/i', $body))) {
            $question = preg_replace('/^(@BunnyAI|\/ai)\s+/i', '', $body);
            if (trim($question) !== '') {
                try {
                    $aiService = app(TeamChatAiService::class);
                    $answer = $aiService->answer($question, $user);

                    $aiMessage = TeamChatMessage::create([
                        'team_id' => $user->team_id,
                        'user_id' => null,
                        'body' => $answer,
                        'is_ai_response' => true,
                    ]);

                    $aiMessage->load($this->eagerLoads);
                    broadcast(new NewChatMessage($aiMessage))->toOthers();
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('AI chat failed', ['error' => $e->getMessage()]);
                }
            }
        }

        return response()->json(['message' => $message], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->team_id, 403);

        $message = TeamChatMessage::where('team_id', $user->team_id)
            ->where('user_id', $user->id)
            ->findOrFail($id);

        $validated = $request->validate([
            'body' => 'required|string|max:5000',
        ]);

        $message->update([
            'body' => $validated['body'],
            'edited_at' => now(),
        ]);

        broadcast(new ChatMessageUpdated($message))->toOthers();

        return response()->json(['message' => $message->load($this->eagerLoads)]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->team_id, 403);

        $message = TeamChatMessage::where('team_id', $user->team_id)
            ->where('user_id', $user->id)
            ->findOrFail($id);

        $teamId = $message->team_id;

        // Delete attachments from disk
        foreach ($message->attachments as $attachment) {
            Storage::disk($attachment->disk)->delete($attachment->path);
            $attachment->delete();
        }

        $message->delete();

        broadcast(new ChatMessageDeleted($id, $teamId))->toOthers();

        return response()->json(['ok' => true]);
    }

    public function react(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->team_id, 403);

        $message = TeamChatMessage::where('team_id', $user->team_id)->findOrFail($id);

        $validated = $request->validate([
            'emoji' => 'required|string|max:10',
        ]);

        $emoji = $validated['emoji'];
        $reactions = $message->reactions ?? [];

        // Add user to this emoji's reactor list (avoid duplicates)
        $reactors = $reactions[$emoji] ?? [];
        if (!in_array($user->id, $reactors)) {
            $reactors[] = $user->id;
        }
        $reactions[$emoji] = $reactors;

        $message->update(['reactions' => $reactions]);

        broadcast(new ChatMessageUpdated($message))->toOthers();

        return response()->json(['reactions' => $reactions]);
    }

    public function unreact(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->team_id, 403);

        $message = TeamChatMessage::where('team_id', $user->team_id)->findOrFail($id);

        $validated = $request->validate([
            'emoji' => 'required|string|max:10',
        ]);

        $emoji = $validated['emoji'];
        $reactions = $message->reactions ?? [];

        if (isset($reactions[$emoji])) {
            $reactions[$emoji] = array_values(array_filter($reactions[$emoji], fn ($uid) => $uid !== $user->id));
            if (empty($reactions[$emoji])) {
                unset($reactions[$emoji]);
            }
        }

        $message->update(['reactions' => empty($reactions) ? null : $reactions]);

        broadcast(new ChatMessageUpdated($message))->toOthers();

        return response()->json(['reactions' => $reactions]);
    }

    public function typing(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->team_id, 403);

        broadcast(new UserTyping(
            teamId: $user->team_id,
            userId: $user->id,
            userName: $user->name,
        ))->toOthers();

        return response()->json(['ok' => true]);
    }

    public function searchContacts(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->team_id, 403);

        $request->validate(['q' => 'nullable|string|max:100']);
        $q = str_replace(['%', '_'], ['\\%', '\\_'], $request->input('q', ''));

        $contacts = Contact::where('team_id', $user->team_id)
            ->where(function ($query) use ($q) {
                $query->where('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            })
            ->select('id', 'first_name', 'last_name', 'email', 'uuid')
            ->limit(10)
            ->get();

        return response()->json(['contacts' => $contacts]);
    }

    public function searchListings(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->team_id, 403);

        $request->validate(['q' => 'nullable|string|max:100']);
        $q = str_replace(['%', '_'], ['\\%', '\\_'], $request->input('q', ''));

        $listings = Listing::where('team_id', $user->team_id)
            ->where(function ($query) use ($q) {
                $query->where('title', 'like', "%{$q}%")
                    ->orWhere('address', 'like', "%{$q}%")
                    ->orWhere('mls_number', 'like', "%{$q}%")
                    ->orWhere('city', 'like', "%{$q}%");
            })
            ->select('id', 'title', 'address', 'city', 'state_province', 'price', 'bedrooms', 'bathrooms', 'photos', 'mls_number', 'status')
            ->limit(8)
            ->get();

        return response()->json(['listings' => $listings]);
    }

    public function searchDeals(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->team_id, 403);

        $request->validate(['q' => 'nullable|string|max:100']);
        $q = str_replace(['%', '_'], ['\\%', '\\_'], $request->input('q', ''));

        $deals = Deal::where('team_id', $user->team_id)
            ->where(function ($query) use ($q) {
                $query->where('title', 'like', "%{$q}%")
                    ->orWhere('property_address', 'like', "%{$q}%")
                    ->orWhere('mls_number', 'like', "%{$q}%");
            })
            ->select('id', 'title', 'value', 'type', 'property_address')
            ->limit(8)
            ->get();

        return response()->json(['deals' => $deals]);
    }

    public function contextMessages(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->team_id, 403);

        $query = TeamChatMessage::where('team_id', $user->team_id)
            ->with($this->eagerLoads);

        if ($request->filled('contact_id')) {
            $query->where('contact_id', (int) $request->input('contact_id'));
        } elseif ($request->filled('deal_id')) {
            $query->where('deal_id', (int) $request->input('deal_id'));
        } elseif ($request->filled('listing_id')) {
            $query->where('listing_id', (int) $request->input('listing_id'));
        } else {
            return response()->json(['messages' => []]);
        }

        $messages = $query->orderByDesc('id')
            ->limit(20)
            ->get()
            ->reverse()
            ->values();

        return response()->json(['messages' => $messages]);
    }
}
