<?php

declare(strict_types=1);

namespace Tests\Feature\Email;

use App\Models\User;
use App\Notifications\Auth\VerifyEmailNotification;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class VerificationAndOAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_model_requires_email_verification(): void
    {
        $this->assertInstanceOf(MustVerifyEmail::class, new User);
    }

    public function test_email_password_signup_sends_verification_email(): void
    {
        Notification::fake();

        $this->post('/register', [
            'name' => 'Jane Agent',
            'email' => 'jane@example.com',
            'country' => 'US',
            'password' => 'NewP@ssw0rd1',
            'password_confirmation' => 'NewP@ssw0rd1',
        ]);

        $user = User::where('email', 'jane@example.com')->firstOrFail();

        $this->assertNull($user->email_verified_at);
        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    public function test_google_oauth_user_is_verified_and_skips_confirmation(): void
    {
        $abstractUser = Mockery::mock(\Laravel\Socialite\Two\User::class);
        $abstractUser->shouldReceive('getId')->andReturn('google-123');
        $abstractUser->shouldReceive('getName')->andReturn('Google Agent');
        $abstractUser->shouldReceive('getEmail')->andReturn('googleagent@example.com');
        $abstractUser->shouldReceive('getAvatar')->andReturn('https://example.com/a.png');

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andReturn($abstractUser);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $this->get(route('auth.google.callback'));

        $user = User::where('email', 'googleagent@example.com')->firstOrFail();

        $this->assertNotNull($user->email_verified_at, 'OAuth user should be auto-verified.');
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertAuthenticatedAs($user);
    }

    public function test_google_oauth_new_user_gets_a_default_country(): void
    {
        $this->mockGoogleUser('country@example.com', 'google-country');

        $this->get(route('auth.google.callback'));

        $user = User::where('email', 'country@example.com')->firstOrFail();

        $this->assertSame('US', $user->settings['country'] ?? null);
    }

    public function test_google_oauth_does_not_overwrite_an_existing_password(): void
    {
        // An existing password-based account that later signs in with Google must
        // keep its password (and name) — the OAuth callback should only link the
        // google_id, never reset credentials.
        $existing = User::factory()->create([
            'email' => 'existing@example.com',
            'name' => 'Original Name',
            'password' => Hash::make('Existing!Pass1'),
            'google_id' => null,
        ]);

        $this->mockGoogleUser('existing@example.com', 'google-existing', 'Google Display Name');

        $this->get(route('auth.google.callback'));

        $existing->refresh();

        $this->assertTrue(Hash::check('Existing!Pass1', $existing->password), 'Password must not be reset by Google login.');
        $this->assertSame('Original Name', $existing->name, 'Name must not be overwritten by Google login.');
        $this->assertSame('google-existing', $existing->google_id, 'Google account should be linked.');
    }

    public function test_google_oauth_with_2fa_enabled_goes_to_challenge_not_signed_in(): void
    {
        // A user who linked Google AND has 2FA enabled must still pass the 2FA
        // challenge — the OAuth callback should not sign them straight in.
        $user = User::factory()->create([
            'email' => 'secure@example.com',
            'google_id' => 'google-secure',
            'two_factor_secret' => (new \PragmaRX\Google2FA\Google2FA())->generateSecretKey(),
            'two_factor_confirmed_at' => now(),
        ]);

        $this->mockGoogleUser('secure@example.com', 'google-secure');

        $response = $this->get(route('auth.google.callback'));

        $response->assertRedirect(route('two-factor.challenge'));
        $this->assertGuest();
        $this->assertEquals($user->id, session('login.id'));
    }

    public function test_pending_2fa_guest_is_redirected_to_challenge_not_login(): void
    {
        // Mid-challenge: credentials verified, login stashed in session, but the
        // 2FA code not yet entered. Hitting a protected route should bounce to
        // the 2FA challenge, not the password login form.
        $this->withSession(['login.id' => 999])
            ->get(route('crm.dashboard'))
            ->assertRedirect(route('two-factor.challenge'));
    }

    public function test_ordinary_guest_is_redirected_to_login(): void
    {
        // No pending challenge → normal guests still go to login.
        $this->get(route('crm.dashboard'))
            ->assertRedirect(route('login'));
    }

    private function mockGoogleUser(string $email, string $id, string $name = 'Google Agent'): void
    {
        $abstractUser = Mockery::mock(\Laravel\Socialite\Two\User::class);
        $abstractUser->shouldReceive('getId')->andReturn($id);
        $abstractUser->shouldReceive('getName')->andReturn($name);
        $abstractUser->shouldReceive('getEmail')->andReturn($email);
        $abstractUser->shouldReceive('getAvatar')->andReturn('https://example.com/a.png');

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andReturn($abstractUser);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
