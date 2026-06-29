<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AgentWebsite;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Website translations: the editor settings API (language whitelist) and the
 * public surface (topbar language button + "Choose your language" modal +
 * Google Translate plumbing), shown only when enabled with languages picked.
 */
class TranslationsTest extends TestCase
{
    use RefreshDatabase;

    private function makeSite(array $translations = []): array
    {
        $user = User::factory()->create();
        $site = AgentWebsite::create([
            'user_id' => $user->id,
            'name' => 'Lang Site',
            'slug' => 'lang-site',
            'template' => 'luxury',
            'agent_name' => 'Lang Agent',
            'is_published' => true,
            'page_data' => $translations ? ['_config' => ['translations' => $translations]] : [],
        ]);

        return [$user, $site];
    }

    public function test_owner_saves_translation_settings(): void
    {
        [$user, $site] = $this->makeSite();

        $this->actingAs($user)
            ->getJson("/api/website-editor/{$site->id}/translations")
            ->assertOk()
            ->assertJsonPath('enabled', false)
            ->assertJsonStructure(['catalog' => [['code', 'label', 'native', 'flag']]]);

        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/translations-config", [
                'enabled' => true,
                'languages' => ['es', 'pt', 'fr'],
            ])
            ->assertOk();

        $this->assertSame(
            ['enabled' => true, 'languages' => ['es', 'pt', 'fr']],
            data_get($site->fresh()->page_data, '_config.translations')
        );
    }

    public function test_unknown_language_codes_are_rejected(): void
    {
        [$user, $site] = $this->makeSite();

        $this->actingAs($user)
            ->patchJson("/api/website-editor/{$site->id}/translations-config", [
                'enabled' => true,
                'languages' => ['es', 'klingon'],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['languages.1']);
    }

    public function test_public_site_shows_language_button_and_modal_when_enabled(): void
    {
        [, $site] = $this->makeSite(['enabled' => true, 'languages' => ['es', 'pt']]);

        $response = $this->get(route('agent-site.home', $site->slug));

        $response->assertOk()
            ->assertSee('Choose your language')
            ->assertSee('data-lt-open', false)       // topbar button
            ->assertSee('data-lt-lang="es"', false)  // picked languages only
            ->assertSee('data-lt-lang="pt"', false)
            ->assertDontSee('data-lt-lang="fr"', false)
            ->assertSee('translate.google.com', false);
    }

    public function test_public_site_hides_translations_when_disabled_or_empty(): void
    {
        [, $disabled] = $this->makeSite();
        $this->get(route('agent-site.home', $disabled->slug))
            ->assertOk()
            ->assertDontSee('Choose your language');

        $disabled->update(['page_data' => ['_config' => ['translations' => ['enabled' => true, 'languages' => []]]]]);
        $this->get(route('agent-site.home', $disabled->slug))
            ->assertOk()
            ->assertDontSee('Choose your language', 'enabled with no languages picked stays hidden');
    }
}
