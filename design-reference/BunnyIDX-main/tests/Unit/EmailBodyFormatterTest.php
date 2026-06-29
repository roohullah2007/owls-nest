<?php

namespace Tests\Unit;

use App\Services\Email\EmailBodyFormatter;
use Tests\TestCase;

class EmailBodyFormatterTest extends TestCase
{
    private EmailBodyFormatter $formatter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->formatter = new EmailBodyFormatter;
    }

    public function test_gmail_html_quote_is_collapsed_and_latest_reply_shows(): void
    {
        $html = <<<'HTML'
            <div dir="ltr">Thanks, that works for me!</div>
            <div class="gmail_quote">
                <div class="gmail_attr">On Fri, Jun 19, 2026 at 5:05 PM John &lt;john@example.com&gt; wrote:</div>
                <blockquote class="gmail_quote">Are we still on for tomorrow?</blockquote>
            </div>
            HTML;

        $split = $this->formatter->splitHtml($html);

        $this->assertStringContainsString('Thanks, that works for me!', $split['main']);
        $this->assertStringNotContainsString('Are we still on for tomorrow?', $split['main']);
        $this->assertStringContainsString('Are we still on for tomorrow?', $split['quoted']);
    }

    public function test_blockquote_quote_is_collapsed(): void
    {
        $html = '<p>Sounds good.</p><blockquote>Previous email text</blockquote>';

        $split = $this->formatter->splitHtml($html);

        $this->assertStringContainsString('Sounds good.', $split['main']);
        $this->assertStringNotContainsString('Previous email text', $split['main']);
        $this->assertStringContainsString('Previous email text', $split['quoted']);
    }

    public function test_plain_html_without_quote_is_unchanged(): void
    {
        $split = $this->formatter->splitHtml('<p>Just a normal message.</p>');

        $this->assertStringContainsString('Just a normal message.', $split['main']);
        $this->assertSame('', $split['quoted']);
    }

    public function test_text_on_wrote_quote_is_split(): void
    {
        $text = "Sounds good, talk soon.\n\nOn Fri, Jun 19, 2026 at 5:05 PM John <john@example.com> wrote:\n> Are we still on?";

        $split = $this->formatter->splitText($text);

        $this->assertSame('Sounds good, talk soon.', $split['main']);
        $this->assertStringStartsWith('On Fri, Jun 19, 2026', $split['quoted']);
        $this->assertStringContainsString('> Are we still on?', $split['quoted']);
    }

    public function test_text_with_gt_quote_is_split(): void
    {
        $split = $this->formatter->splitText("Yes!\n> previous message");

        $this->assertSame('Yes!', $split['main']);
        $this->assertStringContainsString('> previous message', $split['quoted']);
    }

    public function test_plain_text_without_quote_is_unchanged(): void
    {
        $split = $this->formatter->splitText('Just a normal message.');

        $this->assertSame('Just a normal message.', $split['main']);
        $this->assertSame('', $split['quoted']);
    }

    public function test_quote_only_body_falls_back_to_showing_everything(): void
    {
        // No reply text before the quote — never hide the whole message.
        $html = '<div class="gmail_quote"><blockquote>Only quoted content</blockquote></div>';

        $split = $this->formatter->splitHtml($html);

        $this->assertStringContainsString('Only quoted content', $split['main']);
        $this->assertSame('', $split['quoted']);
    }

    public function test_sanitizes_dangerous_html(): void
    {
        $dirty = '<p onclick="alert(1)">Hi</p><script>alert(2)</script><a href="javascript:alert(3)">x</a>';

        $clean = $this->formatter->sanitizeHtml($dirty);

        $this->assertStringContainsString('Hi', $clean);
        $this->assertStringNotContainsStringIgnoringCase('<script', $clean);
        $this->assertStringNotContainsString('onclick', $clean);
        $this->assertStringNotContainsString('javascript:', $clean);
    }

    public function test_format_flags_quoted_and_prefers_html(): void
    {
        $result = $this->formatter->format(
            '<div>Reply</div><div class="gmail_quote">Old thread</div>',
            "Reply\nOn Mon wrote:\n> Old thread",
        );

        $this->assertTrue($result['has_quoted']);
        $this->assertStringContainsString('Reply', $result['html']);
        $this->assertStringContainsString('Old thread', $result['quoted_html']);
        // Text variants are still provided for the plain-text fallback path.
        $this->assertSame('Reply', $result['text']);
    }
}
