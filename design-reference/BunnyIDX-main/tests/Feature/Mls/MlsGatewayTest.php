<?php

declare(strict_types=1);

namespace Tests\Feature\Mls;

use App\Models\IdxConnection;
use App\Models\MlsProvider;
use App\Models\User;
use App\Services\Mls\Datasets\Bridge\BridgeDataset;
use App\Services\Mls\Datasets\MlsDataset;
use App\Services\Mls\Drivers\AbstractMlsDriver;
use App\Services\Mls\Dto\MlsCapabilities;
use App\Services\Mls\Dto\MlsFeed;
use App\Services\Mls\Dto\MlsListing;
use App\Services\Mls\Dto\MlsQuery;
use App\Services\Mls\Dto\MlsTaxonomyTerm;
use App\Services\Mls\MlsDatasetRegistry;
use App\Services\Mls\MlsDriverManager;
use App\Services\Mls\MlsGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Aggregation, dedup, sort, lifestyle, feed enforcement, compliance — pinned
 * with a fake in-memory driver so behaviour stays deterministic. Fake driver
 * returns canned listings; we assert on what the gateway does with them.
 */
class MlsGatewayTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();

        // Register two fake datasets backed by one fake driver — covers
        // single-MLS, multi-MLS, and per-MLS error scenarios in one fixture.
        $registry = app(MlsDatasetRegistry::class);
        $registry->register(new FakeDatasetAlpha());
        $registry->register(new FakeDatasetBeta());

        app(MlsDriverManager::class)->register(new FakeDriver());

        IdxConnection::create([
            'user_id' => $this->user->id, 'mls_slug' => 'fake-alpha',
            'display_name' => 'Fake Alpha', 'provider' => 'fake',
            'is_active' => true, 'test_status' => IdxConnection::STATUS_PASSED,
        ]);
        IdxConnection::create([
            'user_id' => $this->user->id, 'mls_slug' => 'fake-beta',
            'display_name' => 'Fake Beta', 'provider' => 'fake',
            'is_active' => true, 'test_status' => IdxConnection::STATUS_PASSED,
        ]);
    }

    public function test_default_search_fans_out_across_every_connected_dataset(): void
    {
        FakeDriver::$queue = [
            'fake-alpha' => [['id' => 'A1', 'price' => 500000], ['id' => 'A2', 'price' => 600000]],
            'fake-beta' => [['id' => 'B1', 'price' => 700000]],
        ];

        $r = app(MlsGateway::class)->search($this->user, new MlsQuery());

        $this->assertSame(3, count($r->listings));
        $this->assertSame(['fake-alpha' => 2, 'fake-beta' => 1], $r->perMlsTotal);
        $this->assertSame(3, $r->total);
        $this->assertSame([], $r->errors);
    }

    public function test_dataset_slugs_filter_restricts_fan_out(): void
    {
        FakeDriver::$queue = [
            'fake-alpha' => [['id' => 'A1', 'price' => 100]],
            'fake-beta' => [['id' => 'B1', 'price' => 200]],
        ];

        $r = app(MlsGateway::class)->search($this->user, new MlsQuery(), ['fake-alpha']);

        $this->assertSame(1, count($r->listings));
        $this->assertArrayHasKey('fake-alpha', $r->perMlsTotal);
        $this->assertArrayNotHasKey('fake-beta', $r->perMlsTotal);
    }

    public function test_per_mls_error_does_not_blank_response(): void
    {
        FakeDriver::$queue = [
            'fake-alpha' => [['id' => 'A1', 'price' => 500000]],
            'fake-beta' => '__error__:boom',
        ];

        $r = app(MlsGateway::class)->search($this->user, new MlsQuery());

        $this->assertSame(1, count($r->listings));
        $this->assertSame('A1', $r->listings[0]->mlsId);
        $this->assertSame('boom', $r->errors['fake-beta']);
        // Compliance is attached for EVERY contributing MLS, including errored ones.
        $this->assertArrayHasKey('fake-alpha', $r->compliance);
        $this->assertArrayHasKey('fake-beta', $r->compliance);
    }

    public function test_listings_dedup_on_slug_plus_id(): void
    {
        FakeDriver::$queue = [
            'fake-alpha' => [['id' => 'SHARED', 'price' => 100], ['id' => 'A2', 'price' => 200]],
            'fake-beta' => [['id' => 'SHARED', 'price' => 100], ['id' => 'B1', 'price' => 300]],
        ];

        $r = app(MlsGateway::class)->search($this->user, new MlsQuery());

        // Both MLSes returned SHARED — but different mls_slug means they're
        // distinct (cross-MLS data sharing). 4 listings expected.
        $this->assertSame(4, count($r->listings));
    }

    public function test_sort_price_desc_is_merge_sorted_across_mlses(): void
    {
        FakeDriver::$queue = [
            'fake-alpha' => [['id' => 'A1', 'price' => 100], ['id' => 'A2', 'price' => 500]],
            'fake-beta' => [['id' => 'B1', 'price' => 300], ['id' => 'B2', 'price' => 700]],
        ];

        $r = app(MlsGateway::class)->search(
            $this->user,
            new MlsQuery(sort: MlsQuery::SORT_PRICE_DESC),
        );

        $prices = array_map(fn ($l) => $l->price, $r->listings);
        $this->assertSame([700, 500, 300, 100], $prices);
    }

    public function test_unsupported_lifestyle_becomes_per_mls_error(): void
    {
        FakeDriver::$queue = [
            'fake-alpha' => [['id' => 'A1', 'price' => 100]],
            'fake-beta' => [['id' => 'B1', 'price' => 200]],
        ];

        $r = app(MlsGateway::class)->search(
            $this->user,
            MlsQuery::fromArray(['lifestyles' => ['alpha-only']]),
        );

        // alpha supports the lifestyle and returns a listing; beta errors.
        $this->assertSame(['fake-alpha' => 1], $r->perMlsTotal);
        $this->assertArrayHasKey('fake-beta', $r->errors);
        $this->assertStringContainsString('Lifestyle [alpha-only] not supported', $r->errors['fake-beta']);
    }

    public function test_vow_feed_rejected_when_dataset_only_supports_idx(): void
    {
        FakeDriver::$queue = [
            'fake-alpha' => [['id' => 'A1', 'price' => 100]],
            'fake-beta' => [['id' => 'B1', 'price' => 200]],
        ];

        $r = app(MlsGateway::class)->search(
            $this->user,
            new MlsQuery(feed: MlsFeed::VOW),
        );

        // Driver-level feed enforcement — neither fake dataset supports VOW.
        $this->assertSame([], $r->perMlsTotal);
        $this->assertArrayHasKey('fake-alpha', $r->errors);
        $this->assertArrayHasKey('fake-beta', $r->errors);
        foreach ($r->errors as $msg) {
            $this->assertStringContainsString('does not support [vow] feed', $msg);
        }
    }

    public function test_count_projection_returns_total_only_no_listings(): void
    {
        FakeDriver::$queue = [
            'fake-alpha' => [['id' => 'A1', 'price' => 100]],
            'fake-beta' => [['id' => 'B1', 'price' => 200]],
        ];

        $r = app(MlsGateway::class)->search(
            $this->user,
            new MlsQuery(projection: MlsQuery::PROJECTION_COUNT),
        );

        $this->assertSame([], $r->listings);
        $this->assertSame(2, $r->total);  // sum of per-MLS totals
    }

    public function test_taxonomy_unions_across_datasets_and_dedupes(): void
    {
        $tax = app(MlsGateway::class)->taxonomy($this->user, ['fake-alpha', 'fake-beta']);

        // Both datasets advertise 'Residential' — should appear once.
        $values = array_map(fn ($t) => $t->value, $tax->propertyTypes);
        $this->assertCount(array_count_values($values)['Residential'] ?? 0, ['Residential']);
        $this->assertContains('Residential', $values);
        $this->assertContains('Land', $values);     // only alpha
        $this->assertContains('Commercial', $values); // only beta
    }

    public function test_list_available_datasets_includes_capabilities_and_lifestyles(): void
    {
        $datasets = app(MlsGateway::class)->listAvailableDatasets($this->user);

        $this->assertCount(2, $datasets);
        $alpha = collect($datasets)->firstWhere('slug', 'fake-alpha');
        $this->assertSame('fake-alpha', $alpha['slug']);
        $this->assertSame('fake', $alpha['driver']);
        $this->assertContains('idx', $alpha['supported_feeds']);
        $this->assertContains('alpha-only', $alpha['supported_lifestyles']);
        $this->assertTrue($alpha['capabilities']['supports_agent_scoping']);
    }
}

