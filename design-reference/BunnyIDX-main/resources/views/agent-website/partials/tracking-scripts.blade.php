{{--
    Shared analytics/tracking head scripts for ALL public site layouts (marketing
    templates, property search, thank-you page). Renders the official snippets
    from the structured IDs saved in the CRM "SEO & Tracking" tab
    (page_data._config.tracking — ga4_id / gtm_id / fb_pixel_id), then the
    site's raw custom head snippet ($site->tracking_head).

    The IDs are strictly validated server-side (ConfigController::updateTrackingConfig)
    and additionally escaped here, so they can never inject markup.
--}}
@php
    $trk = (array) data_get($site->page_data, '_config.tracking', []);
    $trkGa4 = preg_match('/^G-[A-Z0-9]{4,}$/i', (string) ($trk['ga4_id'] ?? '')) ? strtoupper($trk['ga4_id']) : null;
    $trkGtm = preg_match('/^GTM-[A-Z0-9]{4,}$/i', (string) ($trk['gtm_id'] ?? '')) ? strtoupper($trk['gtm_id']) : null;
    $trkFbq = preg_match('/^\d{5,20}$/', (string) ($trk['fb_pixel_id'] ?? '')) ? $trk['fb_pixel_id'] : null;
@endphp
@if($trkGa4)
    {{-- Google Analytics 4 --}}
    <script async src="https://www.googletagmanager.com/gtag/js?id={{ $trkGa4 }}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '{{ $trkGa4 }}');
    </script>
@endif
@if($trkGtm)
    {{-- Google Tag Manager --}}
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','{{ $trkGtm }}');</script>
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id={{ $trkGtm }}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
@endif
@if($trkFbq)
    {{-- Meta (Facebook) Pixel --}}
    <script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '{{ $trkFbq }}');
    fbq('track', 'PageView');</script>
    <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id={{ $trkFbq }}&ev=PageView&noscript=1" alt=""></noscript>
@endif
@if($site->tracking_head)
    {{-- Raw custom head snippet (site owner authored) --}}
    {!! $site->tracking_head !!}
@endif
