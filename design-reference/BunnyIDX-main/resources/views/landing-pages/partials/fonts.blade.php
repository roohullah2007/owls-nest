{{-- Resolves the page's chosen font (config/landing-page-fonts.php), loads it
     from Google Fonts and exposes its stack as the --lp-font CSS variable.
     Expects $page in scope. --}}
@php
    $__fonts = config('landing-page-fonts');
    $__templateDefault = $__fonts['template_defaults'][$page->template] ?? null;
    $__fontName = $page->page_data['_config']['font']
        ?? $__templateDefault
        ?? ($__fonts['default'] ?? 'Roboto Flex');
    $__font = collect($__fonts['options'] ?? [])->firstWhere('name', $__fontName)
        ?? ($__fonts['options'][0] ?? ['google' => 'Roboto+Flex:opsz,wght@8..144,400..900', 'stack' => "'Roboto Flex', system-ui, sans-serif"]);
@endphp
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family={{ $__font['google'] }}&display=swap" rel="stylesheet">
{{-- stack comes from trusted config; raw so the quotes aren't HTML-escaped (invalid in CSS) --}}
<style>:root { --lp-font: {!! $__font['stack'] !!}; }</style>
