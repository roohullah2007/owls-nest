<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Central landing-page image resolver (server side).
 *
 * Mirrors resources/js/landing-pages/public/imageFallbacks.ts. Guarantees every
 * image-based block has a usable image when a page is saved (create / AI generate
 * / edit): empty or broken-local-path images are replaced with a curated,
 * category-appropriate real-estate fallback (or cleared, for testimonial avatars,
 * so the React side renders clean initials). The React layer adds an onError
 * safety net at render for anything that still fails to load.
 */
final class LandingPageImages
{
    /** Curated, license-free Unsplash CDN images (verified reachable). */
    private static function img(string $id, int $w = 1200): string
    {
        return "https://images.unsplash.com/photo-{$id}?auto=format&fit=crop&w={$w}&q=70";
    }

    /** Final generic real-estate fallback. */
    public static function generic(): string
    {
        return self::img('1568605114967-8130f3a36994');
    }

    /** template key → image category. */
    public const TEMPLATE_CATEGORY = [
        'home-value' => 'seller',
        'home-valuation' => 'valuation',
        'cash-offer' => 'cash',
        'buyer-search' => 'buyer',
        'luxury-listing' => 'luxury',
        'listing-masterclass' => 'seller',
        'buyer-vip' => 'buyer',
    ];

    public static function categoryForTemplate(?string $templateKey): string
    {
        return self::TEMPLATE_CATEGORY[$templateKey] ?? 'seller';
    }

    /** [category][section] => url. Section fallback, then hero, then generic. */
    private static function map(): array
    {
        return [
            'seller' => ['hero' => self::img('1568605114967-8130f3a36994'), 'about' => self::img('1511895426328-dc8714191300'), 'cta' => self::img('1560518883-ce09059eeffa'), 'video' => self::img('1568605114967-8130f3a36994'), 'authority' => self::img('1560250097-0b93528c311a', 600), 'feature' => self::img('1512917774080-9991f1c4c750')],
            'valuation' => ['hero' => self::img('1554224155-8d04cb21cd6c'), 'about' => self::img('1570129477492-45c003edd2be'), 'cta' => self::img('1554224155-8d04cb21cd6c'), 'video' => self::img('1570129477492-45c003edd2be'), 'authority' => self::img('1560250097-0b93528c311a', 600), 'feature' => self::img('1554224155-8d04cb21cd6c')],
            'cash' => ['hero' => self::img('1560518883-ce09059eeffa'), 'about' => self::img('1582407947304-fd86f028f716'), 'cta' => self::img('1582407947304-fd86f028f716'), 'video' => self::img('1560518883-ce09059eeffa'), 'authority' => self::img('1560250097-0b93528c311a', 600), 'feature' => self::img('1582407947304-fd86f028f716')],
            'buyer' => ['hero' => self::img('1582268611958-ebfd161ef9cf'), 'about' => self::img('1560448204-e02f11c3d0e2'), 'cta' => self::img('1564013799919-ab600027ffc6'), 'video' => self::img('1582268611958-ebfd161ef9cf'), 'authority' => self::img('1560250097-0b93528c311a', 600), 'feature' => self::img('1512917774080-9991f1c4c750')],
            'luxury' => ['hero' => self::img('1613490493576-7fde63acd811'), 'about' => self::img('1600596542815-ffad4c1539a9'), 'cta' => self::img('1613490493576-7fde63acd811'), 'video' => self::img('1613490493576-7fde63acd811'), 'authority' => self::img('1560250097-0b93528c311a', 600), 'feature' => self::img('1600596542815-ffad4c1539a9')],
        ];
    }

    public static function fallbackFor(string $section, string $category): string
    {
        $cat = self::map()[$category] ?? self::map()['seller'];

        return $cat[$section] ?? $cat['hero'] ?? self::generic();
    }

    /** Which image fields each block type carries, and the section they map to. */
    private const BLOCK_IMAGE_FIELDS = [
        'hero' => ['field' => 'image', 'section' => 'hero'],
        'cta' => ['field' => 'image', 'section' => 'cta'],
        'about' => ['field' => 'photo', 'section' => 'about'],
        'hero-video' => ['field' => 'poster', 'section' => 'video'],
        'authority' => ['field' => 'photo', 'section' => 'authority'],
    ];

    /**
     * A stored value needs a fallback when it is empty, or is a relative storage
     * path that no longer exists on the public disk (e.g. a missing template webp).
     * External (http/https/data) URLs are left untouched.
     */
    private static function needsFallback(mixed $value): bool
    {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '') {
            return true;
        }
        if (Str::startsWith($value, ['http://', 'https://', 'data:'])) {
            return false;
        }

        return ! Storage::disk('public')->exists($value);
    }

    /**
     * Ensure every image-based block has a usable image. Empty/broken images on
     * single-image blocks get the category fallback; broken testimonial avatars
     * are cleared so the React render shows clean initials (never a stranger's
     * face attached to a named quote).
     */
    public static function applyFallbacks(array $blocks, string $category): array
    {
        return array_map(function (array $block) use ($category) {
            $type = $block['type'] ?? '';
            $data = $block['data'] ?? [];

            if (isset(self::BLOCK_IMAGE_FIELDS[$type])) {
                $field = self::BLOCK_IMAGE_FIELDS[$type]['field'];
                $section = self::BLOCK_IMAGE_FIELDS[$type]['section'];
                if (self::needsFallback($data[$field] ?? null)) {
                    $data[$field] = self::fallbackFor($section, $category);
                }
            }

            if ($type === 'testimonials' && ! empty($data['items']) && is_array($data['items'])) {
                $data['items'] = array_map(function ($item) {
                    if (is_array($item) && self::needsFallback($item['image'] ?? null)) {
                        $item['image'] = '';
                    }

                    return $item;
                }, $data['items']);
            }

            $block['data'] = $data;

            return $block;
        }, $blocks);
    }
}