/* ─── Fake driver + datasets — in-memory test doubles ──────────────── */

class FakeDriver extends AbstractMlsDriver
{
    /** @var array<string,mixed> Queue of canned responses keyed by mls_slug. */
    public static array $queue = [];

    public function getName(): string { return 'fake'; }
    public function capabilities(): MlsCapabilities {
        return new MlsCapabilities(
            supportsAgentScoping: true, supportsOfficeScoping: true,
        );
    }

    protected function callSearch(MlsDataset $dataset, IdxConnection $connection, MlsQuery $query, array $filters): array
    {
        $slug = $dataset->getSlug();
        $canned = self::$queue[$slug] ?? [];
        if (is_string($canned) && str_starts_with($canned, '__error__:')) {
            return ['error' => substr($canned, strlen('__error__:'))];
        }
        $listings = array_map(static fn ($item) => [
            'mls_id' => $item['id'], 'mls_number' => $item['id'], 'mls_slug' => $slug,
            'price' => $item['price'] ?? 0, 'status' => 'Active',
            'address' => ['full' => $item['id']],
        ], $canned);
        return ['listings' => $listings, 'total' => count($listings)];
    }

    protected function callGet(MlsDataset $dataset, IdxConnection $connection, string $listingId): ?array
    {
        return null;
    }
}

