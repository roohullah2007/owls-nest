<?php

declare(strict_types=1);

namespace App\Services\Ai;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WebsiteCopyService
{
    private const AI_FIELDS = [
        'agent_tagline',
        'agent_bio',
        'hero_headline',
        'hero_subtitle',
        'buy_headline',
        'buy_description',
        'sell_headline',
        'sell_description',
        'about_extended',
        'meta_title',
        'meta_description',
    ];

    public function __construct(
        private AiClient $ai,
    ) {}

    /**
     * Generate all website copy fields from a freeform description.
     *
     * @param  array{agent_name: string, agent_city?: string, agent_state?: string, agent_title?: string, brokerage_name?: string, template: string, description: string}  $context
     * @return array{copy: array<string, string>}|array{error: string}
     */
    public function generateAllCopy(array $context): array
    {
        if (! $this->ai->isConfigured()) {
            return ['error' => 'AI is not configured. Add GEMINI_API_KEY to your .env file.'];
        }

        $system = $this->buildBulkSystemPrompt($context['template']);
        $user = $this->buildBulkUserPrompt($context);

        $result = $this->ai->sendMessage($system, $user, 3000);

        if (isset($result['error'])) {
            return $result;
        }

        $parsed = $this->parseJson($result['text']);

        if (! is_array($parsed)) {
            return ['error' => 'Failed to parse AI response.'];
        }

        // Accept either a nested {copy: {...}} or a flat object with the fields directly
        $copy = $parsed['copy'] ?? $parsed;

        // Filter to only valid fields
        $filtered = [];
        foreach (self::AI_FIELDS as $field) {
            if (isset($copy[$field]) && is_string($copy[$field])) {
                $filtered[$field] = $copy[$field];
            }
        }

        if (empty($filtered)) {
            return ['error' => 'AI did not return any valid content fields.'];
        }

        return ['copy' => $filtered];
    }

    /**
     * Generate or rewrite a single content field.
     *
     * @param  array{agent_name?: string, agent_city?: string, template?: string, current_value?: string}  $context
     * @return array{value: string}|array{error: string}
     */
    public function generateField(string $field, array $context): array
    {
        if (! in_array($field, self::AI_FIELDS, true)) {
            return ['error' => "Field '{$field}' is not eligible for AI generation."];
        }

        if (! $this->ai->isConfigured()) {
            return ['error' => 'AI is not configured. Add GEMINI_API_KEY to your .env file.'];
        }

        $system = $this->buildFieldSystemPrompt($field, $context['template'] ?? 'luxury');
        $user = $this->buildFieldUserPrompt($field, $context);

        $result = $this->ai->sendMessage($system, $user, 800);

        if (isset($result['error'])) {
            return $result;
        }

        $parsed = $this->parseJson($result['text']);

        if (is_array($parsed) && isset($parsed['value']) && is_string($parsed['value'])) {
            return ['value' => $parsed['value']];
        }

        // If the AI returned plain text instead of JSON, use it directly
        $text = trim($result['text']);
        $text = preg_replace('/^["\']+|["\']+$/', '', $text);
        if (strlen($text) > 0 && strlen($text) < 2000) {
            return ['value' => $text];
        }

        return ['error' => 'Failed to parse AI response.'];
    }

