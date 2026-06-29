<?php

declare(strict_types=1);

namespace App\Services\Email;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;

/**
 * Splits an email body into the latest reply ("main") and the quoted previous
 * conversation ("quoted"), and sanitizes the HTML. This runs at read time only —
 * the raw body stays untouched in the database for audit/debugging.
 */
class EmailBodyFormatter
{
    /** Elements removed entirely during sanitization. */
    private const DANGEROUS_TAGS = [
        'script', 'style', 'iframe', 'object', 'embed', 'link',
        'meta', 'base', 'head', 'title', 'noscript', 'form',
    ];

    /**
     * Produce display-ready main/quoted bodies for both HTML and text.
     *
     * @return array{html: ?string, quoted_html: ?string, text: ?string, quoted_text: ?string, has_quoted: bool}
     */
    public function format(?string $html, ?string $text): array
    {
        $result = [
            'html' => null,
            'quoted_html' => null,
            'text' => null,
            'quoted_text' => null,
            'has_quoted' => false,
        ];

        if (is_string($html) && trim($html) !== '') {
            $split = $this->splitHtml($html);
            $result['html'] = $this->sanitizeHtml($split['main']);
            if (trim($split['quoted']) !== '') {
                $result['quoted_html'] = $this->sanitizeHtml($split['quoted']);
                $result['has_quoted'] = true;
            }
        }

        if (is_string($text) && trim($text) !== '') {
            $split = $this->splitText($text);
            $result['text'] = $split['main'];
            if (trim($split['quoted']) !== '') {
                $result['quoted_text'] = $split['quoted'];
                $result['has_quoted'] = true;
            }
        }

        return $result;
    }

    /**
     * Split an HTML body at the first Gmail quote container / blockquote.
     *
     * @return array{main: string, quoted: string}
     */
    public function splitHtml(string $html): array
    {
        if (trim($html) === '') {
            return ['main' => '', 'quoted' => ''];
        }

        $dom = $this->loadHtml($html);
        $body = $dom->getElementsByTagName('body')->item(0);
        if (! $body) {
            return ['main' => $html, 'quoted' => ''];
        }

        $xpath = new DOMXPath($dom);
        // Gmail wraps quoted text in .gmail_quote; other clients use <blockquote>.
        $quoteNode = $xpath->query("//*[contains(concat(' ', normalize-space(@class), ' '), ' gmail_quote ')]")->item(0)
            ?: $xpath->query('//blockquote')->item(0);

        if (! $quoteNode) {
            return ['main' => $this->innerHtml($body, $dom), 'quoted' => ''];
        }

        // Everything from the quote node onward (incl. following siblings) is quoted.
        $quotedHtml = '';
        $toRemove = [];
        for ($n = $quoteNode; $n !== null; $n = $n->nextSibling) {
            $quotedHtml .= $dom->saveHTML($n);
            $toRemove[] = $n;
        }
        foreach ($toRemove as $node) {
            $node->parentNode?->removeChild($node);
        }

        $mainHtml = $this->innerHtml($body, $dom);

        // If removing the quote left nothing meaningful, show everything (never
        // hide the actual reply because detection was ambiguous).
        if ($this->isBlank($mainHtml)) {
            return ['main' => $html, 'quoted' => ''];
        }

        return ['main' => $mainHtml, 'quoted' => $quotedHtml];
    }

    /**
     * Split a plain-text body at the first quote marker.
     *
     * @return array{main: string, quoted: string}
     */
    public function splitText(string $text): array
    {
        $lines = explode("\n", str_replace("\r\n", "\n", $text));

        $cut = null;
        foreach ($lines as $i => $line) {
            $trimmed = trim($line);
            if (
                preg_match('/^On\b.+\bwrote:$/u', $trimmed)              // Gmail "On … wrote:"
                || str_starts_with($trimmed, '>')                        // quoted lines
                || preg_match('/^-{2,}\s*Original Message\s*-{2,}$/i', $trimmed) // Outlook
                || preg_match('/^_{5,}$/', $trimmed)                     // Outlook divider
            ) {
                $cut = $i;
                break;
            }
        }

        if ($cut === null) {
            return ['main' => $text, 'quoted' => ''];
        }

        $main = trim(implode("\n", array_slice($lines, 0, $cut)));
        $quoted = trim(implode("\n", array_slice($lines, $cut)));

        if ($main === '') {
            return ['main' => $text, 'quoted' => ''];
        }

        return ['main' => $main, 'quoted' => $quoted];
    }

    /**
     * Remove dangerous tags/attributes and return the cleaned inner HTML.
     */
    public function sanitizeHtml(string $html): string
    {
        if (trim($html) === '') {
            return '';
        }

        $dom = $this->loadHtml($html);
        $body = $dom->getElementsByTagName('body')->item(0);
        if (! $body) {
            return '';
        }

        $this->sanitizeNode($body);

        return $this->innerHtml($body, $dom);
    }

    private function sanitizeNode(DOMNode $node): void
    {
        // Snapshot children — the live NodeList changes as we remove nodes.
        foreach (iterator_to_array($node->childNodes) as $child) {
            if (! $child instanceof DOMElement) {
                continue;
            }

            if (in_array(strtolower($child->tagName), self::DANGEROUS_TAGS, true)) {
                $child->parentNode?->removeChild($child);

                continue;
            }

            foreach (iterator_to_array($child->attributes) as $attr) {
                $name = strtolower($attr->nodeName);
                $value = (string) $attr->nodeValue;

                // Strip inline event handlers and javascript:/vbscript: URLs.
                if (str_starts_with($name, 'on')) {
                    $child->removeAttribute($attr->nodeName);
                } elseif (
                    in_array($name, ['href', 'src', 'xlink:href', 'action', 'formaction'], true)
                    && preg_match('/^\s*(javascript|vbscript):/i', $value)
                ) {
                    $child->removeAttribute($attr->nodeName);
                }
            }

            $this->sanitizeNode($child);
        }
    }

    private function loadHtml(string $html): DOMDocument
    {
        $dom = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        // The XML pragma forces UTF-8; wrapping in <body> keeps fragments intact.
        $dom->loadHTML(
            '<?xml encoding="utf-8" ?><body>'.$html.'</body>',
            LIBXML_NOERROR | LIBXML_NOWARNING
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return $dom;
    }

    private function innerHtml(DOMNode $node, DOMDocument $dom): string
    {
        $html = '';
        foreach ($node->childNodes as $child) {
            $html .= $dom->saveHTML($child);
        }

        return trim($html);
    }

    private function isBlank(string $html): bool
    {
        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5);
        $text = str_replace("\xC2\xA0", ' ', $text); // non-breaking space

        return trim($text) === '';
    }
}