abstract class FakeDataset extends MlsDataset
{
    public function getDriver(): string { return 'fake'; }
    public function getDatasetPath(MlsFeed $feed = MlsFeed::IDX): string { return $this->getSlug(); }
    public function supportedFeeds(): array { return [MlsFeed::IDX]; }
}

class FakeDatasetAlpha extends FakeDataset
{
    public function getSlug(): string { return 'fake-alpha'; }
    public function getDisplayName(): string { return 'Fake Alpha MLS'; }
    public function getPropertyTypes(): array {
        return [new MlsTaxonomyTerm('Residential', 'Residential'), new MlsTaxonomyTerm('Land', 'Land')];
    }
    public function getSupportedLifestyles(): array { return ['alpha-only', 'shared']; }
    public function translateLifestyle(string $lifestyle): ?array {
        return match ($lifestyle) {
            'alpha-only' => ['raw_filter' => 'AlphaFlag eq true'],
            'shared' => ['min_price' => 100000],
            default => null,
        };
    }
}

class FakeDatasetBeta extends FakeDataset
{
    public function getSlug(): string { return 'fake-beta'; }
    public function getDisplayName(): string { return 'Fake Beta MLS'; }
    public function getPropertyTypes(): array {
        return [new MlsTaxonomyTerm('Residential', 'Residential'), new MlsTaxonomyTerm('Commercial', 'Commercial')];
    }
    public function getSupportedLifestyles(): array { return ['shared']; }
    public function translateLifestyle(string $lifestyle): ?array {
        return match ($lifestyle) {
            'shared' => ['min_price' => 100000],
            default => null,
        };
    }
}