    /**
     * SEO community-guide description for a website community page.
     *
     * The copy is grounded in the community's real MLS configuration (passed
     * in $context) and written with merge variables — {listings_count},
     * {price_range}, {property_links}, {sub_area_links}, {search_link} — that
     * AreaDescription resolves to live MLS data and internal links at render
     * time, so the description never goes stale and cross-links the
     * community's property-type and sub-area pages.
     *
     * @param  array{name: string, location?: ?string, cities?: string[], counties?: string[], neighborhoods?: string[], zips?: string[], property_types?: string[], min_price?: mixed, max_price?: mixed, listings_count?: ?int, lifestyle_pages?: array<int, array{key: string, label: string}>, sub_areas?: array<int, array{slug: string, label: string}>, brokerage_name?: ?string, template?: ?string, current_value?: ?string}  $context
     * @return array{value: string}|array{error: string}
     */
    public function generateCommunityDescription(array $context): array
    {
        if (! $this->ai->isConfigured()) {
            return ['error' => 'AI is not configured. Add GEMINI_API_KEY to your .env file.'];
        }

        $tone = $this->getToneDirective($context['template'] ?? 'luxury');

        $hasPrice = ! empty($context['min_price']) || ! empty($context['max_price']);
        $hasTypes = ! empty($context['lifestyle_pages']);
        $hasSubs = ! empty($context['sub_areas']);

        // Only offer the variables this community can actually resolve.
        $vars = [
            '- {community} → the community name',
            '- {location} → the cities/counties the community spans',
            '- {listings_count} → the live number of active MLS listings here (renders as a number, e.g. "147")',
            '- {search_link} → a ready-made link that reads "search all homes for sale in <community>"',
        ];
        if ($hasPrice) {
            $vars[] = '- {price_range} → the community price range as a phrase, e.g. "from $500,000 to $2,000,000" (use after a word like "priced")';
        }
        if ($hasTypes) {
            $vars[] = '- {property_links} → a linked list of this community\'s property-type pages with live listing counts, e.g. "Condos (24), Waterfront Homes (8) and Golf Homes (3)"';
        }
        if ($hasSubs) {
            $vars[] = '- {sub_area_links} → a linked list of the neighborhood / city / ZIP sub-pages inside this community';
        }
        $varBlock = implode("\n", $vars);

        $market = '<h3>The {community} Real Estate Market</h3> — MUST contain {listings_count}, e.g. "There are currently {listings_count} homes for sale in {community}".';
        if ($hasPrice) {
            $market .= ' MUST also use {price_range}.';
        }
        if ($hasTypes) {
            $market .= ' End it by inviting the reader to browse by property type — MUST contain {property_links}.';
        }
        $structure = [
            '1. Intro — one opening paragraph, NO heading: what and where the community is and the strongest reason buyers look there. Hook the reader and naturally include "{community} homes for sale".',
            '2. <h3>Living in {community}</h3> — lifestyle, character of the area and the kind of homes/buyers it suits. Only generic, defensible statements grounded in COMMUNITY DATA.',
            "3. {$market}",
            '4. <h3>Schools &amp; Education</h3> — ONLY widely-known, verifiable general facts (e.g. the public school district serving the area, that public/private/charter options exist). NEVER invent school names, ratings, test scores or rankings. If you are not certain of specifics, write about choosing the right school zone with the agent\'s local guidance instead.',
        ];
        $explore = '5. <h3>Explore {community}</h3> — final short section.';
        if ($hasSubs) {
            $explore .= ' MUST contain {sub_area_links}.';
        }
        $explore .= ' Close with {search_link} (it already renders as a full call-to-action link).';
        $structure[] = $explore;
        $structureBlock = implode("\n", $structure);

        // Inline internal-link targets: placeholder hrefs the AI may weave
        // into the body; AreaDescription rewrites them to real URLs at render
        // time (so links survive slug changes and never 404).
        $linkLines = ['- href="#search" → the live property-search page for this community'];
        foreach (array_slice((array) ($context['lifestyle_pages'] ?? []), 0, 20) as $lp) {
            if (is_array($lp) && isset($lp['key'], $lp['label'])) {
                $linkLines[] = '- href="#page:'.$lp['key'].'" → the "'.$lp['label'].'" page';
            }
        }
        foreach (array_slice((array) ($context['sub_areas'] ?? []), 0, 25) as $sa) {
            if (is_array($sa) && isset($sa['slug'], $sa['label'])) {
                $linkLines[] = '- href="#sub:'.$sa['slug'].'" → the "'.$sa['label'].'" page';
            }
        }
        $linkBlock = implode("\n", $linkLines);

        $system = <<<PROMPT
You are an expert real-estate SEO copywriter. Write the community-guide description for a community page on a real estate agent's website. The page already shows live MLS listings below your copy — your text is the editorial guide above them, and it is what search engines read for "<community> homes for sale" queries.

TONE: {$tone}

HARD RULES
- Ground EVERY claim in the COMMUNITY DATA provided plus widely-known, verifiable facts about the area. Never invent statistics, school ratings, crime data, population figures, commute times, builders or prices that are not in the data or common knowledge. Generic, defensible statements about lifestyle and housing are fine; specific fabricated facts are not.
- Use the merge variables below VERBATIM, curly braces included. They are replaced with live MLS data and internal links when the page renders — this keeps the copy accurate forever and builds internal links to the community's sub-pages. Do not wrap them in quotes, links or tags, and never invent variables that are not listed.
- Write for a home buyer first; weave in search phrases like "<community> homes for sale", "<community> real estate" and "living in <community>" naturally, without keyword stuffing.
- 280–450 words across all sections. Sections are short — 2-4 sentences each.
- FORMAT: simple HTML, single line. Allowed tags ONLY: <p>, <h3>, <strong>, <em>, <a>. Every paragraph wrapped in <p>…</p>, every section title in <h3>…</h3>. No markdown, no other tags, no inline styles, no emoji.

MERGE VARIABLES AVAILABLE FOR THIS COMMUNITY
{$varBlock}

INTERNAL LINK TARGETS
Where it genuinely helps the reader, weave 2–5 of these into the body as natural inline anchors — e.g. <a href="#page:condos">condos in <community></a> or <a href="#sub:south-beach">South Beach</a>. Use the href values EXACTLY as listed (they are rewritten to real URLs at render time). NEVER use any other href, and never wrap merge variables in anchors.
{$linkBlock}

STRUCTURE (follow exactly — intro paragraph first, then the <h3> sections in this order)
{$structureBlock}

Return ONLY a JSON object: {"value": "<p>…</p><h3>…</h3><p>…</p>…"}
PROMPT;

        $parts = ['COMMUNITY DATA', "Community: {$context['name']}"];
        foreach ([
            'cities' => 'Cities',
            'counties' => 'Counties',
            'neighborhoods' => 'Neighborhoods',
            'zips' => 'ZIP codes',
            'property_types' => 'Property types shown',
        ] as $key => $label) {
            if (! empty($context[$key]) && is_array($context[$key])) {
                $parts[] = "{$label}: ".implode(', ', array_map('strval', $context[$key]));
            }
        }
        // Structured page lists ({key|slug, label}) — the prompt only needs the labels here;
        // the INTERNAL LINK TARGETS block above carries the href placeholders.
        if ($hasTypes) {
            $parts[] = 'Property-type sub-pages ({property_links} will link these): '
                .implode(', ', array_map(fn ($lp) => is_array($lp) ? (string) ($lp['label'] ?? '') : (string) $lp, (array) $context['lifestyle_pages']));
        }
        if ($hasSubs) {
            $parts[] = 'Sub-area pages ({sub_area_links} will link these): '
                .implode(', ', array_map(fn ($sa) => is_array($sa) ? (string) ($sa['label'] ?? '') : (string) $sa, (array) $context['sub_areas']));
        }
        if (empty($context['cities']) && empty($context['counties']) && ! empty($context['location'])) {
            $parts[] = "Location: {$context['location']}";
        }
        if ($hasPrice) {
            $min = ! empty($context['min_price']) ? '$'.number_format((float) $context['min_price']) : null;
            $max = ! empty($context['max_price']) ? '$'.number_format((float) $context['max_price']) : null;
            $parts[] = 'Price range shown: '.trim(($min ? "from {$min} " : '').($max ? "up to {$max}" : ''));
        }
        if (isset($context['listings_count']) && $context['listings_count'] !== null) {
            $parts[] = "Active listings right now: {$context['listings_count']} (always write it as {listings_count}, never the raw number)";
        }
        if (! empty($context['brokerage_name'])) {
            $parts[] = "Brokerage: {$context['brokerage_name']}";
        }
        if (! empty($context['current_value'])) {
            $parts[] = "\nThe agent drafted this description:\n\"{$context['current_value']}\"";
            $parts[] = 'Refine it: keep its facts, voice and intent, fix grammar, improve flow and SEO, and restructure it to follow STRUCTURE with the merge variables woven in.';
        } else {
            $parts[] = "\nWrite a fresh description for this community following STRUCTURE.";
        }
        $user = implode("\n", $parts);

        // JSON mode → guaranteed-parseable output; thinking budget 0 → the
        // token cap is spent on the answer, not silently eaten by thinking
        // (which is what used to truncate descriptions mid-sentence).
        $result = $this->ai->sendMessage($system, $user, 6000, ['json' => true, 'thinking_budget' => 0]);

        if (isset($result['error'])) {
            return $result;
        }

        return $this->extractValue($result['text']);
    }

