<?php

declare(strict_types=1);

namespace Tests\Feature\Email;

use App\Models\EmailTemplate;
use App\Models\User;
use App\Services\Email\EmailTemplateRenderer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailTemplateRendererTest extends TestCase
{
    use RefreshDatabase;

    private function renderer(): EmailTemplateRenderer
    {
        return app(EmailTemplateRenderer::class);
    }

    public function test_default_template_interpolates_and_escapes_variables(): void
    {
        $result = $this->renderer()->render('new_lead_notification', [
            'agent_name' => 'Pat',
            'source' => 'Website',
            'lead_name' => '<b>Spammy</b>',
            'lead_email' => 'x@y.com',
        ]);

        $this->assertStringContainsString('Pat', $result['html']);
        // HTML in a variable value is escaped, not rendered.
        $this->assertStringNotContainsString('<b>Spammy</b>', $result['html']);
        $this->assertStringContainsString('&lt;b&gt;Spammy&lt;/b&gt;', $result['html']);
    }

    public function test_stored_override_is_used_and_sanitised(): void
    {
        $user = User::factory()->create();

        EmailTemplate::create([
            'user_id' => $user->id,
            'type' => 'new_lead_notification',
            'subject' => 'Lead: {{ lead_name }}',
            'body_html' => '<script>alert(1)</script><p onclick="steal()">Hi {{ agent_name }}</p>',
            'is_active' => true,
        ]);

        $result = $this->renderer()->render('new_lead_notification', [
            'agent_name' => 'Pat',
            'lead_name' => 'Sam',
        ], $user);

        $this->assertSame('Lead: Sam', $result['subject']);
        // Script tag and inline event handler are stripped.
        $this->assertStringNotContainsString('<script', $result['html']);
        $this->assertStringNotContainsString('onclick', $result['html']);
        $this->assertStringContainsString('Hi Pat', $result['html']);
    }

    public function test_unknown_user_falls_back_to_default_template(): void
    {
        // No override → code default is used (subject mentions the app name token resolved).
        $result = $this->renderer()->render('password_reset', [
            'name' => 'Pat',
            'action_url' => 'https://example.com/reset',
            'expire_minutes' => '60',
        ]);

        $this->assertStringContainsString('Reset', $result['subject']);
        $this->assertStringContainsString('https://example.com/reset', $result['html']);
    }
}
