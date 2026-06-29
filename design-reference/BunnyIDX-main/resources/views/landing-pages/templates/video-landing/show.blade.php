{{-- Video Landing page is now rendered entirely in React; the server only emits
     SEO meta + the JSON payload and mounts the bundle. --}}
@include('landing-pages.partials.spa-shell', ['mode' => 'page'])