    /**
     * Pull {"value": "..."} out of an AI response. Never returns raw JSON
     * fragments as copy — a malformed response becomes an error the UI can
     * show, not text that ends up saved in a description field.
     *
     * @return array{value: string}|array{error: string}
     */
    private function extractValue(string $text): array
    {
        $parsed = $this->parseJson($text);
        if (is_array($parsed) && isset($parsed['value']) && is_string($parsed['value']) && trim($parsed['value']) !== '') {
            return ['value' => trim($parsed['value'])];
        }

        // Salvage a "value" string from slightly-malformed JSON.
        if (preg_match('/"value"\s*:\s*"((?:[^"\\\\]|\\\\.)*)"/s', $text, $m)) {
            $decoded = json_decode('"'.$m[1].'"');
            if (is_string($decoded) && trim($decoded) !== '') {
                return ['value' => trim($decoded)];
            }
        }

        // Plain-text answer (model ignored JSON) — accept only if it doesn't
        // look like a JSON fragment.
        $plain = trim(preg_replace('/^["\']+|["\']+$/', '', trim($text)) ?? '');
        if ($plain !== '' && ! str_starts_with($plain, '{') && ! str_contains($plain, '"value"') && strlen($plain) < 6000) {
            return ['value' => $plain];
        }

        return ['error' => 'Failed to parse AI response.'];
    }

