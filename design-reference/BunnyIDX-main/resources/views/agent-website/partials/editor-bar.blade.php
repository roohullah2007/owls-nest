{{-- Editor bar: only rendered for authenticated site owners --}}
<div id="editor-bar-root"></div>
<script>
    window.__EDITOR_SITE__ = @json($site);
    window.__EDITOR_PAGE__ = @json($currentPage ?? 'home');
</script>
@viteReactRefresh
@vite(['resources/js/website-editor/app.tsx'])
