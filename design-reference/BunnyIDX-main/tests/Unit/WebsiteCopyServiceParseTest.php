<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Ai\AiClient;
use App\Services\Ai\WebsiteCopyService;
use Tests\TestCase;

/**
 * Gemini regularly returns JSON whose string values contain literal newlines
 * (e.g. a two-paragraph bio) — invalid JSON. WebsiteCopyService must repair
 * and parse it instead of surfacing "Failed to parse AI response."
 */
class WebsiteCopyServiceParseTest extends TestCase
{
    private function serviceReturning(string $raw): WebsiteCopyService
    {
        $ai = $this->mock(AiClient::class);
        $ai->shouldReceive('isConfigured')->andReturn(true);
        $ai->shouldReceive('sendMessage')->andReturn(['text' => $raw]);

        return app(WebsiteCopyService::class);
    }

    public function test_team_bio_parses_json_with_literal_newlines_inside_the_string(): void
    {
        // The exact failure shape from the field: pretty-printed JSON with a
        // raw blank line between two paragraphs inside the "value" string.
        $raw = "{\n  \"value\": \"First paragraph about Maria.\n\nSecond paragraph inviting you to connect.\"\n}";

        $result = $this->serviceReturning($raw)->generateTeamBio(['name' => 'Maria Lopez']);

        $this->assertArrayNotHasKey('error', $result);
        // Plain-text replies are normalized to the bio editor's HTML paragraphs.
        $this->assertSame(
            '<p>First paragraph about Maria.</p><p>Second paragraph inviting you to connect.</p>',
            $result['value']
        );
    }

    public function test_team_bio_still_parses_clean_json(): void
    {
        $result = $this->serviceReturning('{"value": "One clean paragraph."}')
            ->generateTeamBio(['name' => 'Maria Lopez']);

        $this->assertSame('<p>One clean paragraph.</p>', $result['value']);
    }

    public function test_team_bio_keeps_simple_html_and_strips_the_rest(): void
    {
        $result = $this->serviceReturning('{"value": "<p>Maria serves <strong>Brickell</strong>.</p><script>alert(1)</script><h1>Nope</h1>"}')
            ->generateTeamBio(['name' => 'Maria Lopez']);

        $this->assertSame('<p>Maria serves <strong>Brickell</strong>.</p>alert(1)Nope', $result['value']);
    }
}