    /**
     * Intro copy for a community lifestyle page ("Condos in Coral Gables",
     * "Waterfront Homes in …"). Short and grounded; uses the {listings_count}
     * and {search_link} merge variables, which sub-pages resolve with their
     * own slice's live data (AreaDescription::subPageHtml).
     *
     * @param  array{community: string, lifestyle: string, location?: ?string, brokerage_name?: ?string, template?: ?string, listings_count?: ?int, current_value?: ?string}  $context
     * @return array{value: string}|array{error: string}
     */
    public function generateLifestyleCopy(array $context): array
    {
        if (! $this->ai->isConfigured()) {
            return ['error' => 'AI is not configured. Add GEMINI_API_KEY to your .env file.'];
        }

        $tone = $this->getToneDirective($context['template'] ?? 'luxury');

        $system = <<<PROMPT
You are an expert real-estate SEO copywriter. Write the short intro copy for a property-type page on a real estate agent's website — "<lifestyle> in <community>". Live MLS listings for exactly that slice render directly below your copy; your text is what search engines read for "<lifestyle> for sale in <community>" queries.

TONE: {$tone}

HARD RULES
- Ground every claim in the DATA provided. Generic, defensible statements about the property type and area are fine; never invent statistics, buildings, prices or amenities not in the data.
- Use the merge variables VERBATIM, curly braces included — they are replaced with live MLS data and links at render time:
  - {listings_count} → the live number of listings on this page (a number)
  - {community} → the community name
  - {search_link} → a ready-made link that reads "search all homes for sale in <community>"
- 60–130 words, 1–2 paragraphs.
- FORMAT: simple HTML, single line. Allowed tags ONLY: <p>, <strong>, <em>, <a>.
- The ONLY allowed link is <a href="#search">…</a> (rewritten to the live property-search page at render time) — use it at most once, or use {search_link} instead.

STRUCTURE
1. What buyers get with this property type in this community — lifestyle fit, who it suits.
2. Market line — MUST contain {listings_count}, e.g. "Browse {listings_count} current listings below". Close with {search_link}.

Return ONLY a JSON object: {"value": "<p>…</p>"}
PROMPT;

        $parts = [
            'DATA',
            "Community: {$context['community']}",
            "Property type / lifestyle: {$context['lifestyle']}",
        ];
        if (! empty($context['location'])) {
            $parts[] = "Location: {$context['location']}";
        }
        if (isset($context['listings_count']) && $context['listings_count'] !== null) {
            $parts[] = "Live listings on this page right now: {$context['listings_count']} (always write it as {listings_count}, never the raw number)";
        }
        if (! empty($context['brokerage_name'])) {
            $parts[] = "Brokerage: {$context['brokerage_name']}";
        }
        if (! empty($context['current_value'])) {
            $parts[] = "\nThe agent drafted this copy:\n\"{$context['current_value']}\"";
            $parts[] = 'Refine it: keep its facts and intent, fix grammar, improve flow and SEO, and weave in the merge variables.';
        } else {
            $parts[] = "\nWrite fresh intro copy for this page following STRUCTURE.";
        }

        $result = $this->ai->sendMessage($system, implode("\n", $parts), 2500, ['json' => true, 'thinking_budget' => 0]);

        if (isset($result['error'])) {
            return $result;
        }

        return $this->extractValue($result['text']);
    }

