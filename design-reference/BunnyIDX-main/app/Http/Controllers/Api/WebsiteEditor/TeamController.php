<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor;

use App\Http\Controllers\Api\WebsiteEditor\Concerns\RecordsMedia;
use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Models\AgentWebsiteTeamMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Website settings → Team manager. Members power the public /team page,
 * per-member pages (bio + their MLS listings via mls_agent_id) and the
 * auto-populated Team content block. Photos come from the site's Media
 * Library (a path string); direct file uploads are registered there too.
 */
class TeamController extends Controller
{
    use RecordsMedia;

    public function index(AgentWebsite $agentWebsite): JsonResponse
    {
        return response()->json([
            'members' => $agentWebsite->teamMembers()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (AgentWebsiteTeamMember $m) => $this->payload($m)),
        ]);
    }

    public function store(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $this->validated($request);

        $member = $agentWebsite->teamMembers()->create([
            ...$validated,
            'slug' => $this->uniqueSlug($agentWebsite, $validated['name']),
            'photo' => $this->resolvePhoto($request, $agentWebsite),
            'sort_order' => (int) ($agentWebsite->teamMembers()->max('sort_order') ?? 0) + 1,
        ]);

        return response()->json(['success' => true, 'member' => $this->payload($member)], 201);
    }

    public function update(Request $request, AgentWebsite $agentWebsite, AgentWebsiteTeamMember $member): JsonResponse
    {
        abort_unless($member->agent_website_id === $agentWebsite->id, 404);

        $validated = $this->validated($request);

        // A new upload, a Media Library pick, or an explicit clear ('') all
        // update the photo; an absent key leaves it untouched.
        $photo = $this->resolvePhoto($request, $agentWebsite);
        if ($photo !== null || ($request->has('photo') && $request->input('photo') === null)) {
            $this->deleteLegacyPhoto($member);
            $validated['photo'] = $photo;
        }

        // Renames keep the slug stable (links/SEO) unless explicitly regenerated.
        $member->update($validated);

        return response()->json(['success' => true, 'member' => $this->payload($member->fresh())]);
    }

    public function destroy(AgentWebsite $agentWebsite, AgentWebsiteTeamMember $member): JsonResponse
    {
        abort_unless($member->agent_website_id === $agentWebsite->id, 404);

        $this->deleteLegacyPhoto($member);
        $member->delete();

        return response()->json(['success' => true]);
    }

    /** Persist a drag-reordered id list. */
    public function reorder(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
        ]);

        foreach (array_values($validated['ids']) as $i => $id) {
            $agentWebsite->teamMembers()->whereKey($id)->update(['sort_order' => $i + 1]);
        }

        return response()->json(['success' => true]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'title' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            // Rich-text HTML from the Team manager's bio editor.
            'bio' => 'nullable|string|max:20000',
            'mls_agent_id' => 'nullable|string|max:100',
            'is_active' => 'sometimes|boolean',
            'socials' => 'nullable|array',
            'socials.*' => 'nullable|url|max:500',
        ]);
    }

    /**
     * The photo to set: a direct file upload (stored + registered in the
     * Media Library) or a Media Library path/URL string. Null when the
     * request doesn't change the photo.
     */
    private function resolvePhoto(Request $request, AgentWebsite $agentWebsite): ?string
    {
        if ($request->hasFile('photo')) {
            $request->validate(['photo' => 'image|max:5120']);
            $path = $request->file('photo')->store('agent-websites/library/'.$agentWebsite->id, 'public');
            $this->recordMedia($agentWebsite, $path, $request->file('photo'));

            return $path;
        }

        $value = $request->input('photo');
        if (! is_string($value) || trim($value) === '') {
            return null;
        }
        $value = ltrim(Str::after($value, '/storage/'), '/');

        // Only accept URLs or paths that actually exist on the public disk —
        // the picker hands back Media Library paths.
        if (Str::startsWith($value, ['http://', 'https://']) || Storage::disk('public')->exists($value)) {
            return $value;
        }

        return null;
    }

    /**
     * Remove a replaced/deleted member photo from disk — only legacy
     * `team-photos/` uploads, never shared Media Library assets.
     */
    private function deleteLegacyPhoto(AgentWebsiteTeamMember $member): void
    {
        if ($member->photo && Str::startsWith($member->photo, 'team-photos/')) {
            Storage::disk('public')->delete($member->photo);
        }
    }

    private function uniqueSlug(AgentWebsite $site, string $name): string
    {
        $base = Str::slug($name) ?: 'member';
        $slug = $base;
        $i = 2;
        while ($site->teamMembers()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    private function payload(AgentWebsiteTeamMember $m): array
    {
        return [
            'id' => $m->id,
            'name' => $m->name,
            'slug' => $m->slug,
            'title' => $m->title,
            'photo' => $m->photo
                ? (Str::startsWith($m->photo, ['http://', 'https://']) ? $m->photo : Storage::disk('public')->url($m->photo))
                : null,
            'phone' => $m->phone,
            'email' => $m->email,
            'bio' => $m->bio,
            'socials' => (object) ($m->socials ?? []),
            'mls_agent_id' => $m->mls_agent_id,
            'sort_order' => $m->sort_order,
            'is_active' => $m->is_active,
        ];
    }
}
