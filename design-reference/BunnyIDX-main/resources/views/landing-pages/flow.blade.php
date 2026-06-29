{{-- The full-screen lead flow (multi-step questionnaire + contact capture) is now
     rendered in React; the server only emits the JSON payload and mounts the bundle.
     $hero / $address / $owner come from PublicLandingPageController::flow(). --}}
@include('landing-pages.partials.spa-shell', ['mode' => 'flow'])