    /**
     * Professional bio for a team member's public /team/{slug} page. Returns
     * simple HTML (<p>/<strong>/<em> — the Team manager's bio field is a
     * rich-text editor): 2-4 paragraphs grounded only in the details
     * provided; never invents sales stats, awards or years of experience.
     *
     * @param  array{name: string, title?: ?string, agent_city?: ?string, brokerage_name?: ?string, areas?: ?string, site_about?: ?string, template?: ?string, current_value?: ?string}  $context
     * @return array{value: string}|array{error: string}
     */
    public function generateTeamBio(array $context): array
    {
        if (! $this->ai->isConfigured()) {
            return ['error' => 'AI is not configured. Add GEMINI_API_KEY to your .env file.'];
        }

        $tone = $this->getToneDirective($context['template'] ?? 'luxury');

        $system = <<<PROMPT
You are an expert real-estate copywriter. Write the professional bio shown on a team member's page of a real estate team's website — the page buyers and sellers read when deciding whether to work with this person.

TONE: {$tone}

HARD RULES
- Ground every statement in the MEMBER DETAILS provided. NEVER invent sales volumes, transaction counts, years of experience, awards, designations, languages or specific past results that are not in the details. Generic, defensible statements about service, local knowledge and client care are fine.
- Third person, using the member's first name after the first mention.
- 120-200 words in 2-4 short paragraphs.
- Structure: open with who they are and what they do for clients; develop their approach and local expertise (name the market/communities when provided); close with a warm, soft invitation to reach out.
- Weave the role and market in naturally — never list them; no clichés like "passionate about real estate" or "dream home".
- SIMPLE HTML ONLY: each paragraph wrapped in <p>…</p>; <strong>/<em> sparingly (at most twice in total). No other tags, no markdown, no emoji, no headings, no links.

Return ONLY a JSON object: {"value": "<p>bio html here</p>"}
PROMPT;

        $parts = ['MEMBER DETAILS', "Name: {$context['name']}"];
        if (! empty($context['title'])) {
            $parts[] = "Role / title: {$context['title']}";
        }
        if (! empty($context['agent_city'])) {
            $parts[] = "Market / city: {$context['agent_city']}";
        }
        if (! empty($context['areas'])) {
            $parts[] = "Communities the team serves: {$context['areas']}";
        }
        if (! empty($context['brokerage_name'])) {
            $parts[] = "Brokerage / team: {$context['brokerage_name']}";
        }
        if (! empty($context['site_about'])) {
            $parts[] = "How the team describes itself (match this voice, don't copy it): \"{$context['site_about']}\"";
        }
        if (! empty($context['current_value'])) {
            $parts[] = "\nThe member drafted this bio:\n\"{$context['current_value']}\"";
            $parts[] = 'Rewrite it to the structure above: keep every fact and its intent, fix grammar, improve flow and warmth, expand thin spots with defensible service/local-knowledge copy. Do not add facts.';
        } else {
            $parts[] = "\nWrite a fresh bio from these details following the rules.";
        }

        $result = $this->ai->sendMessage($system, implode("\n", $parts), 2000, ['json' => true, 'thinking_budget' => 0]);

        if (isset($result['error'])) {
            return $result;
        }

        $value = $this->extractValue($result['text']);
        if (isset($value['value'])) {
            // Keep only the simple formatting tags the bio editor produces.
            $clean = trim(strip_tags($value['value'], '<p><br><strong><em>'));
            // A plain-text reply still gets paragraph structure.
            if ($clean !== '' && ! str_contains($clean, '<p>')) {
                $clean = '<p>'.implode('</p><p>', preg_split('/\R{2,}/', $clean)).'</p>';
            }
            $value['value'] = $clean;
        }

        return $value;
    }

