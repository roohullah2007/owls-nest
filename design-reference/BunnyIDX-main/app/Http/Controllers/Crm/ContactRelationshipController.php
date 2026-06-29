<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactRelationship;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ContactRelationshipController extends Controller
{
    /**
     * Create a relationship from $contact to either an existing contact
     * (related_contact_id) OR a brand-new contact (new_contact[*]).
     * Always writes the reciprocal row so look-ups from either side are O(1).
     */
    public function store(Request $request, Contact $contact): RedirectResponse
    {
        $this->authorize($request, $contact);
        $user = $request->user();

        $data = $request->validate([
            'type' => ['required', 'string', Rule::in(array_keys(ContactRelationship::TYPES))],
            'custom_label' => 'nullable|string|max:100',
            'related_contact_id' => 'nullable|integer|exists:contacts,id',
            'new_contact' => 'nullable|array',
            'new_contact.first_name' => 'required_with:new_contact|string|max:100',
            'new_contact.last_name' => 'nullable|string|max:100',
            'new_contact.email' => 'nullable|email|max:255',
            'new_contact.phone' => 'nullable|string|max:30',
        ]);

        DB::transaction(function () use ($contact, $user, $data) {
            // Resolve the other contact — either existing or newly created.
            if (! empty($data['related_contact_id'])) {
                $related = Contact::forUser($user)->findOrFail($data['related_contact_id']);
            } else {
                if (empty($data['new_contact']['first_name'])) {
                    abort(422, 'Pick an existing contact or provide a new one.');
                }
                $related = $user->contacts()->create([
                    'first_name' => $data['new_contact']['first_name'],
                    'last_name' => $data['new_contact']['last_name'] ?? '',
                    'email' => $data['new_contact']['email'] ?? null,
                    'phone' => $data['new_contact']['phone'] ?? null,
                    'type' => $contact->type,
                    // `source` is an enum (website/referral/.../manual/other); 'Family'
                    // is not a valid value and would truncate → QueryException 500.
                    'source' => 'manual',
                    'status' => 'active',
                ]);
            }

            if ($related->id === $contact->id) {
                abort(422, 'A contact cannot be related to themselves.');
            }

            $type = $data['type'];
            $label = $data['custom_label'] ?? null;
            $inverse = ContactRelationship::inverseOf($type);

            ContactRelationship::updateOrCreate(
                ['contact_id' => $contact->id, 'related_contact_id' => $related->id],
                ['type' => $type, 'custom_label' => $label],
            );
            ContactRelationship::updateOrCreate(
                ['contact_id' => $related->id, 'related_contact_id' => $contact->id],
                ['type' => $inverse, 'custom_label' => $label],
            );
        });

        return back()->with('success', 'Family member linked.');
    }

    /**
     * Remove a relationship in both directions.
     */
    public function destroy(Request $request, Contact $contact, ContactRelationship $relationship): RedirectResponse
    {
        $this->authorize($request, $contact);
        // Belt and suspenders: the pivot row must belong to this contact, AND the
        // related contact must also be visible to the current user. This blocks
        // a crafted URL that pairs a contact you can access with an unrelated
        // relationship id.
        abort_unless($relationship->contact_id === $contact->id, 404);
        $user = $request->user();
        $relatedExists = Contact::forUser($user)->whereKey($relationship->related_contact_id)->exists();
        abort_unless($relatedExists, 404);

        DB::transaction(function () use ($relationship) {
            ContactRelationship::where('contact_id', $relationship->related_contact_id)
                ->where('related_contact_id', $relationship->contact_id)
                ->delete();
            $relationship->delete();
        });

        return back()->with('success', 'Family member unlinked.');
    }

    /**
     * Search the user's contacts for the picker. Excludes the current contact
     * and anyone already linked.
     */
    public function search(Request $request, Contact $contact): JsonResponse
    {
        $this->authorize($request, $contact);
        $user = $request->user();
        $q = trim((string) $request->query('q', ''));

        $linkedIds = ContactRelationship::where('contact_id', $contact->id)->pluck('related_contact_id');

        $results = Contact::forUser($user)
            ->whereNotIn('id', $linkedIds->push($contact->id))
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($q2) use ($q) {
                    $q2->where('first_name', 'like', "%{$q}%")
                       ->orWhere('last_name', 'like', "%{$q}%")
                       ->orWhere('email', 'like', "%{$q}%");
                });
            })
            ->orderBy('first_name')
            ->limit(20)
            ->get(['id', 'first_name', 'last_name', 'email', 'phone']);

        return response()->json($results);
    }

    private function authorize(Request $request, Contact $contact): void
    {
        $user = $request->user();
        abort_unless(
            $contact->user_id === $user->id || ($user->team_id && $contact->team_id === $user->team_id),
            403,
        );
    }
}
