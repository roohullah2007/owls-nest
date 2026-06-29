<?php

declare(strict_types=1);

namespace App\Services\Mls;

use App\Services\Mls\Drivers\MlsDriver;
use InvalidArgumentException;

/**
 * Registry of MlsDrivers, keyed by driver name (`bridge`, `realtyna`, etc.).
 * Service-provider populated at boot. Adding a provider = one `register()` call.
 */
final class MlsDriverManager
{
    /** @var array<string, MlsDriver> */
    private array $drivers = [];

    public function register(MlsDriver $driver): void
    {
        $this->drivers[$driver->getName()] = $driver;
    }

    public function driver(string $name): ?MlsDriver
    {
        return $this->drivers[$name] ?? null;
    }

    public function require(string $name): MlsDriver
    {
        return $this->drivers[$name]
            ?? throw new InvalidArgumentException("No MlsDriver registered for [$name].");
    }

    public function has(string $name): bool
    {
        return isset($this->drivers[$name]);
    }

    /** @return array<string, MlsDriver> */
    public function all(): array
    {
        return $this->drivers;
    }
}