    /**
     * Generate a complete SEO blog post (title, slug, excerpt, HTML body,
     * meta title/description) from a topic, localised to the agent's market.
     *
     * @param  array{topic: string, keywords?: ?string, agent_name?: ?string, agent_city?: ?string, template?: ?string, current_body?: ?string}  $context
     * @return array{post: array<string, string>}|array{error: string}
     */
    public function generateBlogPost(array $context): array
    {
        if (! $this->ai->isConfigured()) {
            return ['error' => 'AI is not configured. Add GEMINI_API_KEY to your .env file.'];
        }

        $tone = $this->getToneDirective($context['template'] ?? 'luxury');

        $system = <<<PROMPT
You are an expert real-estate content writer and SEO specialist writing a blog post for a real estate agent's website.

TONE: {$tone}

Return ONLY a JSON object with these exact keys (no markdown fences, no extra text):
{
  "title": "Compelling, search-friendly post title (50-65 characters)",
  "slug": "url-friendly-slug",
  "excerpt": "1-2 sentence hook used on the blog listing page",
  "body": "The full post as CLEAN simple HTML: <h2>/<h3> section headings, <p> paragraphs, <ul><li> lists where natural. 700-1000 words. NO <html>/<head>/<body> wrappers, no inline styles, no scripts.",
  "meta_title": "SEO title under 60 characters",
  "meta_description": "SEO meta description, 120-155 characters"
}

RULES:
- Structure for SEO: a strong opening, descriptive H2 sections, a practical takeaway/conclusion with a soft call-to-action to contact the agent.
- Localise naturally to the agent's city/market when provided; never invent specific statistics, prices or legal claims.
- Write for humans first; keywords woven naturally, never stuffed.
PROMPT;

        $parts = ["Topic: {$context['topic']}"];
        if (! empty($context['keywords'])) {
            $parts[] = "Target keywords: {$context['keywords']}";
        }
        if (! empty($context['agent_name'])) {
            $parts[] = "Agent: {$context['agent_name']}";
        }
        if (! empty($context['agent_city'])) {
            $parts[] = "Market/City: {$context['agent_city']}";
        }
        if (! empty($context['current_body'])) {
            $parts[] = "\nExisting draft to improve (rewrite it better, keep the intent):\n".mb_substr(strip_tags($context['current_body']), 0, 4000);
        }
        $user = implode("\n", $parts);

        $result = $this->ai->sendMessage($system, $user, 4000);

        if (isset($result['error'])) {
            return $result;
        }

        $parsed = $this->parseJson($result['text']);
        if (! is_array($parsed) || empty($parsed['title']) || empty($parsed['body'])) {
            return ['error' => 'Failed to parse the AI response — please try again.'];
        }

        // Whitelist + sanitize: body keeps only basic formatting tags.
        $body = strip_tags((string) $parsed['body'], '<h2><h3><p><ul><ol><li><strong><em><br><blockquote><a>');

        return ['post' => [
            'title' => mb_substr(strip_tags((string) $parsed['title']), 0, 160),
            'slug' => Str::slug((string) ($parsed['slug'] ?? $parsed['title'])),
            'excerpt' => mb_substr(strip_tags((string) ($parsed['excerpt'] ?? '')), 0, 500),
            'body' => $body,
            'meta_title' => mb_substr(strip_tags((string) ($parsed['meta_title'] ?? $parsed['title'])), 0, 70),
            'meta_description' => mb_substr(strip_tags((string) ($parsed['meta_description'] ?? '')), 0, 170),
        ]];
    }

    /**
     * Generate custom CSS for the property-search cards / listing-detail page
     * from a plain-language description. Output is constrained to the stable
     * ps-* classes the public search bundle exposes.
     *
     * @return array{value: string}|array{error: string}
     */
    public function generateCustomCss(string $prompt, ?string $currentCss = null): array
    {
        if (! $this->ai->isConfigured()) {
            return ['error' => 'AI is not configured. Add GEMINI_API_KEY to your .env file.'];
        }

        $system = <<<'PROMPT'
You are an expert front-end engineer writing custom CSS for a real-estate website's property search and listing-detail pages.

Only target these stable class hooks (plus their descendants):
- Result cards: .ps-card, .ps-card-media, .ps-card-body, .ps-card-price, .ps-card-status, .ps-card-facts, .ps-card-type, .ps-card-addr, .ps-card-mls, .ps-badge
- Card grid: .ps-card-grid
- Search header: .ps-header, .ps-header-brand, .ps-header-nav, .ps-header-link, .ps-header-cta, .ps-header-phone
- Detail page: .ps-detail-section, .ps-detail-gallery, .ps-detail-calculator, .ps-detail-courtesy, .ps-detail-compliance, .ps-comparable-card
- Footer: .site-footer and .footer-* classes

RULES:
- Return ONLY a JSON object: {"value": "/* css here */"}
- Plain CSS only — no <style> tags, no @import, no url() to external domains, no JavaScript, no expression().
- Keep it minimal and well-commented; respect that the pages are light-themed.
PROMPT;

        $user = "Request: {$prompt}";
        if ($currentCss !== null && trim($currentCss) !== '') {
            $user .= "\n\nCurrent custom CSS (extend or refine it, return the FULL resulting stylesheet):\n{$currentCss}";
        }

        $result = $this->ai->sendMessage($system, $user, 2000);

        if (isset($result['error'])) {
            return $result;
        }

        $parsed = $this->parseJson($result['text']);
        $css = is_array($parsed) && isset($parsed['value']) && is_string($parsed['value'])
            ? $parsed['value']
            : trim(preg_replace('/^```(?:css)?|```$/m', '', $result['text']) ?? '');

        if ($css === '') {
            return ['error' => 'Failed to parse AI response.'];
        }

        // Defense in depth — strip anything that could escape the <style> block.
        $css = str_ireplace(['</style', '<script', 'javascript:', 'expression('], '', $css);

        return ['value' => $css];
    }

