{{--
    Hero background (luxury) — resolves to an image, slideshow, YouTube embed or
    looping video based on $heroBgType / $heroYouTubeId / $heroSlides. Relies on
    those + $site, $heroVideoUrl from the home page's hero config block.
--}}
{{-- .hero-bg-clip owns the overflow clipping (the bg layers scale on load)
     so .hero itself can stay overflow-visible — the search autocomplete
     dropdown must be able to extend past the hero's bottom edge. --}}
<div class="hero-bg-clip" aria-hidden="true">
@if($heroBgType === 'image' && $site->hero_image)
    <div class="hero-bg" style="background-image: url('{{ Storage::url($site->hero_image) }}');"></div>
@elseif($heroBgType === 'default-images' && ! empty($heroDefaultImages))
    {{-- Default backdrop: rotating downloaded property photos (no upload required). --}}
    <div class="hero-slideshow" id="heroSlideshow">
        @foreach($heroDefaultImages as $i => $img)
        <div class="hero-slide{{ $i === 0 ? ' active' : '' }}" style="background-image: url('{{ $img }}');"></div>
        @endforeach
    </div>
@elseif($heroBgType === 'slideshow' && count($heroSlides) > 0)
    <div class="hero-slideshow" id="heroSlideshow">
        @foreach($heroSlides as $i => $slide)
        <div class="hero-slide{{ $i === 0 ? ' active' : '' }}" style="background-image: url('{{ Storage::url($slide) }}');"></div>
        @endforeach
    </div>
@elseif($heroYouTubeId)
    <div class="hero-youtube">
        <iframe
            src="https://www.youtube.com/embed/{{ $heroYouTubeId }}?autoplay=1&mute=1&loop=1&playlist={{ $heroYouTubeId }}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1"
            allow="autoplay; encrypted-media"
            allowfullscreen
            frameborder="0"
            title="Hero video"
        ></iframe>
    </div>
@else
    <video class="hero-video" autoplay muted loop playsinline poster="{{ asset('images/backgrounds/bg-1.jpg') }}">
        <source src="{{ $heroVideoUrl }}" type="video/mp4">
    </video>
@endif
</div>
