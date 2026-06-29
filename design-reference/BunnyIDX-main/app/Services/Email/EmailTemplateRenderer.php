<?php

declare(strict_types=1);

namespace App\Services\Email;

use App\Models\EmailTemplate;
use App\Models\User;

/**
 * Resolves the template for a type (per-user override → system override →
 * code default), interpolates `{{ variable }}` placeholders with HTML-escaped
 * values, and sanitises the result so a stored override can never inject
 * scripts. The editor UI ships later; this layer is what makes that safe.
 */
class EmailTemplateRenderer
{
    /**
     * @param  array<string, string|null>  $vars
     * @return array{subject: string, html: string}
     */
    public function render(string $type, array $vars, ?User $user = null): array
    {
        $template = $this->resolveTemplate($type, $user);

        $appName = (string) config('app.name', 'BunnyIDX');
        $vars = array_merge(['app_name' => $appName], $vars);

        $subject = $this->interpolate($template['subject'], $vars, false);
        $html = $this->sanitize($this->interpolate($template['body_html'], $vars, true));

        return ['subject' => $subject, 'html' => $html];
    }

    /**
     * @return array{subject: string, body_html: string}
     */
    private function resolveTemplate(string $type, ?User $user): array
    {
        if ($user) {
            $override = EmailTemplate::query()
                ->where('type', $type)
                ->where('is_active', true)
                ->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                    if ($user->team_id) {
                        $q->orWhere(fn ($t) => $t->whereNull('user_id')->where('team_id', $user->team_id));
                    }
                })
                ->orderByRaw('user_id is null') // prefer the user's own row over a team/system row
                ->first();

            if ($override) {
                return ['subject' => $override->subject, 'body_html' => $override->body_html];
            }
        }

        $default = DefaultEmailTemplates::get($type);

        // Unknown type should never reach here, but degrade gracefully rather
        // than fatal an outbound email.
        return $default ?? [
            'subject' => '{{ app_name }} notification',
            'body_html' => '<p>{{ app_name }}</p>',
        ];
    }

    /**
     * Replace {{ var }} tokens. Values are HTML-escaped in body context so a
     * variable can never carry markup/script into the message.
     *
     * @param  array<string, string|null>  $vars
     */
    private function interpolate(string $template, array $vars, bool $escape): string
    {
        return preg_replace_callback('/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/', function (array $m) use ($vars, $escape) {
            $value = (string) ($vars[$m[1]] ?? '');

            return $escape ? e($value) : $value;
        }, $template) ?? $template;
    }

    /**
     * Defensive sanitiser for stored template bodies: strip <script>/<style>,
     * inline event handlers, and javascript: URLs. Defaults are already safe;
     * this protects future user-authored overrides.
     */
    private function sanitize(string $html): string
    {
        $html = preg_replace('#<\s*(script|style)\b[^>]*>.*?<\s*/\s*\1\s*>#is', '', $html) ?? $html;
        // Drop on*="..." / on*='...' / on*=value event-handler attributes.
        $html = preg_replace('/\son[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html) ?? $html;
        // Neutralise javascript: in href/src.
        $html = preg_replace('/(href|src)\s*=\s*("|\')\s*javascript:[^"\']*(\2)/i', '$1=$2#$2', $html) ?? $html;

        return $html;
    }
}
