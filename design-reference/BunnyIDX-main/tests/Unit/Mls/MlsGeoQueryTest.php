<?php

declare(strict_types=1);

namespace Tests\Unit\Mls;

use App\Services\Mls\Dto\MlsGeoQuery;
use PHPUnit\Framework\TestCase;

class MlsGeoQueryTest extends TestCase
{
    public function test_validates_mutually_exclusive_modes(): void
    {
        // Two modes set — error.
        $q = new MlsGeoQuery(
            polygon: [[0,0],[1,0],[1,1]],
            bounds: ['ne_lat' => 1, 'ne_lng' => 1, 'sw_lat' => 0, 'sw_lng' => 0],
        );
        $this->assertStringContainsString('only one of', $q->validate() ?? '');
    }

    public function test_polygon_requires_three_vertices(): void
    {
        $q = new MlsGeoQuery(polygon: [[0,0],[1,1]]);
        $this->assertStringContainsString('at least 3', $q->validate() ?? '');
    }

    public function test_near_requires_positive_radius(): void
    {
        $q = new MlsGeoQuery(near: ['lat' => 25.79, 'lng' => -80.13, 'radius_miles' => 0]);
        $this->assertStringContainsString('radius_miles', $q->validate() ?? '');
    }

    public function test_valid_query_returns_null_from_validate(): void
    {
        $this->assertNull((new MlsGeoQuery(polygon: [[0,0],[1,0],[1,1]]))->validate());
        $this->assertNull((new MlsGeoQuery(bounds: ['ne_lat'=>1,'ne_lng'=>1,'sw_lat'=>0,'sw_lng'=>0]))->validate());
        $this->assertNull((new MlsGeoQuery(near: ['lat'=>25,'lng'=>-80,'radius_miles'=>1]))->validate());
    }

    public function test_from_array_returns_null_when_empty(): void
    {
        $this->assertNull(MlsGeoQuery::fromArray(null));
        $this->assertNull(MlsGeoQuery::fromArray([]));
        $this->assertNull(MlsGeoQuery::fromArray(['polygon' => null, 'bounds' => null, 'near' => null]));
    }

    public function test_to_array_drops_unset_modes(): void
    {
        $arr = (new MlsGeoQuery(near: ['lat' => 25, 'lng' => -80, 'radius_miles' => 1]))->toArray();
        $this->assertArrayHasKey('near', $arr);
        $this->assertArrayNotHasKey('polygon', $arr);
        $this->assertArrayNotHasKey('bounds', $arr);
    }
}
