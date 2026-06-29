<?php

namespace Database\Seeders;

use App\Models\Developer;
use App\Models\NewDevelopment;
use Illuminate\Database\Seeder;

/**
 * Sample Florida pre-construction projects for the platform New Developments
 * catalog (rendered on agent sites at /new-developments). Real projects with
 * hot-linked cover photos — dev/test data, safe to re-run (upserts by slug).
 */
class NewDevelopmentSeeder extends Seeder
{
    public function run(): void
    {
        $developments = [
            [
                'name' => 'Baccarat Residences',
                'slug' => 'baccarat-residences',
                'area' => 'Brickell',
                'city' => 'Miami',
                'address' => '444 Brickell Avenue, Miami, FL',
                'image' => 'https://media.pandaidx.com/platform/images/new-developments/cover/60c8c221b0c00a001511dd9b/2f725c63-1e77-4142-9dce-a3bb0cb7faa0.png',
                'description' => "Baccarat proudly presents its first collection of residences to the Miami market. Illuminated by the infinite shimmer of the sun, this soaring tower will stand radiant on the waterfront where the river meets the bay, in the heart of the glittering lights of the city.\n\nCombining the best of Brickell with enlightened design, artful service and enlivening waterfront amenities, residents can expect a lifestyle infused with laid-back glamour and limitless luxury — the ultimate expression of one of the world's most rarefied aesthetics, refined over centuries and perfected in the heart of Brickell.\n\nResidences feature open-concept, flow-through contemporary floor plans with one to four bedrooms and penthouses, private key-activated elevator access, energy-efficient floor-to-ceiling glass with panoramic views of Biscayne Bay and the Miami skyline, and expansive eight-foot-deep terraces with glass railings.\n\nThe amenity collection spans a curated museum-quality art program throughout the public spaces, a 12th-level resort deck with a zero-entry heated saline pool and cabanas, a Hammam spa, a gourmet market, a wine cellar and tasting room, and Baccarat's signature artful service.",
                'developer_info' => "Related Group is Florida's leading developer of sophisticated metropolitan living, founded in 1979 by Jorge M. Pérez. With more than 100,000 residences built, the firm has shaped the skylines of Miami and cities across the world, partnering with celebrated architects, designers and global luxury brands to deliver condominium towers of enduring value.",
                'deposit_schedule' => ['20% at Contract', '10% at Groundbreaking', '10% at Top Off', '60% at Closing'],
                'developer' => 'Related Group',
                'architect' => 'Arquitectonica',
                'interior_design' => 'Meyer Davis Studio',
                'logo' => 'https://media.pandaidx.com/platform/images/new-developments/logo/60c8c221b0c00a001511dd9b/b01c9124-3247-4306-81ad-ec70af265158.png',
                'gallery' => [
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/60c8c221b0c00a001511dd9b/57adc0c1-2f02-473b-afda-8a0252fc87ea.png',
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/60c8c221b0c00a001511dd9b/e438b5ef-4ad9-43b5-b286-cccf64023077.png',
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/60c8c221b0c00a001511dd9b/e3e876b0-2165-4999-a6e4-2daeaf49246a.png',
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/60c8c221b0c00a001511dd9b/d1f94501-0561-41fc-9670-bc3f74a67ffa.png',
                ],
                'key_details' => [
                    ['label' => 'Price Range', 'value' => '$1.7M – $12M'],
                    ['label' => 'HOA', 'value' => '$1.85 per Sq.Ft.'],
                    ['label' => 'Sq Ft Area', 'value' => '1,520–4,300 ft²'],
                    ['label' => 'Units', 'value' => '360'],
                    ['label' => 'Stories', 'value' => '75'],
                    ['label' => 'Year Built', 'value' => '2028'],
                ],
                'status' => 'under-construction',
                'completion_year' => '2028',
                'price_label' => 'From $1.7M',
                'highlights' => [
                    'Curated museum-quality art collection throughout the public spaces',
                    '12th-level resort deck with zero-entry heated saline pool, outdoor spa and cabanas',
                    'Hammam spa with steam, sauna and treatment rooms',
                    'Private key-activated elevator access to every residence',
                    'Floor-to-ceiling glass with panoramic Biscayne Bay and skyline views',
                    'Gourmet market, wine cellar and tasting room',
                ],
                'lat' => 25.7690781,
                'lng' => -80.1903233,
                'sort_order' => 1,
            ],
            [
                'name' => 'Rivage Bal Harbour',
                'slug' => 'rivage-bal-harbour',
                'area' => 'Bal Harbour',
                'city' => 'Bal Harbour',
                'address' => '10245 Collins Avenue, Bal Harbour, FL',
                'image' => 'https://media.pandaidx.com/platform/images/new-developments/cover/65fc7d73681f1d75b6bb825d/ebd1af29-5304-47f4-8fc7-15f53f81ccb5.jpg',
                'description' => "Perfectly poised on the country's most beautiful stretch of beach, Rivage Bal Harbour rises from the lush tropical landscape, a beacon of modern living. This minimal collection of bespoke residences offers a luxurious life immersed in nature, mere steps from the ocean on the last beachfront property to be developed in Bal Harbour.\n\nThese light-filled villas in the sky provide elevated services and amenities on par with the world's finest hotels — a refined and considered approach to total well-being, designed by SOM with interiors by Rottet Studio.\n\nEach residence enjoys direct private-elevator entry, 10-foot ceilings, floor-to-ceiling windows and terraces up to 12 feet deep with direct views of the Atlantic Ocean and Biscayne Bay. Custom kitchens carry the Sub-Zero and Wolf appliance suite; bathroom and closet suites feature marble, white oak and Dornbracht fixtures.\n\nAmenities include a signature oceanfront dining experience exclusively for residents, an activities deck with resort-style pools and cabanas, the Rivage spa with sauna, hammam and plunge pools, a fully serviced beach club, and an oceanview fitness center with yoga studio.",
                'developer_info' => 'Two Roads Development is a Miami-based real estate firm specializing in ultra-luxury waterfront condominiums. Led by industry veterans with decades of experience, the firm is known for landmark projects such as Elysee Miami and Forte on Flagler, pairing world-class architects with uncompromising beachfront locations.',
                'deposit_schedule' => ['20% at Contract', '10% at Groundbreaking', '10% at Top Off', '60% at Closing'],
                'developer' => 'Two Roads Development',
                'architect' => 'SOM',
                'interior_design' => 'Rottet Studio',
                'logo' => 'https://media.pandaidx.com/platform/images/new-developments/logo/65fc7d73681f1d75b6bb825d/02b01566-b782-4a89-ae90-be0e033e553f.png',
                'gallery' => [
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/65fc7d73681f1d75b6bb825d/c370c070-74cb-4bad-ad15-0b6fd77276d7.jpg',
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/65fc7d73681f1d75b6bb825d/b753dc7b-fd58-4bd7-aa7d-64d60f654b65.jpg',
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/65fc7d73681f1d75b6bb825d/58b5e29f-ff57-4285-aad8-30b4f3dc06e8.jpg',
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/65fc7d73681f1d75b6bb825d/023997c3-89e7-41a2-bb05-654b847a4e38.jpg',
                ],
                'key_details' => [
                    ['label' => 'Stories', 'value' => '24'],
                    ['label' => 'Residences', 'value' => '56'],
                    ['label' => 'Ceilings', 'value' => '10 ft'],
                    ['label' => 'Terraces', 'value' => 'Up to 12 ft deep'],
                ],
                'status' => 'under-construction',
                'completion_year' => '2027',
                'price_label' => 'From $13M',
                'highlights' => [
                    'Direct private-elevator entry to each residence',
                    '10-foot ceilings and floor-to-ceiling windows',
                    'Terraces up to 12 feet deep with Atlantic Ocean and Biscayne Bay views',
                    'Signature oceanfront dining exclusively for residents and their guests',
                    'Resort-style pools, outdoor spa and a fully serviced beach club',
                    'Ocean-view fitness center with high-impact training room and yoga studio',
                ],
                'mls_keyword' => 'Rivage',
                'lat' => 25.8971319,
                'lng' => -80.1232277,
                'sort_order' => 1,
            ],
            [
                'name' => 'AVENIA by FENDI Casa',
                'slug' => 'avenia-by-fendi-casa',
                'area' => 'Aventura',
                'city' => 'Aventura',
                'address' => '20605 Northeast 34th Avenue, Aventura, FL',
                'image' => 'https://media.pandaidx.com/platform/images/new-developments/cover/69973296075850c21d84e5f1/6c4e5e3a-9015-4ad3-88cd-1a6a089732fb.png',
                'description' => "Distinctly modern living with signature style. A limited collection of 22 residences set on a serene Aventura waterway and the edge of a famed golf course.\n\nCurated by FENDI Casa and inspired by the maison's artisanal heritage and modern vision, Avenia is where high design meets savoir-faire, for a new living experience that comes to life with precision, glamour and a splash of the unexpected.\n\nExceptional half-floor residences offer three exposures, expansive three- and four-bedroom floor plans, private elevator lobbies and signature FENDI design details throughout — from the arched entryways to Italian-made walk-in closets and gourmet kitchens with European stone countertops and the Sub-Zero and Wolf appliance suite.\n\nThe atrium lobby welcomes residents with a porte-cochère framed by Roman columns, private reception with concierge services, a marina lounge with coffee bar, and a linear park planted with native South Florida flora along the waterway paseo.",
                'developer_info' => 'Vertical Development is a boutique South Florida developer focused on limited-edition luxury residences in collaboration with global design houses. Its projects pair intimate scale with hotel-grade services, working alongside architects such as Kobi Karp and brands like FENDI Casa.',
                'deposit_schedule' => ['10% at Reservation', '10% at Contract', '10% at Groundbreaking', '70% at Closing'],
                'developer' => 'Vertical Development',
                'architect' => 'Kobi Karp',
                'interior_design' => 'FENDI Casa',
                'logo' => 'https://media.pandaidx.com/platform/images/new-developments/logo/69973296075850c21d84e5f1/1399266c-e8d9-46c3-83df-7929210a956f.png',
                'gallery' => [
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/69973296075850c21d84e5f1/ff02726c-dc48-4c1a-b15e-1a2a0103c713.jpg',
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/69973296075850c21d84e5f1/5b0764cc-4297-4d21-b881-415250382288.jpg',
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/69973296075850c21d84e5f1/163ea7ca-0f6f-4ba3-8bbf-cefedf1a7592.jpg',
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/69973296075850c21d84e5f1/9fdc39df-9423-4cc8-a922-b4f20e7c98b3.jpg',
                ],
                'key_details' => [
                    ['label' => 'Residences', 'value' => '22'],
                    ['label' => 'Layout', 'value' => 'Half-floor, 3 exposures'],
                    ['label' => 'Bedrooms', 'value' => '3–4'],
                    ['label' => 'Parking', 'value' => '2–3 assigned spaces'],
                ],
                'status' => 'pre-construction',
                'completion_year' => '2027',
                'price_label' => 'From $5.2M',
                'highlights' => [
                    'Exceptional half-floor residences with three exposures',
                    'Private elevator lobby for each residence',
                    'Gourmet kitchens by FENDI Casa with European stone countertops',
                    'Sub-Zero and Wolf appliance suite',
                    'FENDI-branded Italian-made walk-in closets',
                    'Marina lounge and waterway paseo with native South Florida flora',
                ],
                'mls_keyword' => 'Avenia',
                'lat' => 25.9667346,
                'lng' => -80.1334134,
                'sort_order' => 1,
            ],
            [
                'name' => 'Mandarin Oriental Residences',
                'slug' => 'mandarin-oriental-residences-boca-raton',
                'area' => 'Boca Raton',
                'city' => 'Boca Raton',
                'address' => '10 East Boca Raton Road, Boca Raton, FL',
                'image' => 'https://media.pandaidx.com/platform/images/new-developments/cover/5f8482cdc8aca827abdc0882/a156b269-f1d6-4351-8604-1cdb6b2918a2.png',
                'description' => "Five-star living means having every detail arranged and every concern allayed, plus a host of exclusive amenities outside your front door. Boca Raton, an internationally recognized elite community with an enviable world-class reputation, now offers a stunning new address that captures its one-of-a-kind glamour: the Residences at Mandarin Oriental, in the heart of downtown at Via Mizner.\n\nThe residences crown the Mandarin Oriental hotel with fully serviced homes managed by one of the world's most celebrated hospitality brands — in-residence dining, housekeeping, spa privileges and a dedicated residential concierge are all part of daily life.\n\nInteriors by HBA pair wide-plank flooring and European cabinetry with floor-to-ceiling glass overlooking the golf course, the Atlantic and downtown Boca Raton. A private residents-only rooftop pool and sky lounge sit above the hotel's restaurants, spa and wellness center.\n\nSteps away, Via Mizner's shops, galleries and dining — and a Jack Nicklaus signature golf course via the Via Mizner Golf & City Club — complete one of South Florida's most complete luxury addresses.",
                'developer_info' => 'Penn-Florida Companies is a privately held real estate organization founded in 1989, developing and managing residential, commercial and hospitality properties across Florida. Its flagship Via Mizner is a $1 billion mixed-use resort destination in downtown Boca Raton anchored by the Mandarin Oriental hotel and residences.',
                'deposit_schedule' => ['10% at Contract', '10% in 90 Days', '10% at Top Off', '70% at Closing'],
                'developer' => 'Penn-Florida Companies',
                'architect' => 'SB Architects',
                'interior_design' => 'HBA / Hirsch Bedner Associates',
                'logo' => 'https://media.pandaidx.com/platform/images/new-developments/logo/5f8482cdc8aca827abdc0882/bd0e3831-682c-4e2f-898c-c3253f85f100.png',
                'gallery' => [
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/5f8482cdc8aca827abdc0882/4e988ccc-4fd1-4737-929b-76e58b0fc74a.png',
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/5f8482cdc8aca827abdc0882/5814a1f5-6b5a-4bd6-b0a5-72fa5add2d6c.png',
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/5f8482cdc8aca827abdc0882/92bb6769-5eb3-4917-825d-7d54d7c84e5a.jpg',
                    'https://media.pandaidx.com/platform/images/new-developments/gallery/5f8482cdc8aca827abdc0882/1e326891-48b8-4985-9693-5cd511eab246.jpg',
                ],
                'key_details' => [
                    ['label' => 'Residences', 'value' => '92'],
                    ['label' => 'Services', 'value' => 'Mandarin Oriental managed'],
                    ['label' => 'Location', 'value' => 'Via Mizner, Downtown Boca'],
                ],
                'status' => 'under-construction',
                'completion_year' => '2026',
                'price_label' => 'From $1.8M',
                'highlights' => [
                    'Fully serviced residences managed by Mandarin Oriental',
                    'Private residents-only rooftop pool and sky lounge',
                    'Spa and wellness center with signature treatments',
                    'Signature dining and in-residence catering',
                    'Steps from Mizner Park shopping, dining and culture',
                ],
                'mls_keyword' => 'Mandarin Oriental',
                'lat' => 26.3512864,
                'lng' => -80.0872337,
                'sort_order' => 1,
            ],
        ];

        foreach ($developments as $development) {
            NewDevelopment::updateOrCreate(
                ['slug' => $development['slug']],
                $development + ['is_active' => true],
            );
        }

        // Developer taxonomy: one platform Developer per seed project,
        // carrying the About-the-Developer profile; projects link to it.
        foreach (NewDevelopment::query()->platform()->whereNotNull('developer')->get() as $project) {
            $developer = Developer::firstOrCreate(
                ['agent_website_id' => null, 'name' => $project->developer],
                ['slug' => Developer::generateSlug($project->developer), 'info' => $project->developer_info],
            );
            $project->update(['developer_id' => $developer->id]);
        }
    }
}
