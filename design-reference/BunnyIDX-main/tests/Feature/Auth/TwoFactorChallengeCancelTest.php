<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TwoFactorChallengeCancelTest extends TestCase
{
    use RefreshDatabase;

    public function test_cancel_clears_pending_login_and_redirects_to_login(): void
    {
        $this->withSession(['login.id' => 123, 'login.remember' => true])
            ->post(route('two-factor.cancel'))
            ->assertRedirect(route('login'))
            ->assertSessionMissing('login.id');

        $this->assertGuest();
    }
}
