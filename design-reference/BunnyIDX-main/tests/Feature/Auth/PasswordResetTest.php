<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\Auth\ResetPasswordNotification as ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_password_link_screen_can_be_rendered(): void
    {
        $response = $this->get('/forgot-password');

        $response->assertStatus(200);
    }

    public function test_reset_password_link_can_be_requested(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_reset_password_screen_can_be_rendered(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) {
            $response = $this->get('/reset-password/'.$notification->token);

            $response->assertStatus(200);

            return true;
        });
    }

    public function test_password_can_be_reset_with_valid_token(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
            $response = $this->post('/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'NewP@ssw0rd1',
                'password_confirmation' => 'NewP@ssw0rd1',
            ]);

            $response
                ->assertSessionHasNoErrors()
                ->assertRedirect(route('login'));

            return true;
        });
    }

    public function test_password_reset_rejects_reusing_the_current_password(): void
    {
        Notification::fake();

        // Use a strong current password so it passes strength validation and
        // actually exercises the "must differ from current" check.
        $user = User::factory()->create(['password' => Hash::make('Curr3nt!Pass1')]);

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
            $response = $this->from('/reset-password/'.$notification->token)->post('/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'Curr3nt!Pass1',
                'password_confirmation' => 'Curr3nt!Pass1',
            ]);

            $response->assertSessionHasErrors('password');

            return true;
        });
    }

    public function test_password_reset_rejects_a_weak_password(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
            $response = $this->from('/reset-password/'.$notification->token)->post('/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'weakpass',
                'password_confirmation' => 'weakpass',
            ]);

            $response->assertSessionHasErrors('password');

            return true;
        });
    }

    public function test_forgot_password_does_not_reveal_whether_email_exists(): void
    {
        Notification::fake();

        // An unknown email must return the same generic success response (no
        // validation error) so the form can't be used to enumerate accounts.
        $response = $this->from('/forgot-password')->post('/forgot-password', [
            'email' => 'nobody-here@example.com',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect('/forgot-password');
        Notification::assertNothingSent();
    }

    public function test_forgot_password_is_rate_limited(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $this->post('/forgot-password', ['email' => 'flood@example.com']);
        }

        $this->post('/forgot-password', ['email' => 'flood@example.com'])
            ->assertStatus(429);
    }
}
