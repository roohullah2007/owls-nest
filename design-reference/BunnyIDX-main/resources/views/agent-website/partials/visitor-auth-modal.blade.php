{{--
    Visitor Login / Register modal — shared between the property-search header
    and the theme pages' header top bar. Opened by any `[data-ps-auth="login"]`
    / `[data-ps-auth="register"]` trigger on the page, or by a `ps:open-auth`
    window event (the React search app fires it when a guest taps Save).
    Forced mode ($psAuthForce — lead gating): opens immediately, can't be
    dismissed, and leads with a "sign up to continue" headline.
    Styles: resources/css/agent-website/visitor-auth.css (imported by both the
    search bundle and the luxury template bundle). Renders nothing when the
    visitor is already logged in.
--}}
@php
    $psVisitor = $psVisitor ?? app(\App\Services\Sites\VisitorAuth::class)->current($site);
    $psForce = ! empty($psAuthForce);
@endphp
@unless($psVisitor)
<div class="ps-auth-overlay" id="psAuthOverlay" @if($psForce) data-force="1" @else hidden @endif>
    <div class="ps-auth-modal" role="dialog" aria-modal="true" aria-label="Login or create an account">
        @unless($psForce)
        <button type="button" class="ps-auth-close" id="psAuthClose" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        @endunless
        @if($psForce)
        <h3 class="ps-auth-gate-title">Sign up to continue to listings</h3>
        <p class="ps-auth-gate-sub">Create a free account to view photos, prices and full listing details.</p>
        @endif
        <div class="ps-auth-tabs" role="tablist">
            <button type="button" data-ps-tab="login" class="is-active">Login</button>
            <button type="button" data-ps-tab="register">Create Account</button>
        </div>

        @if(config('services.google.client_id'))
            {{-- One platform OAuth client serves every site — see SiteVisitorGoogleController. --}}
            <a class="ps-auth-google" href="{{ route('visitor-auth.google.redirect', ['site' => $site->slug, 'return' => url()->current()]) }}">
                <svg width="17" height="17" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.2 6 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.2 6 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
                Continue with Google
            </a>
            <div class="ps-auth-or"><span>or</span></div>
        @endif

        <form id="psLoginForm" data-action="{{ route('agent-site.visitor.login', $site->slug) }}">
            <label>Email<input type="email" name="email" required autocomplete="email"></label>
            <label>Password<input type="password" name="password" required autocomplete="current-password"></label>
            <p class="ps-auth-error" hidden></p>
            <button type="submit" class="ps-auth-submit">Login</button>
            <p class="ps-auth-switch">No account yet? <button type="button" data-ps-tab="register">Create one</button></p>
        </form>

        <form id="psRegisterForm" data-action="{{ route('agent-site.visitor.register', $site->slug) }}" hidden>
            <label>Full name<input type="text" name="name" required autocomplete="name"></label>
            <label>Email<input type="email" name="email" required autocomplete="email"></label>
            <label>Phone<input type="tel" name="phone" required autocomplete="tel" placeholder="(555) 000-0000"></label>
            <label>Password<input type="password" name="password" required minlength="8" autocomplete="new-password" placeholder="8+ characters"></label>
            <label class="ps-auth-consent">
                <input type="checkbox" name="consent" value="1" required>
                <span><strong>Agree to Privacy Policy</strong><br>{{ $site->consentText() }}</span>
            </label>
            <p class="ps-auth-error" hidden></p>
            <button type="submit" class="ps-auth-submit">Create Account</button>
            <p class="ps-auth-switch">Already registered? <button type="button" data-ps-tab="login">Login</button></p>
        </form>
    </div>
</div>
@once
<script>
    (function () {
        var overlay = document.getElementById('psAuthOverlay');
        if (!overlay) return;
        var forced = overlay.getAttribute('data-force') === '1'; // lead gating: not dismissible

        function showTab(tab) {
            overlay.querySelectorAll('[data-ps-tab]').forEach(function (b) {
                b.classList.toggle('is-active', b.getAttribute('data-ps-tab') === tab && b.closest('.ps-auth-tabs'));
            });
            document.getElementById('psLoginForm').hidden = tab !== 'login';
            document.getElementById('psRegisterForm').hidden = tab !== 'register';
        }
        function openAuth(tab) {
            overlay.hidden = false;
            document.body.style.overflow = 'hidden';
            showTab(tab || 'login');
        }
        function closeAuth() {
            if (forced) return;
            overlay.hidden = true;
            document.body.style.overflow = '';
        }

        document.querySelectorAll('[data-ps-auth]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                openAuth(btn.getAttribute('data-ps-auth'));
            });
        });
        overlay.querySelectorAll('[data-ps-tab]').forEach(function (btn) {
            btn.addEventListener('click', function () { showTab(btn.getAttribute('data-ps-tab')); });
        });
        var closeBtn = document.getElementById('psAuthClose');
        if (closeBtn) closeBtn.addEventListener('click', closeAuth);
        overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeAuth(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) closeAuth(); });
        // The React search app asks for the modal when a guest taps Save/heart.
        window.addEventListener('ps:open-auth', function (e) { openAuth((e && e.detail) || 'register'); });

        if (forced) openAuth('register');

        [document.getElementById('psLoginForm'), document.getElementById('psRegisterForm')].forEach(function (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var err = form.querySelector('.ps-auth-error');
                var submit = form.querySelector('.ps-auth-submit');
                err.hidden = true;
                submit.disabled = true;
                var data = {};
                new FormData(form).forEach(function (v, k) { data[k] = v; });
                fetch(form.getAttribute('data-action'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') || {}).content || ''
                    },
                    body: JSON.stringify(data)
                }).then(function (res) {
                    return res.json().then(function (body) { return { ok: res.ok, body: body }; });
                }).then(function (r) {
                    if (r.ok && r.body.success) { window.location.reload(); return; }
                    var msg = r.body.error || (r.body.errors && Object.values(r.body.errors)[0][0]) || r.body.message || 'Something went wrong. Please try again.';
                    err.textContent = msg;
                    err.hidden = false;
                    submit.disabled = false;
                }).catch(function () {
                    err.textContent = 'Could not reach the server. Please try again.';
                    err.hidden = false;
                    submit.disabled = false;
                });
            });
        });
    })();
</script>
@endonce
@endunless
