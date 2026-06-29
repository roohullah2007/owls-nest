<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class AuthLockoutTest extends TestCase
{
    use RefreshDatabase;

    /* ===================== Password login ===================== */

    public function test_account_locks_after_three_wrong_passwords(): void
    {
        $user = User::factory()->create(['password' => Hash::make('Correct!Pass1')]);

        for ($i = 0; $i < 3; $i++) {
            $this->post('/login', ['email' => $user->email, 'password' => 'wrong']);
        }

        $this->assertTrue($user->fresh()->isLocked(), 'Account should be locked after 3 failures.');

        // Even the CORRECT password is now rejected while locked.
        $this->post('/login', ['email' => $user->email, 'password' => 'Correct!Pass1'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_lock_auto_expires_after_the_window(): void
    {
        $user = User::factory()->create(['password' => Hash::make('Correct!Pass1')]);

        for ($i = 0; $i < 3; $i++) {
            $this->post('/login', ['email' => $user->email, 'password' => 'wrong']);
        }
        $this->assertTrue($user->fresh()->isLocked());

        // Past the lock window the correct password works again.
        $this->travel(User::LOCK_MINUTES + 1)->minutes();

        $this->post('/login', ['email' => $user->email, 'password' => 'Correct!Pass1']);
        $this->assertAuthenticatedAs($user->fresh());
    }

    public function test_successful_login_resets_the_failure_counter(): void
    {
        $user = User::factory()->create(['password' => Hash::make('Correct!Pass1')]);

        // Two misses (below the limit), then a success.
        $this->post('/login', ['email' => $user->email, 'password' => 'wrong']);
        $this->post('/login', ['email' => $user->email, 'password' => 'wrong']);
        $this->assertSame(2, $user->fresh()->failed_login_attempts);

        $this->post('/login', ['email' => $user->email, 'password' => 'Correct!Pass1']);

        $this->assertSame(0, $user->fresh()->failed_login_attempts);
        $this->assertNull($user->fresh()->locked_until);
    }

    /* ===================== 2FA challenge ===================== */

    public function test_two_factor_locks_after_three_wrong_codes(): void
    {
        $secret = (new Google2FA())->generateSecretKey();
        $user = User::factory()->create([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        for ($i = 0; $i < 3; $i++) {
            $this->withSession(['login.id' => $user->id])
                ->post(route('two-factor.login'), ['code' => '000000']);
        }

        $this->assertTrue($user->fresh()->isLocked(), '2FA should lock the account after 3 wrong codes.');
        $this->assertGuest();
    }

    public function test_two_factor_lock_also_blocks_password_login(): void
    {
        $secret = (new Google2FA())->generateSecretKey();
        $user = User::factory()->create([
            'password' => Hash::make('Correct!Pass1'),
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        for ($i = 0; $i < 3; $i++) {
            $this->withSession(['login.id' => $user->id])
                ->post(route('two-factor.login'), ['code' => '000000']);
        }
        $this->assertTrue($user->fresh()->isLocked());

        // The account-wide lock blocks the password path too.
        $this->post('/login', ['email' => $user->email, 'password' => 'Correct!Pass1'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();
    }
}
