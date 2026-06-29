<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorDisableTest extends TestCase
{
    use RefreshDatabase;

    private string $secret;

    /**
     * A user with 2FA enabled. The password is the random one an OAuth user
     * would get — it is never known to the caller in the code-path tests.
     */
    private function userWithTwoFactor(array $overrides = []): User
    {
        $this->secret = (new Google2FA())->generateSecretKey();

        return User::factory()->create(array_merge([
            'password' => bcrypt('known-Password-1!'),
            'two_factor_secret' => $this->secret,
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => ['aaaaa-bbbbb', 'ccccc-ddddd'],
        ], $overrides));
    }

    private function totp(): string
    {
        return (new Google2FA())->getCurrentOtp($this->secret);
    }

    public function test_disable_with_correct_password(): void
    {
        $user = $this->userWithTwoFactor();

        $this->actingAs($user)
            ->deleteJson(route('crm.security.2fa.disable'), ['password' => 'known-Password-1!'])
            ->assertOk();

        $this->assertFalse($user->fresh()->hasTwoFactorEnabled());
    }

    public function test_disable_with_wrong_password_fails(): void
    {
        $user = $this->userWithTwoFactor();

        $this->actingAs($user)
            ->deleteJson(route('crm.security.2fa.disable'), ['password' => 'nope'])
            ->assertStatus(422);

        $this->assertTrue($user->fresh()->hasTwoFactorEnabled());
    }

    public function test_oauth_user_can_disable_with_totp_code(): void
    {
        // OAuth user: never set a password, only has 2FA. Must still be able to disable.
        $user = $this->userWithTwoFactor(['google_id' => '1234567890']);

        $this->actingAs($user)
            ->deleteJson(route('crm.security.2fa.disable'), ['code' => $this->totp()])
            ->assertOk();

        $this->assertFalse($user->fresh()->hasTwoFactorEnabled());
    }

    public function test_disable_with_recovery_code(): void
    {
        $user = $this->userWithTwoFactor();

        $this->actingAs($user)
            ->deleteJson(route('crm.security.2fa.disable'), ['code' => 'ccccc-ddddd'])
            ->assertOk();

        $this->assertFalse($user->fresh()->hasTwoFactorEnabled());
    }

    public function test_disable_with_invalid_code_fails(): void
    {
        $user = $this->userWithTwoFactor();

        $this->actingAs($user)
            ->deleteJson(route('crm.security.2fa.disable'), ['code' => '000000'])
            ->assertStatus(422);

        $this->assertTrue($user->fresh()->hasTwoFactorEnabled());
    }

    public function test_disable_without_password_or_code_fails(): void
    {
        $user = $this->userWithTwoFactor();

        $this->actingAs($user)
            ->deleteJson(route('crm.security.2fa.disable'), [])
            ->assertStatus(422);

        $this->assertTrue($user->fresh()->hasTwoFactorEnabled());
    }
}
