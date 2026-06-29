<?php

namespace Database\Seeders;

use App\Models\CondoBuilding;
use Illuminate\Database\Seeder;

/**
 * Sample Florida condo buildings for the platform Condo Directory (rendered
 * on agent sites at /condos). Real completed buildings with hot-linked cover
 * photos — dev/test data, safe to re-run (upserts by slug).
 */
class CondoBuildingSeeder extends Seeder
{
    public function run(): void
    {
        $buildings = [
            [
                'name' => 'Oceana Bal Harbour',
                'slug' => 'oceana-bal-harbour',
                'area' => 'Bal Harbour',
                'city' => 'Bal Harbour',
                'address' => '10201 Collins Avenue, Bal Harbour, FL',
                'image' => 'https://media.pandaidx.com/platform/images/new-developments/cover/5f8482cdc8aca827abdc0867/e9beb849-9a1d-4b33-a9cd-31324db32833.jpg',
                'description' => "Oceana Bal Harbour's resort-style amenities allow you to create your own 5-star experience without ever having to leave home. With a 24-hour concierge, poolside restaurant, world-class spa, cabanas, oversized pools and more, every detail has been taken care of to make your home a lavish beachfront retreat.",
                'mls_keyword' => 'Oceana Bal Harbour',
                'lat' => 25.8951677,
                'lng' => -80.12315,
                'sort_order' => 1,
            ],
            [
                'name' => 'ALINA Residences',
                'slug' => 'alina-residences',
                'area' => 'Boca Raton',
                'city' => 'Boca Raton',
                'address' => '200 Southeast Mizner Boulevard, Boca Raton, FL',
                'image' => 'https://media.pandaidx.com/platform/images/new-developments/cover/613661580c05b80015e3e3e2/249bf79d-9d71-40f1-a60c-818930ec76df.jpg',
                'description' => "ALINA's sophisticated standards of hospitality and amenities heighten the beauty of everyday living. Indulge in over 32,000 square feet of private outdoor amenities, from a refreshing rooftop pool to lush gardens, in the heart of downtown Boca Raton.",
                'mls_keyword' => 'Alina',
                'lat' => 26.3476789,
                'lng' => -80.0826076,
                'sort_order' => 1,
            ],
            [
                'name' => 'Aventura ParkSquare',
                'slug' => 'aventura-parksquare',
                'area' => 'Aventura',
                'city' => 'Aventura',
                'address' => '2960 Northeast 207th Street, Aventura, FL',
                'image' => 'https://media.pandaidx.com/platform/images/new-developments/cover/5f8482cdc8aca827abdc0880/9f222be2-f9a1-4888-bbce-f6ffd98c87eb.jpg',
                'description' => 'Aventura ParkSquare is a center of life in Aventura, Florida — a walkable mixed-use destination combining luxury residences, high-end offices, a wellness center and a 55,000 sq. ft. retail promenade of restaurants and cafes.',
                'mls_keyword' => 'Aventura ParkSquare',
                'lat' => 25.9663031,
                'lng' => -80.1422914,
                'sort_order' => 1,
            ],
        ];

        foreach ($buildings as $building) {
            CondoBuilding::updateOrCreate(
                ['slug' => $building['slug']],
                $building + ['is_active' => true],
            );
        }
    }
}
