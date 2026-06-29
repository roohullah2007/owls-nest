{{-- Breadcrumb trail inside a Page Header hero. $crumbs: [{label, url?}], last = current page. --}}
<nav class="pgh-crumbs" aria-label="Breadcrumb">
    @foreach($crumbs as $crumb)
        @if(! $loop->first)<span aria-hidden="true">/</span>@endif
        @if(! empty($crumb['url']) && ! $loop->last)
            <a href="{{ $crumb['url'] }}">{{ $crumb['label'] }}</a>
        @else
            <span aria-current="page">{{ $crumb['label'] }}</span>
        @endif
    @endforeach
</nav>
