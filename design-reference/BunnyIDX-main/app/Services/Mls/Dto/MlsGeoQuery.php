<?php

declare(strict_types=1);

namespace App\Services\Mls\Dto;

/**
 * Geographic search constraints. Mutually exclusive at the OData level — set
 * one of {polygon, bounds, near}, not multiple. Bridge supports all three via
 * `geo.intersects()`. Validation lives in `validate()` so the gateway can
 * surface a clear error rather than building an invalid OData filter.
 *
 *  - polygon: GeoJSON-style closed ring [[lng, lat], [lng, lat], ...]
 *  - bounds: NE+SW corner box (map viewport)
 *  - near:   point + radius in miles (radius search)
 */
final readonly class MlsGeoQuery
{
    public function __construct(
        /** @var array<int, array{0: float, 1: float}>|null GeoJSON ring (lng,lat pairs). */
        public ?array $polygon = null,
        /** @var array{ne_lat: float, ne_lng: float, sw_lat: float, sw_lng: float}|null */
        public ?array $bounds = null,
        /** @var array{lat: float, lng: float, radius_miles: float}|null */
        public ?array $near = null,
    ) {}

    public function isEmpty(): bool
    {
        return $this->polygon === null && $this->bounds === null && $this->near === null;
    }

    /** Returns null if valid, or an error message if not. */
    public function validate(): ?string
    {
        $set = array_filter([$this->polygon, $this->bounds, $this->near]);
        if (count($set) > 1) {
            return 'MlsGeoQuery: only one of polygon, bounds, near may be set.';
        }
        if ($this->polygon !== null && count($this->polygon) < 3) {
            return 'MlsGeoQuery.polygon: at least 3 vertices required.';
        }
        if ($this->near !== null && (($this->near['radius_miles'] ?? 0) <= 0)) {
            return 'MlsGeoQuery.near: radius_miles must be > 0.';
        }
        return null;
    }

    public function toArray(): array
    {
        return array_filter([
            'polygon' => $this->polygon,
            'bounds' => $this->bounds,
            'near' => $this->near,
        ], static fn ($v) => $v !== null);
    }

    public static function fromArray(?array $a): ?self
    {
        if (!$a || !is_array($a)) {
            return null;
        }
        $q = new self(
            polygon: isset($a['polygon']) && is_array($a['polygon']) ? $a['polygon'] : null,
            bounds: isset($a['bounds']) && is_array($a['bounds']) ? $a['bounds'] : null,
            near: isset($a['near']) && is_array($a['near']) ? $a['near'] : null,
        );
        return $q->isEmpty() ? null : $q;
    }
}
