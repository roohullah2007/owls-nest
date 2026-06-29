<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor;

use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BlogController extends Controller
{
    /** List the site's blog posts, newest first. */
    public function listBlogPosts(AgentWebsite $agentWebsite): JsonResponse
    {
        $posts = $agentWebsite->blogPosts()->orderByDesc('created_at')->get();

        return response()->json(['posts' => $posts]);
    }

    /** Create a blog post (auto-generates a unique slug). */
    public function storeBlogPost(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'excerpt' => 'nullable|string|max:500',
            'category' => 'nullable|string|max:100',
            'body' => 'required|string|max:100000',
            'featured_image' => 'nullable|string|max:500',
            'status' => 'required|in:draft,published',
            'published_at' => 'nullable|date',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
        ]);

        $slug = $validated['slug']
            ? BlogPost::generateSlug($validated['slug'], $agentWebsite->id)
            : BlogPost::generateSlug($validated['title'], $agentWebsite->id);

        $post = $agentWebsite->blogPosts()->create([
            'title' => $validated['title'],
            'slug' => $slug,
            'excerpt' => $validated['excerpt'] ?? null,
            'category' => ($validated['category'] ?? null) !== null ? trim($validated['category']) ?: null : null,
            'body' => $validated['body'],
            'featured_image' => $validated['featured_image'] ?? null,
            'status' => $validated['status'],
            'published_at' => $validated['status'] === 'published'
                ? ($validated['published_at'] ?? now())
                : $validated['published_at'],
            'meta_title' => $validated['meta_title'] ?? null,
            'meta_description' => $validated['meta_description'] ?? null,
        ]);

        return response()->json(['success' => true, 'post' => $post], 201);
    }

    /** Update a blog post; re-slugs on slug change and auto-sets published_at on first publish. */
    public function updateBlogPost(Request $request, AgentWebsite $agentWebsite, BlogPost $blogPost): JsonResponse
    {
        abort_unless($blogPost->agent_website_id === $agentWebsite->id, 404);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'slug' => 'nullable|string|max:255',
            'excerpt' => 'nullable|string|max:500',
            'category' => 'nullable|string|max:100',
            'body' => 'sometimes|string|max:100000',
            'featured_image' => 'nullable|string|max:500',
            'status' => 'sometimes|in:draft,published',
            'published_at' => 'nullable|date',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
        ]);

        if (isset($validated['slug']) && $validated['slug'] !== $blogPost->slug) {
            $validated['slug'] = BlogPost::generateSlug($validated['slug'], $agentWebsite->id);
        }

        // Auto-set published_at when publishing for the first time
        if (isset($validated['status']) && $validated['status'] === 'published' && ! $blogPost->published_at) {
            $validated['published_at'] = $validated['published_at'] ?? now();
        }

        $blogPost->update($validated);

        return response()->json(['success' => true, 'post' => $blogPost->fresh()]);
    }

    /** Delete a blog post and its featured image. */
    public function deleteBlogPost(AgentWebsite $agentWebsite, BlogPost $blogPost): JsonResponse
    {
        abort_unless($blogPost->agent_website_id === $agentWebsite->id, 404);

        if ($blogPost->featured_image) {
            Storage::disk('public')->delete($blogPost->featured_image);
        }

        $blogPost->delete();

        return response()->json(['success' => true]);
    }
}
