<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\LandingPage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LandingPageTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        // Landing pages are a paid 'websites' feature — arrange an entitled user.
        $this->user = User::factory()->create(['subscription_tier' => 'enterprise']);
    }

    public function test_index_requires_auth(): void
    {
        $this->get(route('crm.landing-pages.index'))->assertRedirect(route('login'));
    }

    public function test_index_lists_pages(): void
    {
        $this->actingAs($this->user)->get(route('crm.landing-pages.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Crm/LandingPages/Index')
                ->has('pages')
            );
    }

    public function test_create_screen_groups_presets_under_designs(): void
    {
        $this->actingAs($this->user)->get(route('crm.landing-pages.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Crm/LandingPages/Create')
                // Two designs: classic (5 presets) and video-landing (2 presets).
                ->has('designs', 2)
                ->where('designs.0.id', 'classic')
                ->has('designs.0.presets', 5)
                ->where('designs.0.presets.0.key', 'home-value')
                ->where('designs.1.id', 'video-landing')
                ->has('designs.1.presets', 2)
                ->where('designs.1.presets.0.key', 'listing-masterclass')
            );
    }

    public function test_video_landing_preset_creates_page_and_renders(): void
    {
        $this->actingAs($this->user)
            ->post(route('crm.landing-pages.store'), ['template' => 'listing-masterclass']);

        $page = LandingPage::first();
        $this->assertNotNull($page);
        $this->assertSame('video-landing', $page->template);
        // Video Landing block set: hero-video → benefits → … → cta.
        $this->assertSame('hero-video', $page->page_data['blocks'][0]['type']);
        $this->assertContains('authority', array_column($page->page_data['blocks'], 'type'));

        $page->update(['is_published' => true]);
        $this->get(route('landing.show', $page->slug))
            ->assertOk()
            ->assertSee('Sell for Top Dollar', false);
    }

    public function test_store_creates_page_from_default_template_with_blocks(): void
    {
        // No template passed → defaults to the single configured template.
        $response = $this->actingAs($this->user)
            ->post(route('crm.landing-pages.store'), []);

        $page = LandingPage::first();
        $this->assertNotNull($page);
        $this->assertSame('seller', $page->type);
        $this->assertSame('classic', $page->template);
        $this->assertSame($this->user->id, $page->user_id);
        $this->assertFalse($page->is_published);
        // Seeded the full sell flow (hero → steps → about → testimonials → calculator → video-testimonials → video → cta).
        $this->assertCount(8, $page->page_data['blocks']);
        $this->assertSame('hero', $page->page_data['blocks'][0]['type']);

        $response->assertRedirect(route('crm.landing-pages.edit', $page->uuid));
    }

    public function test_generate_creates_page_falling_back_to_template_without_ai(): void
    {
        // AI is not configured in tests, so generate falls back to the base template.
        $response = $this->actingAs($this->user)
            ->post(route('crm.landing-pages.generate'), ['prompt' => 'Sellers in Tampa, 1.5% listing fee, free staging.']);

        $page = LandingPage::first();
        $this->assertNotNull($page);
        $this->assertCount(8, $page->page_data['blocks']);
        $response->assertRedirect(route('crm.landing-pages.edit', $page->uuid));
    }

    public function test_generate_requires_a_prompt(): void
    {
        $this->actingAs($this->user)
            ->post(route('crm.landing-pages.generate'), [])
            ->assertSessionHasErrors('prompt');
    }

    public function test_generate_rejects_short_or_meaningless_prompts(): void
    {
        // Empty, whitespace-only, single char, and too-short prompts must all be
        // rejected — and no landing page may be created when validation fails.
        $invalid = ['', '   ', 's', '          ', 'sell home', 'Tampa 2% fee'];

        foreach ($invalid as $prompt) {
            $this->actingAs($this->user)
                ->post(route('crm.landing-pages.generate'), ['prompt' => $prompt])
                ->assertSessionHasErrors('prompt');
        }

        $this->assertSame(0, LandingPage::count(), 'No landing page should be created for an invalid AI prompt.');
    }

    public function test_generate_accepts_a_meaningful_prompt(): void
    {
        $this->actingAs($this->user)
            ->post(route('crm.landing-pages.generate'), [
                'prompt' => 'Create a page for sellers in Tampa offering a 2% listing fee with free valuation',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertSame(1, LandingPage::count());
    }

    public function test_created_page_gets_image_category_and_valid_images(): void
    {
        // The seed template references images that don't exist on disk; create must
        // store the image category and replace those broken paths with usable URLs.
        $this->actingAs($this->user)
            ->post(route('crm.landing-pages.store'), ['template' => 'home-value'])
            ->assertRedirect();

        $page = LandingPage::first();
        $this->assertSame('seller', $page->page_data['_config']['image_category'] ?? null);

        $blocks = collect($page->page_data['blocks']);
        $this->assertStringStartsWith('http', $blocks->firstWhere('type', 'hero')['data']['image']);
        $this->assertStringStartsWith('http', $blocks->firstWhere('type', 'about')['data']['photo']);
        $this->assertStringStartsWith('http', $blocks->firstWhere('type', 'cta')['data']['image']);

        // Broken testimonial avatars are cleared so the React render shows initials.
        foreach ($blocks->firstWhere('type', 'testimonials')['data']['items'] as $item) {
            $this->assertSame('', $item['image'] ?? 'unset');
        }
    }

    public function test_update_fixes_broken_and_empty_images(): void
    {
        $page = $this->makePage(['is_published' => true]);

        $this->actingAs($this->user)->patch(route('crm.landing-pages.update', $page->uuid), [
            'name' => $page->name,
            'accent_color' => '#1693C9',
            'is_published' => true,
            'page_data' => [
                '_config' => ['image_category' => 'luxury'],
                'blocks' => [
                    ['id' => 'hero', 'type' => 'hero', 'data' => ['image' => '']],
                    ['id' => 'about', 'type' => 'about', 'data' => ['photo' => 'landing-pages/templates/missing.webp']],
                    ['id' => 't', 'type' => 'testimonials', 'data' => ['items' => [['quote' => 'x', 'image' => 'landing-pages/templates/missing.webp']]]],
                ],
            ],
        ])->assertRedirect();

        $page->refresh();
        $blocks = collect($page->page_data['blocks']);
        $this->assertStringStartsWith('http', $blocks->firstWhere('type', 'hero')['data']['image']);
        $this->assertStringStartsWith('http', $blocks->firstWhere('type', 'about')['data']['photo']);
        $this->assertSame('', $blocks->firstWhere('type', 'testimonials')['data']['items'][0]['image']);
        $this->assertSame('luxury', $page->page_data['_config']['image_category']);
    }

    public function test_store_rejects_unknown_template(): void
    {
        $this->actingAs($this->user)
            ->post(route('crm.landing-pages.store'), ['template' => 'nope'])
            ->assertSessionHasErrors('template');
    }

    public function test_update_saves_settings_and_blocks(): void
    {
        $page = $this->makePage();

        $this->actingAs($this->user)->patch(route('crm.landing-pages.update', $page->uuid), [
            'name' => 'My Home Value Funnel',
            'accent_color' => '#7C36EE',
            'agent_name' => 'Jane Agent',
            'agent_email' => 'jane@example.com',
            'agent_phone' => '305-555-0100',
            'meta_title' => 'Home Value',
            'meta_description' => 'Free valuation',
            'is_published' => true,
            'page_data' => ['blocks' => [
                ['id' => 'hero', 'type' => 'hero', 'data' => ['headline' => 'Custom Headline']],
            ]],
        ])->assertRedirect();

        $page->refresh();
        $this->assertSame('My Home Value Funnel', $page->name);
        $this->assertSame('#7C36EE', $page->accent_color);
        $this->assertTrue($page->is_published);
        $this->assertSame('Custom Headline', $page->page_data['blocks'][0]['data']['headline']);
    }

    public function test_cannot_edit_another_users_page(): void
    {
        $other = LandingPage::create([
            'user_id' => User::factory()->create()->id,
            'slug' => LandingPage::generateSlug('Other'),
            'name' => 'Other', 'type' => 'seller', 'template' => 'classic',
            'page_data' => ['blocks' => []],
        ]);

        $this->actingAs($this->user)->get(route('crm.landing-pages.edit', $other->uuid))->assertForbidden();
    }

    public function test_public_page_renders_when_published(): void
    {
        $page = $this->makePage(['is_published' => true]);

        // The public page is now a React SPA: the server emits the #lp-root mount
        // node + JSON payload (block content, incl. the hero headline) and mounts
        // the bundle — there is no server-rendered Blade block HTML.
        $this->get("/l/{$page->slug}")
            ->assertOk()
            ->assertSee('id="lp-root"', false)
            ->assertSee('data-page=', false)
            ->assertSee('Save Time and Commission', false);
    }

    public function test_public_page_404_when_draft_and_not_owner(): void
    {
        $page = $this->makePage(['is_published' => false]);

        $this->get("/l/{$page->slug}")->assertNotFound();
    }

    public function test_public_owner_can_preview_draft(): void
    {
        $page = $this->makePage(['is_published' => false]);

        $this->actingAs($this->user)->get("/l/{$page->slug}")->assertOk();
    }

    public function test_flow_renders_react_shell_in_flow_mode(): void
    {
        $page = $this->makePage(['is_published' => true]);

        // The full-screen lead flow is also a React SPA now (flow mode payload).
        $this->get(route('landing.flow', ['slug' => $page->slug, 'address' => '1 Test St']))
            ->assertOk()
            ->assertSee('id="lp-root"', false)
            ->assertSee('"mode":"flow"', false);
    }

    public function test_form_submission_creates_contact_lead_with_address(): void
    {
        $page = $this->makePage(['is_published' => true]);

        $this->post("/l/{$page->slug}", [
            'name' => 'John Seller',
            'email' => 'john@seller.com',
            'phone' => '305-555-1234',
            'address' => '123 Brickell Ave, Miami, FL',
            'consent' => true,
            'utm_source' => 'google',
            'utm_medium' => 'cpc',
            'utm_campaign' => 'spring-sell',
        ])->assertRedirect();

        $contact = Contact::where('email', 'john@seller.com')->first();
        $this->assertNotNull($contact);
        $this->assertSame('John', $contact->first_name);
        $this->assertSame('Seller', $contact->last_name);
        $this->assertSame('Landing Page', $contact->source);
        $this->assertSame('seller', $contact->type);
        $this->assertSame('123 Brickell Ave, Miami, FL', $contact->address);
        $this->assertStringContainsString('123 Brickell Ave', (string) $contact->description);
        $this->assertSame('google', $contact->custom_fields['utm_source'] ?? null);
        $this->assertSame('spring-sell', $contact->custom_fields['utm_campaign'] ?? null);
        $this->assertSame($this->user->id, $contact->user_id);

        $this->assertSame(1, $page->fresh()->submissions_count);
    }

    public function test_submission_fires_configured_webhook(): void
    {
        Http::fake();
        $page = $this->makePage([
            'is_published' => true,
            'page_data' => ['blocks' => [], '_config' => ['webhook_url' => 'https://hooks.example.com/lp']],
        ]);

        $this->post("/l/{$page->slug}", [
            'name' => 'Jane Lead',
            'email' => 'jane@lead.com',
            'utm_source' => 'facebook',
        ])->assertRedirect();

        Http::assertSent(function ($request) {
            return $request->url() === 'https://hooks.example.com/lp'
                && $request['event'] === 'landing_page.lead'
                && $request['lead']['email'] === 'jane@lead.com'
                && ($request['attribution']['utm_source'] ?? null) === 'facebook';
        });
    }

    public function test_submission_blocked_on_unpublished_page(): void
    {
        $page = $this->makePage(['is_published' => false]);

        $this->post("/l/{$page->slug}", ['name' => 'X', 'email' => 'x@y.com'])->assertNotFound();
    }

    public function test_can_upload_and_list_media(): void
    {
        Storage::fake('public');
        $page = $this->makePage();

        $this->actingAs($this->user)
            ->post(route('crm.landing-pages.media.upload', $page->uuid), [
                'file' => UploadedFile::fake()->image('photo.jpg', 800, 600),
            ])
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->assertSame(1, $page->media()->count());
        $media = $page->media()->first();
        Storage::disk('public')->assertExists($media->path);

        // The library upload is listed first (newest), ahead of in-use template images.
        $this->actingAs($this->user)
            ->getJson(route('crm.landing-pages.media', $page->uuid))
            ->assertOk()
            ->assertJsonPath('images.0.path', $media->path);
    }

    public function test_can_delete_media(): void
    {
        Storage::fake('public');
        $page = $this->makePage();

        $this->actingAs($this->user)->post(route('crm.landing-pages.media.upload', $page->uuid), [
            'file' => UploadedFile::fake()->image('photo.jpg'),
        ])->assertOk();
        $media = $page->media()->first();

        $this->actingAs($this->user)
            ->deleteJson(route('crm.landing-pages.media.delete', $page->uuid), ['path' => $media->path])
            ->assertOk();

        $this->assertSame(0, $page->fresh()->media()->count());
        Storage::disk('public')->assertMissing($media->path);
    }

    public function test_cannot_upload_media_to_another_users_page(): void
    {
        Storage::fake('public');
        $other = LandingPage::create([
            'user_id' => User::factory()->create()->id,
            'slug' => LandingPage::generateSlug('Other'),
            'name' => 'Other', 'type' => 'seller', 'template' => 'classic',
            'page_data' => ['blocks' => []],
        ]);

        $this->actingAs($this->user)
            ->post(route('crm.landing-pages.media.upload', $other->uuid), ['file' => UploadedFile::fake()->image('x.jpg')])
            ->assertForbidden();
    }

    private function makePage(array $attrs = []): LandingPage
    {
        $tpl = config('landing-page-templates.home-value');

        return LandingPage::create(array_merge([
            'user_id' => $this->user->id,
            'slug' => LandingPage::generateSlug('Home Value Page'),
            'name' => 'Home Value Page',
            'type' => 'seller',
            'template' => 'classic',
            'accent_color' => '#1693C9',
            'agent_name' => $this->user->name,
            'page_data' => ['blocks' => $tpl['defaults']['blocks']],
            'is_published' => false,
        ], $attrs));
    }
}
