<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'country' => 'US',
            'password' => 'NewP@ssw0rd1',
            'password_confirmation' => 'NewP@ssw0rd1',
            'terms' => true,
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('crm.dashboard', absolute: false));

        $this->assertSame('US', auth()->user()->settings['country'] ?? null);
    }

    public function test_registration_requires_accepting_terms(): void
    {
        $response = $this->from('/register')->post('/register', [
            'name' => 'Test User',
            'email' => 'noterms@example.com',
            'country' => 'US',
            'password' => 'NewP@ssw0rd1',
            'password_confirmation' => 'NewP@ssw0rd1',
            // terms omitted
        ]);

        $response->assertSessionHasErrors('terms');
        $this->assertGuest();
    }

    public function test_registration_rejects_a_weak_password(): void
    {
        $response = $this->from('/register')->post('/register', [
            'name' => 'Test User',
            'email' => 'weak@example.com',
            'country' => 'US',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors('password');
        $this->assertGuest();
    }

    public function test_registration_is_rate_limited(): void
    {
        // throttle:6,1 — the 7th request from the same IP within a minute is blocked,
        // independent of whether the payload is valid.
        for ($i = 0; $i < 6; $i++) {
            $this->post('/register', []);
        }

        $this->post('/register', [])->assertStatus(429);
    }

    public function test_registration_requires_a_country(): void
    {
        $response = $this->from('/register')->post('/register', [
            'name' => 'Test User',
            'email' => 'country@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors('country');
        $this->assertGuest();
    }

    public function test_registration_rejects_disposable_email(): void
    {
        $response = $this->from('/register')->post('/register', [
            'name' => 'Test User',
            'email' => 'throwaway@mailinator.com',
            'country' => 'US',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_registration_rejects_reserved_name(): void
    {
        $response = $this->from('/register')->post('/register', [
            'name' => 'Super Admin',
            'email' => 'real@example.com',
            'country' => 'US',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors('name');
        $this->assertGuest();
    }
}
