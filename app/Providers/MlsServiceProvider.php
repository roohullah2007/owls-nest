<?php

declare(strict_types=1);

namespace App\Providers;

use App\Services\Mls\Datasets\Paragon\PrimeMls;
use App\Services\Mls\Drivers\ParagonDriver;
use App\Services\Mls\MlsDatasetRegistry;
use App\Services\Mls\MlsDriverManager;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\ServiceProvider;

/**
 * Wires the unified MLS architecture (Paragon / PrimeMLS only in this build).
 *
 * To add a new MLS under an existing provider: subclass the right dataset base
 * and register it below. To add a new provider: implement MlsDriver and
 * register it. Do not edit any other files in app/Services/Mls/ — the layers
 * exist precisely so these are one-line changes (see feedback_mls_taxonomy).
 */
final class MlsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(MlsDriverManager::class);
        $this->app->singleton(MlsDatasetRegistry::class);
    }

    public function boot(): void
    {
        $this->registerDrivers($this->app);
        $this->registerDatasets($this->app);
    }

    private function registerDrivers(Application $app): void
    {
        /** @var MlsDriverManager $manager */
        $manager = $app->make(MlsDriverManager::class);

        $manager->register($app->make(ParagonDriver::class));
    }

    private function registerDatasets(Application $app): void
    {
        /** @var MlsDatasetRegistry $registry */
        $registry = $app->make(MlsDatasetRegistry::class);

        // Paragon-backed MLSes
        $registry->register(new PrimeMls);
    }
}