    /**
     * "About the Project" copy for a New Development page — 3-4 short HTML
     * paragraphs grounded ONLY in the project data the editor sends.
     *
     * @param  array{name: string, area?: ?string, city?: ?string, developer?: ?string, architect?: ?string, interior_design?: ?string, status?: ?string, completion_year?: ?string, price_label?: ?string, highlights?: string[], key_details?: array<int, array{label: string, value: string}>, template?: ?string, current_value?: ?string}  $context
     * @return array{value: string}|array{error: string}
     */
    public function generateDevelopmentDescription(array $context): array
    {
        if (! $this->ai->isConfigured()) {
            return ['error' => 'AI is not configured. Add GEMINI_API_KEY to your .env file.'];
        }

        $tone = $this->getToneDirective($context['template'] ?? 'luxury');

        $facts = json_encode(array_filter([
            'name' => $context['name'],
            'area' => $context['area'] ?? null,
            'city' => $context['city'] ?? null,
            'developer' => $context['developer'] ?? null,
            'architect' => $context['architect'] ?? null,
            'interior_design' => $context['interior_design'] ?? null,
            'status' => $context['status'] ?? null,
            'estimated_completion' => $context['completion_year'] ?? null,
            'pricing' => $context['price_label'] ?? null,
            'highlights' => array_values((array) ($context['highlights'] ?? [])),
            'key_details' => array_values((array) ($context['key_details'] ?? [])),
        ]), JSON_UNESCAPED_UNICODE);

        $system = <<<PROMPT
You are an expert real-estate copywriter. Write the "About the Project" copy for a pre-construction / new-development page on a real estate agent's website. The page already shows the project's facts, highlights, gallery and floor plans separately — your copy is the editorial story above them.

TONE: {$tone}

RULES:
- 3 to 4 short paragraphs, wrapped in <p> tags. No headings, no lists, no other HTML.
- Ground EVERY specific claim in PROJECT DATA. Never invent unit counts, prices, dates, amenities, school districts or any fact not provided.
- Weave the project name, the area and (when given) the developer/architect/interior designer naturally into the copy.
- Write for buyers searching "<project name> <area>" — natural, not keyword-stuffed.
- Respond with JSON only: {"value": "<the HTML copy>"}.
PROMPT;

        $parts = ["PROJECT DATA:\n{$facts}"];
        if (trim((string) ($context['current_value'] ?? '')) !== '') {
            $parts[] = "\nCURRENT DRAFT (rewrite and improve it, keeping any specific facts it adds):\n".trim(strip_tags((string) $context['current_value']));
        } else {
            $parts[] = "\nWrite fresh copy for this project.";
        }

        $result = $this->ai->sendMessage($system, implode("\n", $parts), 2500, ['json' => true, 'thinking_budget' => 0]);

        if (isset($result['error'])) {
            return $result;
        }

        return $this->extractValue($result['text']);
    }

    private function getToneDirective(string $template): string
    {
        return match ($template) {
            'luxury' => 'Use an elegant, sophisticated, and refined tone. The writing should feel premium and aspirational, befitting luxury real estate. Use polished language without being overly ornate.',
            default => 'Use a professional, friendly, and approachable tone suitable for real estate.',
        };
    }

    private function buildBulkSystemPrompt(string $template): string
    {
        $tone = $this->getToneDirective($template);

        return <<<PROMPT
You are an expert real estate website copywriter. Generate all content copy for a real estate agent's personal website.

TONE: {$tone}

Return ONLY a JSON object with these exact keys (no markdown, no code blocks):
{
  "agent_tagline": "A short catchy tagline, 10-15 words max",
  "agent_bio": "A professional bio paragraph, 3-5 sentences about the agent",
  "hero_headline": "Bold hero section headline, 5-8 words",
  "hero_subtitle": "Supporting subtitle for the hero, 10-20 words",
  "buy_headline": "Headline for the Buy page, 4-7 words",
  "buy_description": "Description for the Buy page, 2-3 sentences about the buying experience",
  "sell_headline": "Headline for the Sell page, 4-7 words",
  "sell_description": "Description for the Sell page, 2-3 sentences about the selling experience",
  "about_extended": "Extended about section, 4-6 sentences expanding on the agent's expertise",
  "meta_title": "SEO meta title, under 60 characters, format: Agent Name | City Real Estate",
  "meta_description": "SEO meta description, 120-155 characters, compelling summary"
}

RULES:
- Personalize all content using the agent's name, city, and specialization
- Make content unique and compelling, not generic
- Focus on premium service, market expertise, and exclusive listings
- Respond ONLY with valid JSON. No extra text.
PROMPT;
    }

