<?php

namespace Database\Seeders;

use App\Models\AgentWebsite;
use App\Models\User;
use Illuminate\Database\Seeder;

class AgentWebsiteSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (! $user) {
            return;
        }

        // ── Luxury Dark Demo ──
        AgentWebsite::updateOrCreate(
            ['slug' => 'nichole-johnson'],
            [
                'user_id' => $user->id,
                'team_id' => $user->team_id,
                'template' => 'luxury',
                'agent_name' => 'Nichole Johnson',
                'agent_title' => 'Your Miami Luxury Realtor',
                'agent_tagline' => 'My team always guarantees a smooth process from start to finish — whether you\'re buying, selling, or even relocating to the Sunshine State!',
                'agent_bio' => 'With over 15 years of experience in South Florida\'s luxury real estate market, I bring unmatched expertise and a client-first approach to every transaction. My deep understanding of Miami\'s diverse neighborhoods, market trends, and negotiation strategies has helped hundreds of families find their dream homes and achieve top dollar on their sales.',
                'agent_email' => 'nichole@johnsongroup.com',
                'agent_phone' => '(305) 555-0199',
                'agent_city' => 'Miami',
                'agent_state' => 'FL',
                'agent_license_number' => 'SL3456789',
                'brokerage_name' => 'Compass',
                'hero_headline' => 'Buy & Sell with<br>Nichole Johnson',
                'hero_subtitle' => 'My team always guarantees a smooth process from start to finish — whether you\'re buying, selling, or even relocating to the Sunshine State!',
                'buy_headline' => 'Find Your Dream Home',
                'buy_description' => 'Whether you\'re a first-time buyer or looking for your next waterfront investment property, I\'ll guide you through every step of the process. From neighborhood selection to closing day, my team ensures a seamless experience in the South Florida market.',
                'sell_headline' => 'Sell for Top Dollar',
                'sell_description' => 'Get the best value for your property with my proven marketing strategy, professional staging advice, and deep knowledge of the South Florida market. My listings sell 15% faster than the market average.',
                'about_extended' => "Nichole Johnson is one of South Florida's most trusted real estate professionals, with over \$250 million in career sales volume. A graduate of the University of Miami, Nichole combines her deep roots in the community with a sophisticated understanding of luxury real estate markets.\n\nHer approach is simple: treat every client like family. Whether you're purchasing your first condo in Brickell or selling a multi-million dollar estate in Coral Gables, Nichole delivers the same level of dedication, transparency, and results.\n\nAwards & Recognition:\n- Miami Association of Realtors Top Producer 2020-2025\n- Compass Diamond Circle Award\n- Five Star Professional Award, 6 consecutive years\n- Featured in South Florida Business Journal \"Best Realtors\" issue\n\nSpecializing in Miami Beach, Coral Gables, Coconut Grove, Key Biscayne, and Brickell.",
                'testimonials' => [
                    [
                        'text' => 'Nichole made buying our first home in Coral Gables an absolute dream. She was patient, knowledgeable, and always had our best interests at heart. We closed under asking price in a competitive market!',
                        'name' => 'Sarah & David Chen',
                        'role' => 'Home Buyers, Coral Gables',
                    ],
                    [
                        'text' => 'We sold our Miami Beach condo in just 8 days, $50K over asking. Nichole\'s marketing strategy and staging recommendations were game-changers. Couldn\'t recommend her more highly.',
                        'name' => 'Michael Torres',
                        'role' => 'Home Seller, Miami Beach',
                    ],
                    [
                        'text' => 'As an out-of-state investor looking at South Florida properties, I needed someone I could trust completely. Nichole handled everything from property selection to renovation management. She\'s the real deal.',
                        'name' => 'Jennifer Park',
                        'role' => 'Real Estate Investor',
                    ],
                ],
                'social_facebook' => 'https://facebook.com/nicholeejohnsonrealtor',
                'social_instagram' => 'https://instagram.com/nicholejohnson_realestate',
                'social_linkedin' => 'https://linkedin.com/in/nicholejohnsonrealtor',
                'social_youtube' => 'https://youtube.com/@nicholejohnsonhomes',
                'meta_title' => 'Nichole Johnson | Miami Luxury Real Estate',
                'meta_description' => 'Miami\'s trusted luxury realtor. Buy or sell your home with Nichole Johnson and her award-winning team at Compass. Over $250M in career sales.',
                'is_published' => true,
            ]
        );

        // ── Luxury Light Demo ──
        AgentWebsite::updateOrCreate(
            ['slug' => 'sarah-wellington'],
            [
                'user_id' => $user->id,
                'team_id' => $user->team_id,
                'template' => 'luxury',
                'agent_name' => 'Sarah Wellington',
                'agent_title' => 'San Diego Coastal Specialist',
                'agent_tagline' => 'Helping families find their perfect coastal home in San Diego\'s most sought-after neighborhoods.',
                'agent_bio' => 'Sarah Wellington brings 12 years of expertise in San Diego\'s coastal real estate market. From La Jolla to Coronado, she has an intimate knowledge of every neighborhood and a passion for matching families with their dream homes by the sea.',
                'agent_email' => 'sarah@wellingtonhomes.com',
                'agent_phone' => '(619) 555-0234',
                'agent_city' => 'San Diego',
                'agent_state' => 'CA',
                'agent_license_number' => 'DRE# 02045678',
                'brokerage_name' => 'Berkshire Hathaway HomeServices',
                'hero_headline' => 'Buy & Sell with<br>Sarah Wellington',
                'hero_subtitle' => 'Helping families find their perfect coastal home in San Diego\'s most sought-after neighborhoods.',
                'buy_headline' => 'Find Your Coastal Dream Home',
                'buy_description' => 'From beachfront condos to hillside estates, I\'ll help you discover the perfect property in San Diego\'s stunning coastal communities.',
                'sell_headline' => 'Maximize Your Home\'s Value',
                'sell_description' => 'Strategic pricing, stunning photography, and targeted marketing to attract qualified buyers and achieve top-dollar results.',
                'about_extended' => "Sarah Wellington has been a cornerstone of San Diego's coastal real estate scene for over a decade. With \$180 million in career sales, she combines market expertise with genuine care for her clients.\n\nA San Diego native and UC San Diego graduate, Sarah understands the unique lifestyle that draws people to Southern California's coast. Her specialties include La Jolla, Del Mar, Encinitas, Coronado, and Pacific Beach.\n\nCertifications:\n- Certified Luxury Home Marketing Specialist (CLHMS)\n- Accredited Buyer's Representative (ABR)\n- San Diego Association of Realtors Circle of Excellence",
                'testimonials' => [
                    [
                        'text' => 'Sarah found us the most incredible ocean-view home in La Jolla. Her knowledge of the coastal market is unparalleled. We couldn\'t be happier!',
                        'name' => 'James & Lisa Rivera',
                        'role' => 'Home Buyers, La Jolla',
                    ],
                    [
                        'text' => 'Our Del Mar property sold in 5 days, well above asking price. Sarah\'s marketing was phenomenal — the listing photos looked like a magazine spread.',
                        'name' => 'Robert Chen',
                        'role' => 'Home Seller, Del Mar',
                    ],
                    [
                        'text' => 'As first-time buyers, we were nervous about the process. Sarah made everything easy and fun. She truly went above and beyond for us.',
                        'name' => 'Emily & Mark Santos',
                        'role' => 'First-Time Buyers, Encinitas',
                    ],
                ],
                'social_facebook' => 'https://facebook.com/sarahwellingtonrealty',
                'social_instagram' => 'https://instagram.com/sarahwellington_homes',
                'social_linkedin' => 'https://linkedin.com/in/sarahwellingtonrealtor',
                'meta_title' => 'Sarah Wellington | San Diego Coastal Real Estate',
                'meta_description' => 'San Diego\'s trusted coastal real estate specialist. Find your dream home by the sea with Sarah Wellington at Berkshire Hathaway.',
                'is_published' => true,
            ]
        );

        // ── Cash-offer demo (on the Luxury template) ──
        AgentWebsite::updateOrCreate(
            ['slug' => 'quick-cash-homes-atl'],
            [
                'user_id' => $user->id,
                'team_id' => $user->team_id,
                'template' => 'luxury',
                'agent_name' => 'Quick Cash Homes ATL',
                'agent_title' => 'We Buy Houses in Atlanta',
                'agent_tagline' => 'We buy houses in any condition — no repairs, no fees, no hassle. Get a fair cash offer and close on your timeline.',
                'agent_bio' => 'Quick Cash Homes ATL has been helping Atlanta homeowners sell their properties fast for cash since 2018. We buy houses in any condition — from perfect move-in ready homes to properties that need major work. No repairs, no agent commissions, no closing costs. Just a fair cash offer and a closing date that works for you.',
                'agent_email' => 'offers@quickcashhomesatl.com',
                'agent_phone' => '(404) 555-0177',
                'agent_city' => 'Atlanta',
                'agent_state' => 'GA',
                'brokerage_name' => 'Quick Cash Homes LLC',
                'hero_headline' => 'We Buy Houses in<br>Atlanta for Cash',
                'hero_subtitle' => 'No repairs. No fees. No hassle. Get a fair cash offer in 24 hours and close on your timeline.',
                'buy_headline' => 'How It Works',
                'buy_description' => 'Selling your house for cash is simple. We handle everything so you can move on with your life — no repairs, no showings, no waiting.',
                'sell_headline' => 'Get Your Cash Offer',
                'sell_description' => 'Fill out the form below and we\'ll send you a no-obligation cash offer within 24 hours. It\'s that simple.',
                'about_extended' => "Quick Cash Homes ATL was founded in 2018 with a simple mission: make selling your house as easy and stress-free as possible.\n\nWe've purchased over 500 homes across the greater Atlanta area, helping homeowners in every situation — foreclosure, divorce, inherited properties, major repairs needed, or simply wanting to move quickly.\n\nOur process is transparent and straightforward:\n- We provide honest, fair cash offers based on market value\n- There are zero fees, commissions, or closing costs\n- We buy houses in ANY condition — no repairs needed\n- You choose your closing date (as fast as 7 days)\n- We handle all the paperwork\n\nServing: Atlanta, Marietta, Decatur, Roswell, Alpharetta, Sandy Springs, Kennesaw, and all surrounding areas.",
                'testimonials' => [
                    [
                        'text' => 'I inherited a house that needed a ton of work. Quick Cash Homes gave me a fair offer and we closed in 10 days. No stress, no repairs, just cash in my pocket. Exactly what I needed.',
                        'name' => 'Marcus Williams',
                        'role' => 'Inherited Property, Decatur',
                    ],
                    [
                        'text' => 'After my divorce I needed to sell fast. They made me an offer the same day I called and I had cash in hand within two weeks. Professional and honest the whole way through.',
                        'name' => 'Angela Foster',
                        'role' => 'Home Seller, Marietta',
                    ],
                    [
                        'text' => 'I was facing foreclosure and had no idea what to do. These guys stepped in, made a fair offer, and saved me from losing everything. I can\'t thank them enough.',
                        'name' => 'David & Rosa Hernandez',
                        'role' => 'Foreclosure Prevention, Atlanta',
                    ],
                ],
                'social_facebook' => 'https://facebook.com/quickcashhomesatl',
                'social_instagram' => 'https://instagram.com/quickcashhomes_atl',
                'meta_title' => 'We Buy Houses Atlanta | Quick Cash Homes ATL',
                'meta_description' => 'Sell your Atlanta house fast for cash. No repairs, no fees, no hassle. Get a fair cash offer in 24 hours from Quick Cash Homes ATL.',
                'is_published' => true,
            ]
        );
    }
}
