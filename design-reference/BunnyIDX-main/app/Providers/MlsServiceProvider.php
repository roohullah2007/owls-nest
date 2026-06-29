<?php

declare(strict_types=1);

namespace App\Providers;

use App\Services\Mls\Datasets\Bridge\MiamiReMls;
use App\Services\Mls\Datasets\Bridge\StellarMls;
use App\Services\Mls\Datasets\Paragon\PrimeMls;
use App\Services\Mls\Datasets\Realtyna\BeachesMls;
use App\Services\Mls\Drivers\BridgeDriver;
use App\Services\Mls\Drivers\ParagonDriver;
use App\Services\Mls\Drivers\RealtynaDriver;
use App\Services\Mls\MlsDatasetRegistry;
use App\Services\Mls\MlsDriverManager;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\ServiceProvider;

/**
 * Wires the unified MLS architecture.
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

        $manager->register($app->make(BridgeDriver::class));
        $manager->register($app->make(RealtynaDriver::class));
        $manager->register($app->make(ParagonDriver::class));
        // Repliers driver lands in a follow-up.
    }

    private function registerDatasets(Application $app): void
    {
        /** @var MlsDatasetRegistry $registry */
        $registry = $app->make(MlsDatasetRegistry::class);

        // Bridge-backed MLSes
        $registry->register(new MiamiReMls);
        $registry->register(new StellarMls);

        // Realtyna-backed MLSes
        $registry->register(new BeachesMls);

        // Paragon-backed MLSes
        $registry->register(new PrimeMls);
    }
}
