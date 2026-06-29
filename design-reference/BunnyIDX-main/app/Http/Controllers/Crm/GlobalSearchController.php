<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Deal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Global quick-search behind the top-nav search button (and Cmd/Ctrl-K).
 *
 * Returns a small set of tenant-scoped matches grouped by entity. Scoping goes
 * through the BelongsToTeamOrUser `forUser` scope so a user only ever sees their
 * own (or their team's) records — never another tenant's.
 *
 * Only entities that have a detail page are searched: Contacts and Deals. Tasks
 * have no standalone detail route, so they're intentionally excluded.
 */
class GlobalSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $term = trim((string) $request->query('q', ''));

        // Require at least 2 chars to avoid scanning the whole table on a single
        // keystroke; the frontend debounces but this is the real guard.
        if (mb_strlen($term) < 2) {
            return response()->json(['contacts' => [], 'deals' => []]);
        }

        // Escape LIKE wildcards in user input so "%"/"_" are matched literally.
        $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $term);
        $like = '%'.$escaped.'%';
        $tokens = preg_split('/\s+/', $escaped, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        $contacts = Contact::forUser($user)
            ->where(function ($q) use ($like, $tokens) {
                $q->where('email', 'like', $like)
                    ->orWhere('phone', 'like', $like);
                // Each token must appear in the first or last name, so a
                // two-word "Jane Doe" query matches across the two columns.
                $q->orWhere(function ($q2) use ($tokens, $like) {
                    if (empty($tokens)) {
                        $q2->where('first_name', 'like', $like)
                            ->orWhere('last_name', 'like', $like);

                        return;
                    }
                    foreach ($tokens as $token) {
                        $tl = '%'.$token.'%';
                        $q2->where(fn ($q3) => $q3->where('first_name', 'like', $tl)
                            ->orWhere('last_name', 'like', $tl));
                    }
                });
            })
            ->orderByDesc('created_at')
            ->limit(6)
            ->get(['id', 'uuid', 'first_name', 'last_name', 'email', 'type']);

        $deals = Deal::forUser($user)
            ->where('title', 'like', $like)
            ->orderByDesc('created_at')
            ->limit(6)
            ->get(['id', 'title', 'value']);

        return response()->json([
            'contacts' => $contacts->map(fn (Contact $c) => [
                'id' => $c->id,
                'label' => trim("{$c->first_name} {$c->last_name}") ?: ($c->email ?: 'Contact'),
                'sublabel' => $c->email ?: ($c->type ? ucwords(str_replace('_', ' ', $c->type)) : null),
                'url' => route('crm.contacts.show', $c->uuid),
            ])->all(),
            'deals' => $deals->map(fn (Deal $d) => [
                'id' => $d->id,
                'label' => $d->title,
                'sublabel' => $d->value !== null ? '$'.number_format((float) $d->value) : null,
                'url' => route('crm.deals.show', $d->id),
            ])->all(),
        ]);
    }
}
