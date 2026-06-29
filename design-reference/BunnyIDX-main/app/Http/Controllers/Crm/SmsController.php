<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\SmsMessage;
use App\Services\Telnyx\SmsSender;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SmsController extends Controller
{
    public function __construct(
        private SmsSender $smsSender,
    ) {}

    /**
     * SMS Inbox — list all conversations with latest message.
     */
    public function inbox(Request $request): Response
    {
        $user = $request->user();

        // Get contacts that have SMS messages, with latest message + unread count
        $conversations = Contact::query()
            ->withPermissions($user, 'contacts')
            ->whereHas('smsMessages', function ($q) use ($user) {
                $q->withPermissions($user, 'phone');
            })
            ->withCount(['smsMessages as unread_count' => function ($q) use ($user) {
                $q->withPermissions($user, 'phone')
                    ->where('direction', 'inbound')
                    ->whereNull('read_at');
            }])
            ->with(['smsMessages' => function ($q) use ($user) {
                $q->withPermissions($user, 'phone')
                    ->latest()
                    ->limit(1);
            }])
            ->get()
            ->map(function ($contact) {
                $lastMessage = $contact->smsMessages->first();

                return [
                    'contact_id' => $contact->id,
                    'contact_uuid' => $contact->uuid,
                    'contact_name' => $contact->full_name,
                    'contact_phone' => $contact->phone,
                    'contact_mobile' => $contact->mobile,
                    'sms_consent' => (bool) $contact->sms_consent,
                    'sms_opted_out' => (bool) $contact->sms_opted_out,
                    'last_message_body' => $lastMessage?->body ?? '',
                    'last_message_at' => $lastMessage?->created_at?->toISOString() ?? '',
                    'last_message_direction' => $lastMessage?->direction ?? 'outbound',
                    'unread_count' => (int) $contact->unread_count,
                ];
            })
            ->sortByDesc('last_message_at')
            ->values();

        return Inertia::render('Crm/Sms/Index', [
            'conversations' => $conversations,
        ]);
    }

    /**
     * Get SMS thread for a contact.
     */
    public function thread(Request $request, Contact $contact): JsonResponse
    {
        $user = $request->user();

        $messages = SmsMessage::where('contact_id', $contact->id)
            ->withPermissions($user, 'phone')
            ->orderBy('created_at', 'asc')
            ->get();

        // Mark unread inbound messages as read
        SmsMessage::where('contact_id', $contact->id)
            ->withPermissions($user, 'phone')
            ->where('direction', 'inbound')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'messages' => $messages,
            'contact' => [
                'id' => $contact->id,
                'uuid' => $contact->uuid,
                'name' => $contact->full_name,
                'phone' => $contact->phone,
                'mobile' => $contact->mobile,
                'sms_consent' => $contact->sms_consent,
                'sms_opted_out' => $contact->sms_opted_out,
            ],
        ]);
    }

    /**
     * Send an SMS to a contact.
     */
    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'contact_id' => 'required|exists:contacts,id',
            'to_number' => 'required|string',
            'body' => 'required|string|max:1600',
            'phone_number_id' => 'nullable|exists:phone_numbers,id',
        ]);

        $user = $request->user();
        $contact = Contact::findOrFail($validated['contact_id']);

        $result = $this->smsSender->send(
            user: $user,
            contact: $contact,
            body: $validated['body'],
            toNumber: $validated['to_number'],
            phoneNumberId: $validated['phone_number_id'] ?? null,
        );

        if ($result['status'] === 'skipped') {
            $message = match ($result['reason']) {
                'opted_out' => 'Contact has opted out of SMS (replied STOP).',
                'dnd' => 'Contact has Do Not Disturb enabled for SMS.',
                '10dlc_unapproved' => 'US/Canadian SMS requires 10DLC registration. Complete it in Settings.',
                'no_phone' => 'No active phone number. Purchase one in Settings.',
                'insufficient_credits' => 'Not enough phone credits. Top up your balance in Settings.',
                default => 'SMS could not be sent.',
            };

            return response()->json(['error' => $message], 422);
        }

        if ($result['status'] === 'failed') {
            return response()->json(['error' => $result['error'] ?? 'Failed to send SMS via Telnyx.'], 500);
        }

        return response()->json(['message' => $result['message']], 201);
    }

    /**
     * Update SMS consent for a contact.
     */
    public function updateConsent(Request $request, Contact $contact): JsonResponse
    {
        $validated = $request->validate([
            'sms_consent' => 'required|boolean',
        ]);

        $updates = [];

        if ($validated['sms_consent']) {
            $updates['sms_consent'] = true;
            $updates['sms_consent_at'] = now();
            $updates['sms_opted_out'] = false;
            $updates['sms_opted_out_at'] = null;
        } else {
            $updates['sms_consent'] = false;
            $updates['sms_consent_at'] = null;
        }

        $contact->update($updates);

        return response()->json(['success' => true]);
    }
}
