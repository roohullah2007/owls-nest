{{--
    "Choose your language" modal + the Google Translate plumbing. Included by
    BOTH public layouts (the theme layout and the standalone property-search
    layout) when the owner enabled Translations, so every page translates.
    Self-contained: carries its own styles. A [data-lt-open] button (theme
    topbar / search header) opens it. Picking a language sets the googtrans
    cookie and reloads; on load the hidden Google Translate widget applies the
    translation, limited to the owner's picked languages. English clears the
    cookie. All Google chrome (banner/spinner/tooltips) is hidden below.
--}}
@php
    use App\Services\Sites\SiteTranslations;

    $tmLanguages = SiteTranslations::languagesFor($site);
    $tmCurrent = SiteTranslations::currentFor($site);
    $tmCatalog = SiteTranslations::CATALOG;
@endphp

<style>
    /* Language picker modal (self-contained — used by every public layout). */
    .lt-overlay {
        position: fixed;
        inset: 0;
        /* Above every public surface — incl. the search page's sticky header
           (3000), filter sheets (4500) and listing modal (5000). */
        z-index: 6000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 12vh 20px 20px;
        background: rgba(7, 9, 15, 0.55);
    }
    .lt-overlay[hidden] { display: none; }
    .lt-modal {
        width: 100%;
        max-width: 640px;
        max-height: 76vh;
        overflow-y: auto;
        background: #FFFFFF;
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
    }
    .lt-head { display: flex; align-items: center; justify-content: space-between; margin: 0 0 22px; }
    .lt-title { font-size: 24px; font-weight: 600; color: #111315; margin: 0; }
    .lt-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border: 1px solid #D9DDE2;
        border-radius: 50%;
        background: #FFFFFF;
        color: #111315;
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
    }
    .lt-close:hover { border-color: #111315; background: #F7F8F9; }
    .lt-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .lt-lang {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        border: 1px solid #D9DDE2;
        border-radius: 999px;
        background: #FFFFFF;
        color: #111315;
        font-family: inherit;
        font-size: 14px;
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
    }
    .lt-lang:hover { border-color: #111315; }
    .lt-lang-active { background: #F2F3F5; border-color: #E4E7EB; }
    .lt-flag { display: inline-flex; width: 22px; height: 22px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
    .lt-flag img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .lt-flag-sm { width: 18px; height: 18px; }
    /* Generic language button for non-theme headers (search header). */
    .lt-headbtn {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font-family: inherit;
        font-size: 13px;
        letter-spacing: 0.04em;
        cursor: pointer;
        opacity: 0.9;
    }
    .lt-headbtn:hover { opacity: 1; }
    @media (max-width: 640px) {
        .lt-grid { grid-template-columns: repeat(2, 1fr); }
        .lt-modal { padding: 20px; }
    }

    /* Google Translate chrome — keep ALL of it invisible (legacy goog-te-*
       names plus Google's current VIpgJd-* names: top banner, the top-left
       progress spinner, the on-hover original-text balloon). */
    .lt-gt-mount,
    #goog-gt-tt,
    .goog-te-balloon-frame,
    .goog-te-banner-frame,
    .skiptranslate iframe,
    .goog-te-spinner-pos,
    #goog-gt-vt,
    .VIpgJd-ZVi9od-ORHb-OEVmcd,
    .VIpgJd-ZVi9od-aZ2wEe-wOHMyf,
    .VIpgJd-ZVi9od-aZ2wEe-OiiCO,
    .VIpgJd-ZVi9od-aZ2wEe { display: none !important; }
    /* GT pushes the page down for its banner — pin the body back. */
    body { top: 0 !important; }
    /* Hover highlight Google paints over translated text. */
    .VIpgJd-yAWNEb-VIpgJd-fmcmS-sn54Q { background: transparent !important; box-shadow: none !important; }
    font[style] { background-color: transparent !important; box-shadow: none !important; }
</style>

<div class="lt-overlay" id="ltOverlay" hidden>
    <div class="lt-modal" role="dialog" aria-modal="true" aria-labelledby="ltTitle">
        <div class="lt-head">
            <h3 class="lt-title" id="ltTitle">Choose your language</h3>
            <button type="button" class="lt-close" id="ltClose" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
            </button>
        </div>
        <div class="lt-grid">
            <button type="button" class="lt-lang{{ $tmCurrent === 'en' ? ' lt-lang-active' : '' }}" data-lt-lang="en">
                <span class="lt-flag"><img src="https://flagcdn.com/w40/us.png" alt="" loading="lazy"></span>
                English
            </button>
            @foreach($tmLanguages as $code)
            <button type="button" class="lt-lang{{ $tmCurrent === $code ? ' lt-lang-active' : '' }}" data-lt-lang="{{ $code }}">
                <span class="lt-flag"><img src="https://flagcdn.com/w40/{{ $tmCatalog[$code]['flag'] }}.png" alt="" loading="lazy"></span>
                {{ $tmCatalog[$code]['label'] }}
            </button>
            @endforeach
        </div>
    </div>
</div>

{{-- Hidden mount for the Google Translate widget (its UI stays invisible). --}}
<div id="site-gt-element" class="lt-gt-mount" aria-hidden="true"></div>

<script>
(function () {
    var overlay = document.getElementById('ltOverlay');
    if (!overlay) return;

    function openModal() { overlay.hidden = false; document.body.style.overflow = 'hidden'; }
    function closeModal() { overlay.hidden = true; document.body.style.overflow = ''; }

    document.querySelectorAll('[data-lt-open]').forEach(function (btn) {
        btn.addEventListener('click', openModal);
    });
    document.getElementById('ltClose').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) closeModal(); });

    function clearCookie(name) {
        var host = location.hostname;
        var past = ';expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        document.cookie = name + '=' + past;
        document.cookie = name + '=' + past + ';domain=' + host;
        document.cookie = name + '=' + past + ';domain=.' + host;
    }

    overlay.querySelectorAll('[data-lt-lang]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var code = btn.getAttribute('data-lt-lang');
            clearCookie('googtrans');
            if (code !== 'en') {
                var value = 'googtrans=/en/' + code + ';path=/';
                document.cookie = value;
                document.cookie = value + ';domain=.' + location.hostname;
            }
            location.reload();
        });
    });

    // The Google widget only loads when a translation is active — untranslated
    // visits never pay for the script.
    var match = document.cookie.match(/googtrans=\/en\/([A-Za-z-]+)/);
    if (match && match[1] !== 'en') {
        window.siteTranslateInit = function () {
            new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: @json(implode(',', $tmLanguages)),
                autoDisplay: false,
            }, 'site-gt-element');
        };
        var s = document.createElement('script');
        s.src = 'https://translate.google.com/translate_a/element.js?cb=siteTranslateInit';
        s.defer = true;
        document.head.appendChild(s);
    }
})();
</script>
