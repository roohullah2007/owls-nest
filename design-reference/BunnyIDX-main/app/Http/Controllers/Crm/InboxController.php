<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\CallRecord;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\EmailMessage;
use App\Models\EmailThread;
use App\Models\Listing;
use App\Models\SmsMessage;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InboxController extends Controller
{
    /**
     * Unified inbox — list contacts with communication, sorted by latest message.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Get contacts that have SMS messages, email threads, or call records
        $contacts = Contact::query()
            ->withPermissions($user, 'contacts')
            ->where(function ($q) use ($user) {
                $q->whereHas('smsMessages', fn ($sq) => $sq->withPermissions($user, 'phone'))
                    ->orWhereHas('emailThreads', fn ($eq) => $eq->where('user_id', $user->id))
                    ->orWhereHas('callRecords', fn ($cq) => $cq->withPermissions($user, 'phone'));
            })
            ->withCount([
                'smsMessages as unread_sms_count' => fn ($q) => $q
                    ->withPermissions($user, 'phone')
                    ->where('direction', 'inbound')
                    ->whereNull('read_at'),
                'emailThreads as unread_email_count' => fn ($q) => $q
                    ->where('user_id', $user->id)
                    ->where('is_read', false)
                    ->where('is_archived', false),
            ])
            ->with([
                'smsMessages' => fn ($q) => $q->withPermissions($user, 'phone')->latest()->limit(1),
                'emailThreads' => fn ($q) => $q->where('user_id', $user->id)->orderByDesc('last_message_at')->limit(1),
                'callRecords' => fn ($q) => $q->withPermissions($user, 'phone')->latest()->limit(1),
                'assignedUsers:id',
            ])
            ->get()
            ->map(function ($contact) {
                $lastSms = $contact->smsMessages->first();
                $lastThread = $contact->emailThreads->first();
                $lastCall = $contact->callRecords->first();

                // Determine latest channel + timestamp
                $candidates = [];
                if ($lastSms) {
                    $candidates[] = ['channel' => 'sms', 'at' => $lastSms->created_at, 'snippet' => mb_substr($lastSms->body, 0, 80)];
                }
                if ($lastThread) {
                    $candidates[] = ['channel' => 'email', 'at' => $lastThread->last_message_at, 'snippet' => $lastThread->snippet ?? $lastThread->subject ?? ''];
                }
                if ($lastCall) {
                    $candidates[] = ['channel' => 'call', 'at' => $lastCall->created_at, 'snippet' => $lastCall->status === 'completed' ? 'Call (' . ($lastCall->duration_seconds ? gmdate('i:s', $lastCall->duration_seconds) : '0:00') . ')' : ucfirst($lastCall->status) . ' call'];
                }

                if (empty($candidates)) {
                    return null;
                }

                usort($candidates, fn ($a, $b) => $b['at'] <=> $a['at']);
                $latest = $candidates[0];

                return [
                    'contact_id' => $contact->id,
                    'contact_uuid' => $contact->uuid,
                    'contact_name' => $contact->full_name,
                    'contact_email' => $contact->email,
                    'contact_phone' => $contact->phone ?? $contact->mobile,
                    'contact_type' => $contact->type,
                    'lead_score' => $contact->lead_score,
                    'last_message_at' => $latest['at']->toISOString(),
                    'last_channel' => $latest['channel'],
                    'last_snippet' => $latest['snippet'],
                    'unread_count' => (int) $contact->unread_sms_count + (int) $contact->unread_email_count,
                    'has_email' => $lastThread !== null,
                    'has_sms' => $lastSms !== null,
                    'has_calls' => $lastCall !== null,
                    'assigned_user_ids' => $contact->assignedUsers->pluck('id')->toArray(),
                ];
            })
            ->filter()
            ->sortByDesc('last_message_at')
            ->values();

        return Inertia::render('Crm/Inbox/Index', [
            'conversations' => $contacts,
        ]);
    }

    /**
     * Search contacts for new conversation.
     */
    public function searchContacts(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate(['q' => 'required|string|min:1|max:100']);

        $q = str_replace(['%', '_'], ['\\%', '\\_'], $request->input('q'));

        $contacts = Contact::query()
            ->withPermissions($user, 'contacts')
            ->where(function ($query) use ($q) {
                $query->where('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('mobile', 'like', "%{$q}%");
            })
            ->select('id', 'uuid', 'first_name', 'last_name', 'email', 'phone', 'mobile', 'type')
            ->limit(10)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'uuid' => $c->uuid,
                'name' => $c->full_name,
                'email' => $c->email,
                'phone' => $c->phone ?? $c->mobile,
                'type' => $c->type,
            ]);

        return response()->json($contacts);
    }

    /**
     * Search the user's own listings to insert into a composed message.
     */
    public function searchListings(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate(['q' => 'nullable|string|max:100']);

        $q = $request->input('q');

        $listings = Listing::query()
            ->withPermissions($user, 'listings')
            ->when($q, function ($query) use ($q) {
                $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $q);
                $query->where(function ($w) use ($escaped) {
                    $w->where('title', 'like', "%{$escaped}%")
                        ->orWhere('address', 'like', "%{$escaped}%")
                        ->orWhere('city', 'like', "%{$escaped}%")
                        ->orWhere('mls_number', 'like', "%{$escaped}%");
                });
            })
            ->orderByDesc('created_at')
            ->limit(15)
            ->get(['id', 'title', 'address', 'city', 'state_province', 'price', 'bedrooms', 'bathrooms', 'sqft', 'mls_number', 'photos'])
            ->map(fn ($l) => [
                'id' => $l->id,
                'title' => $l->title,
                'address' => $l->address,
                'city' => $l->city,
                'state_province' => $l->state_province,
                'price' => $l->price,
                'bedrooms' => $l->bedrooms,
                'bathrooms' => $l->bathrooms,
                'sqft' => $l->sqft,
                'mls_number' => $l->mls_number,
                'photo' => is_array($l->photos) && count($l->photos) > 0 ? $l->photos[0] : null,
            ]);

        return response()->json($listings);
    }

    /**
     * Search the user's deals to attach to a message.
     */
    public function searchDeals(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate(['q' => 'nullable|string|max:100']);

        $q = $request->input('q');

        $deals = Deal::query()
            ->withPermissions($user, 'deals')
            ->with('pipelineStage:id,name')
            ->when($q, function ($query) use ($q) {
                $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $q);
                $query->where(function ($w) use ($escaped) {
                    $w->where('title', 'like', "%{$escaped}%")
                        ->orWhere('property_address', 'like', "%{$escaped}%")
                        ->orWhere('mls_number', 'like', "%{$escaped}%");
                });
            })
            ->orderByDesc('updated_at')
            ->limit(15)
            ->get(['id', 'title', 'value', 'property_address', 'type', 'pipeline_stage_id', 'mls_number'])
            ->map(fn ($d) => [
                'id' => $d->id,
                'title' => $d->title,
                'value' => $d->value,
                'property_address' => $d->property_address,
                'type' => $d->type,
                'stage' => $d->pipelineStage?->name,
                'mls_number' => $d->mls_number,
            ]);

        return response()->json($deals);
    }

    /**
     * Get unified thread for a contact — all communication merged chronologically.
     */
    public function thread(Request $request, Contact $contact): JsonResponse
    {
        $user = $request->user();

        // SMS messages
        $smsMessages = SmsMessage::where('contact_id', $contact->id)
            ->withPermissions($user, 'phone')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'channel' => 'sms',
                'direction' => $m->direction,
                'timestamp' => $m->created_at->toISOString(),
                'body' => $m->body,
                'status' => $m->status,
            ]);

        // Email messages
        $emailMessages = EmailMessage::where('contact_id', $contact->id)
            ->whereHas('thread', fn ($q) => $q->where('user_id', $user->id))
            ->orderBy('sent_at', 'asc')
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'channel' => 'email',
                'direction' => $m->direction,
                'timestamp' => $m->sent_at->toISOString(),
                'subject' => $m->subject,
                'body_html' => $m->body_html,
                'body_text' => $m->body_text,
                'from_address' => $m->from_address,
                'from_name' => $m->from_name,
            ]);

        // Call records
        $callRecords = CallRecord::where('contact_id', $contact->id)
            ->withPermissions($user, 'phone')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'channel' => 'call',
                'direction' => $m->direction,
                'timestamp' => $m->created_at->toISOString(),
                'duration_seconds' => $m->duration_seconds,
                'call_status' => $m->status,
                'notes' => $m->notes,
                'recording_url' => $m->recording_url,
            ]);

        // Merge and sort by timestamp
        $timeline = $smsMessages
            ->concat($emailMessages)
            ->concat($callRecords)
            ->sortBy('timestamp')
            ->values();

        // Mark unread SMS as read
        SmsMessage::where('contact_id', $contact->id)
            ->withPermissions($user, 'phone')
            ->where('direction', 'inbound')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        // Mark unread email threads as read
        EmailThread::where('contact_id', $contact->id)
            ->where('user_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        $contact->load(['tags', 'deals:id,title,value', 'assignedUsers:id,name', 'tasks', 'meetings']);

        return response()->json([
            'messages' => $timeline,
            'contact' => [
                'id' => $contact->id,
                'uuid' => $contact->uuid,
                'name' => $contact->full_name,
                'first_name' => $contact->first_name,
                'last_name' => $contact->last_name,
                'email' => $contact->email,
                'phone' => $contact->phone,
                'mobile' => $contact->mobile,
                'type' => $contact->type,
                'source' => $contact->source,
                'status' => $contact->status,
                'address' => $contact->address,
                'city' => $contact->city,
                'state_province' => $contact->state_province,
                'lead_score' => $contact->lead_score,
                'last_contacted_at' => $contact->last_contacted_at?->toISOString(),
                'created_at' => $contact->created_at->toISOString(),
                'sms_consent' => (bool) $contact->sms_consent,
                'sms_opted_out' => (bool) $contact->sms_opted_out,
                'dnd_mode' => $contact->dnd_mode ?? 'none',
                'tags' => $contact->tags->map(fn ($t) => ['id' => $t->id, 'name' => $t->name, 'color' => $t->color]),
                'deals' => $contact->deals->map(fn ($d) => ['id' => $d->id, 'title' => $d->title, 'value' => $d->value]),
                'assigned_users' => $contact->assignedUsers->map(fn ($u) => ['id' => $u->id, 'name' => $u->name]),
                'tasks' => $contact->tasks->map(fn ($t) => [
                    'id' => $t->id,
                    'title' => $t->title,
                    'description' => $t->description,
                    'priority' => $t->priority,
                    'due_date' => $t->due_date?->toDateString(),
                    'due_at' => $t->due_at?->toISOString(),
                    'is_completed' => (bool) $t->is_completed,
                    'completed_at' => $t->completed_at?->toISOString(),
                ]),
                'meetings' => $contact->meetings->map(fn ($m) => [
                    'id' => $m->id,
                    'title' => $m->title,
                    'description' => $m->description,
                    'location' => $m->location,
                    'meeting_type' => $m->meeting_type,
                    'starts_at' => $m->starts_at?->toISOString(),
                    'ends_at' => $m->ends_at?->toISOString(),
                    'is_completed' => (bool) $m->is_completed,
                ]),
                'custom_fields' => $contact->custom_fields ?? (object) [],
            ],
            'options' => [
                'lead_types' => $user->getLeadTypes(),
                'statuses' => $user->getContactStatuses(),
                'all_tags' => Tag::forUser($user)->get(['id', 'name', 'color']),
                'custom_field_defs' => $user->getCustomFields(),
            ],
        ]);
    }
}
