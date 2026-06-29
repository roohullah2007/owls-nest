<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\AreaCodePrice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AreaCodePricingTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_settings_page_loads_for_admin(): void
    {
        AreaCodePrice::create(['area_code' => '305', 'monthly_price' => 5.00, 'label' => 'Miami']);
        AreaCodePrice::create(['area_code' => null, 'monthly_price' => 2.00, 'label' => 'All area codes']);

        $this->actingAs($this->admin())
            ->get(route('admin.settings'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Settings/Index')
                ->has('areaCodePrices', 1) // default row excluded from the list
                ->where('areaCodePrices.0.area_code', '305')
                ->where('defaultPrice', '2.00')
            );
    }

    public function test_non_admin_is_forbidden(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('admin.settings'))
            ->assertForbidden();
    }

    public function test_admin_can_create_and_update_and_delete_override(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('admin.settings.area-code-pricing.store'), [
                'area_code' => '512',
                'monthly_price' => '3.50',
                'label' => 'Austin',
                'is_active' => true,
            ])
            ->assertRedirect();

        $price = AreaCodePrice::firstWhere('area_code', '512');
        $this->assertNotNull($price);
        $this->assertSame('3.50', $price->monthly_price);

        $this->actingAs($admin)
            ->patch(route('admin.settings.area-code-pricing.update', $price->id), [
                'area_code' => '512',
                'monthly_price' => '4.25',
                'label' => 'Austin, TX',
                'is_active' => false,
            ])
            ->assertRedirect();

        $price->refresh();
        $this->assertSame('4.25', $price->monthly_price);
        $this->assertFalse($price->is_active);

        $this->actingAs($admin)
            ->delete(route('admin.settings.area-code-pricing.destroy', $price->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('area_code_prices', ['id' => $price->id]);
    }

    public function test_duplicate_area_code_is_rejected(): void
    {
        AreaCodePrice::create(['area_code' => '305', 'monthly_price' => 5.00]);

        $this->actingAs($this->admin())
            ->post(route('admin.settings.area-code-pricing.store'), [
                'area_code' => '305',
                'monthly_price' => '9.00',
            ])
            ->assertSessionHasErrors('area_code');
    }

    public function test_admin_can_set_and_clear_default_price(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('admin.settings.area-code-pricing.default'), ['monthly_price' => '2.50'])
            ->assertRedirect();

        $this->assertSame('2.50', AreaCodePrice::defaultPrice());
        $this->assertDatabaseHas('area_code_prices', ['area_code' => null, 'monthly_price' => '2.50']);

        // Saving again updates the single default row, not creating a second.
        $this->actingAs($admin)
            ->post(route('admin.settings.area-code-pricing.default'), ['monthly_price' => '3.00'])
            ->assertRedirect();

        $this->assertSame(1, AreaCodePrice::whereNull('area_code')->count());
        $this->assertSame('3.00', AreaCodePrice::defaultPrice());

        // Empty clears it.
        $this->actingAs($admin)
            ->post(route('admin.settings.area-code-pricing.default'), ['monthly_price' => ''])
            ->assertRedirect();

        $this->assertNull(AreaCodePrice::defaultPrice());
        $this->assertSame(0, AreaCodePrice::whereNull('area_code')->count());
    }

    public function test_search_prefers_specific_then_default_then_telnyx(): void
    {
        $user = User::factory()->create(['subscription_tier' => 'pro']);
        config(['telnyx.api_key' => 'KEYtest', 'telnyx.messaging_profile_id' => 'mp_test']);

        Http::fake([
            '*available_phone_numbers*' => Http::response([
                'data' => [[
                    'phone_number' => '+13055551234',
                    'cost_information' => ['monthly_cost' => '1.00'],
                    'features' => ['sms', 'voice'],
                ]],
            ], 200),
        ]);

        // 1) No overrides → Telnyx cost.
        $this->actingAs($user)
            ->getJson(route('crm.phone-numbers.search', ['area_code' => '305']))
            ->assertJsonPath('numbers.0.monthly_cost', '1.00');

        // 2) Default set → default applies everywhere.
        AreaCodePrice::create(['area_code' => null, 'monthly_price' => 2.00, 'is_active' => true]);
        $this->actingAs($user)
            ->getJson(route('crm.phone-numbers.search', ['area_code' => '305']))
            ->assertJsonPath('numbers.0.monthly_cost', '2.00');

        // 3) Specific override → wins over the default.
        AreaCodePrice::create(['area_code' => '305', 'monthly_price' => 7.00, 'is_active' => true]);
        $this->actingAs($user)
            ->getJson(route('crm.phone-numbers.search', ['area_code' => '305']))
            ->assertJsonPath('numbers.0.monthly_cost', '7.00');
    }

    public function test_inactive_override_falls_back_to_default(): void
    {
        AreaCodePrice::create(['area_code' => null, 'monthly_price' => 2.00, 'is_active' => true]);
        AreaCodePrice::create(['area_code' => '305', 'monthly_price' => 7.00, 'is_active' => false]);

        $this->assertSame('2.00', AreaCodePrice::priceFor('305'));
    }
}
