<?php

declare(strict_types=1);

namespace App\Services\Sites;

use App\Models\AgentWebsite;

/**
 * Website translations (Google Translate widget behind a themed language
 * modal). English is always the source language; owners pick which target
 * languages their site offers (page_data._config.translations.languages).
 * Keys are Google Translate language codes; `flag` is the flagcdn country
 * code the picker renders.
 */
final class SiteTranslations
{
    /** code => [label (English), native (shown in the picker), flag country code] */
    public const CATALOG = [
        'es' => ['label' => 'Spanish', 'native' => 'Español', 'flag' => 'es'],
        'pt' => ['label' => 'Portuguese', 'native' => 'Português', 'flag' => 'br'],
        'fr' => ['label' => 'French', 'native' => 'Français', 'flag' => 'fr'],
        'it' => ['label' => 'Italian', 'native' => 'Italiano', 'flag' => 'it'],
        'de' => ['label' => 'German', 'native' => 'Deutsch', 'flag' => 'de'],
        'ru' => ['label' => 'Russian', 'native' => 'Русский', 'flag' => 'ru'],
        'zh-CN' => ['label' => 'Chinese (Simplified)', 'native' => '简体中文', 'flag' => 'cn'],
        'zh-TW' => ['label' => 'Chinese (Traditional)', 'native' => '繁體中文', 'flag' => 'tw'],
        'ja' => ['label' => 'Japanese', 'native' => '日本語', 'flag' => 'jp'],
        'ko' => ['label' => 'Korean', 'native' => '한국어', 'flag' => 'kr'],
        'vi' => ['label' => 'Vietnamese', 'native' => 'Tiếng Việt', 'flag' => 'vn'],
        'th' => ['label' => 'Thai', 'native' => 'ไทย', 'flag' => 'th'],
        'tl' => ['label' => 'Filipino', 'native' => 'Filipino', 'flag' => 'ph'],
        'id' => ['label' => 'Indonesian', 'native' => 'Bahasa Indonesia', 'flag' => 'id'],
        'hi' => ['label' => 'Hindi', 'native' => 'हिन्दी', 'flag' => 'in'],
        'pa' => ['label' => 'Punjabi', 'native' => 'ਪੰਜਾਬੀ', 'flag' => 'in'],
        'gu' => ['label' => 'Gujarati', 'native' => 'ગુજરાતી', 'flag' => 'in'],
        'bn' => ['label' => 'Bengali', 'native' => 'বাংলা', 'flag' => 'bd'],
        'ur' => ['label' => 'Urdu', 'native' => 'اردو', 'flag' => 'pk'],
        'pl' => ['label' => 'Polish', 'native' => 'Polski', 'flag' => 'pl'],
        'ro' => ['label' => 'Romanian', 'native' => 'Română', 'flag' => 'ro'],
        'tr' => ['label' => 'Turkish', 'native' => 'Türkçe', 'flag' => 'tr'],
        'sr' => ['label' => 'Serbian', 'native' => 'Српски', 'flag' => 'rs'],
        'uk' => ['label' => 'Ukrainian', 'native' => 'Українська', 'flag' => 'ua'],
        'el' => ['label' => 'Greek', 'native' => 'Ελληνικά', 'flag' => 'gr'],
        'nl' => ['label' => 'Dutch', 'native' => 'Nederlands', 'flag' => 'nl'],
        'sv' => ['label' => 'Swedish', 'native' => 'Svenska', 'flag' => 'se'],
        'cs' => ['label' => 'Czech', 'native' => 'Čeština', 'flag' => 'cz'],
        'hu' => ['label' => 'Hungarian', 'native' => 'Magyar', 'flag' => 'hu'],
        'ar' => ['label' => 'Arabic', 'native' => 'العربية', 'flag' => 'sa'],
        'iw' => ['label' => 'Hebrew', 'native' => 'עברית', 'flag' => 'il'],
        'fa' => ['label' => 'Persian', 'native' => 'فارسی', 'flag' => 'ir'],
        'ht' => ['label' => 'Haitian Creole', 'native' => 'Kreyòl', 'flag' => 'ht'],
    ];

    /** @return array<int, array{code: string, label: string, native: string, flag: string}> */
    public static function all(): array
    {
        $out = [];
        foreach (self::CATALOG as $code => $entry) {
            $out[] = ['code' => $code] + $entry;
        }

        return $out;
    }

    public static function enabledFor(AgentWebsite $site): bool
    {
        return (bool) data_get($site->page_data, '_config.translations.enabled', false)
            && self::languagesFor($site) !== [];
    }

    /**
     * The site's offered target languages, in catalog order, invalid codes
     * dropped (English is implicit and always first in the picker).
     *
     * @return string[]
     */
    public static function languagesFor(AgentWebsite $site): array
    {
        $picked = (array) data_get($site->page_data, '_config.translations.languages', []);

        return array_values(array_filter(
            array_keys(self::CATALOG),
            fn (string $code) => in_array($code, $picked, true)
        ));
    }

    /** The visitor's active language from the googtrans cookie ('en' when untranslated). */
    public static function currentFor(AgentWebsite $site): string
    {
        $cookie = (string) request()->cookie('googtrans', '');
        $code = $cookie !== '' ? (string) last(explode('/', $cookie)) : 'en';

        return in_array($code, self::languagesFor($site), true) ? $code : 'en';
    }
}