    private function buildBulkUserPrompt(array $context): string
    {
        $parts = [];
        $parts[] = "Agent Name: {$context['agent_name']}";

        if (! empty($context['agent_city'])) {
            $location = $context['agent_city'];
            if (! empty($context['agent_state'])) {
                $location .= ', '.$context['agent_state'];
            }
            $parts[] = "Location: {$location}";
        }

        if (! empty($context['agent_title'])) {
            $parts[] = "Title: {$context['agent_title']}";
        }

        if (! empty($context['brokerage_name'])) {
            $parts[] = "Brokerage: {$context['brokerage_name']}";
        }

        $parts[] = "Template Style: {$context['template']}";
        $parts[] = "\nAgent's Description:\n{$context['description']}";
        $parts[] = "\nGenerate all website copy based on the above information.";

        return implode("\n", $parts);
    }

    private function buildFieldSystemPrompt(string $field, string $template): string
    {
        $tone = $this->getToneDirective($template);
        $constraint = $this->getFieldConstraint($field);

        return <<<PROMPT
You are an expert real estate website copywriter. Generate content for a single field on a real estate agent's website.

TONE: {$tone}

FIELD: {$field}
CONSTRAINT: {$constraint}

Return ONLY a JSON object: {"value": "your generated text here"}
No markdown, no code blocks, no extra text.
PROMPT;
    }

    private function buildFieldUserPrompt(string $field, array $context): string
    {
        $parts = [];

        if (! empty($context['agent_name'])) {
            $parts[] = "Agent: {$context['agent_name']}";
        }
        if (! empty($context['agent_city'])) {
            $parts[] = "City: {$context['agent_city']}";
        }
        if (! empty($context['template'])) {
            $parts[] = "Template: {$context['template']}";
        }

        if (! empty($context['current_value'])) {
            $parts[] = "\nCurrent value: \"{$context['current_value']}\"";
            $parts[] = 'Rewrite this content with a fresh take. Keep the same intent but make it better.';
        } else {
            $parts[] = "\nGenerate new content for the {$field} field.";
        }

        return implode("\n", $parts);
    }

    private function getFieldConstraint(string $field): string
    {
        return match ($field) {
            'agent_tagline' => '10-15 words max. Short, catchy, memorable.',
            'agent_bio' => '3-5 sentences. Professional bio about the agent.',
            'hero_headline' => '5-8 words. Bold and attention-grabbing.',
            'hero_subtitle' => '10-20 words. Supporting text for the hero headline.',
            'buy_headline' => '4-7 words. Compelling headline for the Buy page.',
            'buy_description' => '2-3 sentences about the buying experience.',
            'sell_headline' => '4-7 words. Compelling headline for the Sell page.',
            'sell_description' => '2-3 sentences about the selling experience.',
            'about_extended' => '4-6 sentences. Extended bio for the About page.',
            'meta_title' => 'Under 60 characters. SEO-friendly page title.',
            'meta_description' => '120-155 characters. Compelling SEO meta description.',
            default => 'Keep it concise and professional.',
        };
    }

    private function parseJson(string $text): mixed
    {
        $text = trim($text);

        $result = json_decode($text, true);
        if ($result !== null) {
            return $result;
        }

        // Gemini regularly emits literal newlines/tabs INSIDE string values
        // (e.g. a two-paragraph bio) — invalid JSON that json_decode rejects.
        // Escape raw control characters within string literals and retry; all
        // later fallbacks work from the repaired text too.
        $text = $this->escapeControlCharsInStrings($text);
        $result = json_decode($text, true);
        if ($result !== null) {
            return $result;
        }

        if (preg_match('/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/', $text, $m)) {
            $result = json_decode(trim($m[1]), true);
            if ($result !== null) {
                return $result;
            }
        }

        $firstBrace = strpos($text, '{');
        $firstBracket = strpos($text, '[');
        if ($firstBrace !== false || $firstBracket !== false) {
            if ($firstBrace !== false && ($firstBracket === false || $firstBrace < $firstBracket)) {
                $lastBrace = strrpos($text, '}');
                if ($lastBrace !== false) {
                    $json = substr($text, $firstBrace, $lastBrace - $firstBrace + 1);
                    $result = json_decode($json, true);
                    if ($result !== null) {
                        return $result;
                    }
                }
            }
        }

        Log::warning('Website AI response JSON parse failed', ['raw' => mb_substr($text, 0, 500)]);

        return null;
    }

    /** Escape raw \r\n / \n / \t inside JSON string literals (left intact between tokens). */
    private function escapeControlCharsInStrings(string $text): string
    {
        $repaired = preg_replace_callback(
            '/"(?:[^"\\\\]|\\\\.)*"/s',
            static fn (array $m) => str_replace(["\r\n", "\r", "\n", "\t"], ['\n', '\n', '\n', '\t'], $m[0]),
            $text
        );

        return $repaired ?? $text;
    }
}
