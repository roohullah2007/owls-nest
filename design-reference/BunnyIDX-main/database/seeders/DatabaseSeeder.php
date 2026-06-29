<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\CallLog;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\EmailLog;
use App\Models\IdxConnection;
use App\Models\License;
use App\Models\LicenseDomain;
use App\Models\Listing;
use App\Models\Meeting;
use App\Models\Note;
use App\Models\SmsLog;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use App\Services\PipelineService;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        PipelineService::createDefaultPipelines($user);

        // --- Tags ---
        $tags = collect([
            ['name' => 'Hot Lead', 'color' => '#EF4444'],
            ['name' => 'VIP', 'color' => '#8B5CF6'],
            ['name' => 'First Time Buyer', 'color' => '#3B82F6'],
            ['name' => 'Investor', 'color' => '#10B981'],
            ['name' => 'Relocating', 'color' => '#F59E0B'],
            ['name' => 'Sphere', 'color' => '#EC4899'],
        ])->map(fn ($t) => Tag::create([...$t, 'user_id' => $user->id]));

        // --- Contacts (All Florida) ---
        $contacts = collect([
            ['first_name' => 'Sarah', 'last_name' => 'Johnson', 'email' => 'sarah.johnson@gmail.com', 'phone' => '(305) 555-0142', 'mobile' => '(305) 555-0199', 'type' => 'buyer', 'source' => 'website', 'address' => '1245 Brickell Ave', 'city' => 'Miami', 'state_province' => 'FL', 'postal_code' => '33131', 'lead_score' => 85, 'description' => 'Looking for a 3-bedroom condo in Brickell or Coconut Grove. Budget around $550K. Pre-approved with Wells Fargo.', 'last_contacted_at' => now()->subDays(1)],
            ['first_name' => 'Michael', 'last_name' => 'Chen', 'email' => 'mchen@outlook.com', 'phone' => '(954) 555-0287', 'type' => 'buyer', 'source' => 'referral', 'city' => 'Fort Lauderdale', 'state_province' => 'FL', 'postal_code' => '33301', 'lead_score' => 72, 'description' => 'Referred by David Park. Interested in new construction, 4+ bedrooms in Weston or Coral Springs.', 'last_contacted_at' => now()->subDays(3)],
            ['first_name' => 'Jessica', 'last_name' => 'Martinez', 'email' => 'jmartinez@yahoo.com', 'phone' => '(305) 555-0391', 'mobile' => '(305) 555-0455', 'type' => 'seller', 'source' => 'open_house', 'address' => '789 Coral Way', 'city' => 'Coral Gables', 'state_province' => 'FL', 'postal_code' => '33134', 'lead_score' => 60, 'description' => 'Met at open house on Brickell. Wants to sell her current home before buying. Estimated value $480K.', 'last_contacted_at' => now()->subDays(7)],
            ['first_name' => 'David', 'last_name' => 'Park', 'email' => 'dpark@gmail.com', 'phone' => '(305) 555-0534', 'type' => 'past_client', 'source' => 'manual', 'address' => '3000 NE 30th Pl #405', 'city' => 'Fort Lauderdale', 'state_province' => 'FL', 'postal_code' => '33306', 'lead_score' => 90, 'description' => 'Closed in 2024. Great referral source — sent Michael Chen our way.', 'last_contacted_at' => now()->subDays(14)],
            ['first_name' => 'Emily', 'last_name' => 'Robinson', 'email' => 'erobinson@protonmail.com', 'phone' => '(561) 555-0621', 'type' => 'buyer', 'source' => 'idx', 'city' => 'West Palm Beach', 'state_province' => 'FL', 'postal_code' => '33401', 'lead_score' => 45, 'description' => 'IDX lead — saved 12 properties, mostly in West Palm Beach area. No response to first email.', 'last_contacted_at' => now()->subDays(5)],
            ['first_name' => 'James', 'last_name' => 'Wilson', 'email' => 'jwilson@company.com', 'phone' => '(239) 555-0745', 'mobile' => '(239) 555-0788', 'type' => 'buyer', 'source' => 'social_media', 'city' => 'Naples', 'state_province' => 'FL', 'postal_code' => '34102', 'lead_score' => 68, 'description' => 'Found us on Instagram. Luxury buyer, budget $1.2M+. Relocating from New York in 3 months. Wants waterfront.', 'last_contacted_at' => now()->subDays(2)],
            ['first_name' => 'Amanda', 'last_name' => 'Torres', 'email' => 'atorres@gmail.com', 'phone' => '(407) 555-0856', 'type' => 'seller', 'source' => 'referral', 'address' => '567 Magnolia Dr', 'city' => 'Orlando', 'state_province' => 'FL', 'postal_code' => '32801', 'lead_score' => 55, 'description' => 'Downsizing after kids moved out. Looking to sell 4-bed home in Orlando and buy a smaller condo in Winter Park.', 'last_contacted_at' => now()->subDays(10)],
            ['first_name' => 'Robert', 'last_name' => 'Kim', 'email' => 'rkim@fastmail.com', 'phone' => '(813) 555-0912', 'type' => 'buyer', 'source' => 'cold_call', 'city' => 'Tampa', 'state_province' => 'FL', 'postal_code' => '33602', 'lead_score' => 30, 'description' => 'Cold call contact. Interested but not actively looking for 6+ months. Considering Tampa or St. Pete.', 'last_contacted_at' => now()->subDays(21)],
            ['first_name' => 'Lisa', 'last_name' => 'Nguyen', 'email' => 'lisa.nguyen@work.com', 'phone' => '(305) 555-1023', 'mobile' => '(305) 555-1067', 'type' => 'buyer', 'source' => 'website', 'city' => 'Aventura', 'state_province' => 'FL', 'postal_code' => '33180', 'lead_score' => 78, 'description' => 'Submitted form on website. Pre-approved, looking in Aventura/Sunny Isles. Wants ocean views. Timeline: 60 days.', 'last_contacted_at' => now()->subHours(6)],
            ['first_name' => 'Carlos', 'last_name' => 'Ramirez', 'email' => 'cramirez@email.com', 'phone' => '(786) 555-1134', 'type' => 'prospect', 'source' => 'open_house', 'city' => 'Doral', 'state_province' => 'FL', 'postal_code' => '33178', 'lead_score' => 40, 'description' => 'Attended two open houses in Doral. Curious but not committed — need to qualify further.'],
            ['first_name' => 'Rachel', 'last_name' => 'Green', 'email' => 'rgreen@gmail.com', 'phone' => '(954) 555-1245', 'type' => 'buyer', 'source' => 'referral', 'address' => '321 Las Olas Blvd', 'city' => 'Fort Lauderdale', 'state_province' => 'FL', 'postal_code' => '33301', 'lead_score' => 92, 'description' => 'High priority. Pre-approved $750K, needs to close within 45 days due to lease ending. Wants Las Olas area.', 'last_contacted_at' => now()->subHours(2)],
            ['first_name' => 'Tom', 'last_name' => 'Bradley', 'email' => 'tbradley@outlook.com', 'phone' => '(561) 555-1356', 'type' => 'past_client', 'source' => 'manual', 'city' => 'Boca Raton', 'state_province' => 'FL', 'postal_code' => '33432', 'lead_score' => 80, 'description' => 'Bought a condo in 2023 in Boca. Now looking to upgrade to a single-family home with a pool.', 'last_contacted_at' => now()->subDays(30)],
            ['first_name' => 'Nicole', 'last_name' => 'Foster', 'phone' => '(321) 555-1467', 'type' => 'buyer', 'source' => 'idx', 'city' => 'Melbourne', 'state_province' => 'FL', 'postal_code' => '32901', 'lead_score' => 25],
            ['first_name' => 'Kevin', 'last_name' => 'Thompson', 'email' => 'kthompson@gmail.com', 'phone' => '(904) 555-1578', 'mobile' => '(904) 555-1599', 'type' => 'seller', 'source' => 'website', 'address' => '890 Beach Blvd', 'city' => 'Jacksonville', 'state_province' => 'FL', 'postal_code' => '32250', 'lead_score' => 50, 'description' => 'Inherited property in Jacksonville Beach. Wants to sell quickly. Needs CMA.', 'last_contacted_at' => now()->subDays(4)],
            ['first_name' => 'Megan', 'last_name' => 'White', 'email' => 'mwhite@company.org', 'phone' => '(305) 555-1689', 'type' => 'prospect', 'source' => 'social_media', 'city' => 'Miami Beach', 'state_province' => 'FL', 'postal_code' => '33139', 'lead_score' => 35, 'description' => 'Engaged with our Facebook ad. Downloaded buyer guide but hasn\'t responded to follow-up.'],
        ])->map(function ($data) use ($user) {
            return Contact::create([...$data, 'user_id' => $user->id, 'country' => 'US']);
        });

        // --- Assign statuses to contacts ---
        $contacts[0]->update(['status' => 'active']);      // Sarah: actively looking in Brickell
        $contacts[1]->update(['status' => 'active']);      // Michael: actively looking in Fort Lauderdale
        $contacts[2]->update(['status' => 'active']);      // Jessica: seller, active in Coral Gables
        $contacts[3]->update(['status' => 'past_client']); // David: past client
        $contacts[4]->update(['status' => 'new_lead']);    // Emily: IDX lead, no response
        $contacts[5]->update(['status' => 'active']);      // James: luxury buyer, Naples
        $contacts[6]->update(['status' => 'active']);      // Amanda: seller, Orlando
        $contacts[7]->update(['status' => 'new_lead']);    // Robert: cold call, Tampa
        $contacts[8]->update(['status' => 'client']);      // Lisa: under contract, Aventura
        $contacts[9]->update(['status' => 'new_lead']);    // Carlos: prospect, Doral
        $contacts[10]->update(['status' => 'client']);     // Rachel: offer submitted, Fort Lauderdale
        $contacts[11]->update(['status' => 'past_client']); // Tom: past client, Boca Raton
        $contacts[12]->update(['status' => 'new_lead']);   // Nicole: IDX lead, Melbourne
        $contacts[13]->update(['status' => 'active']);     // Kevin: seller, Jacksonville
        $contacts[14]->update(['status' => 'new_lead']);   // Megan: prospect, Miami Beach

        // --- Tag contacts ---
        $contacts[0]->tags()->sync([$tags[0]->id, $tags[2]->id]); // Sarah: Hot Lead, First Time Buyer
        $contacts[1]->tags()->sync([$tags[2]->id]); // Michael: First Time Buyer
        $contacts[3]->tags()->sync([$tags[5]->id]); // David: Sphere
        $contacts[4]->tags()->sync([$tags[2]->id]); // Emily: First Time Buyer
        $contacts[5]->tags()->sync([$tags[0]->id, $tags[4]->id]); // James: Hot Lead, Relocating
        $contacts[8]->tags()->sync([$tags[0]->id]); // Lisa: Hot Lead
        $contacts[10]->tags()->sync([$tags[0]->id, $tags[3]->id]); // Rachel: Hot Lead, Investor
        $contacts[11]->tags()->sync([$tags[5]->id]); // Tom: Sphere

        // --- Notes (polymorphic) ---
        $noteData = [
            [$contacts[0], 'Spoke with Sarah today. She\'s very motivated — lease ends in 60 days. Wants to tour 3 condos in Brickell this weekend.', true],
            [$contacts[0], 'Sent her listing packet for units in Brickell Heights and Panorama Tower. She liked both.'],
            [$contacts[1], 'Michael prefers new construction. Showed him GL Homes community in Weston. Follow up in a week.'],
            [$contacts[3], 'David referred Michael Chen. Send a thank-you card.', true],
            [$contacts[5], 'James wants waterfront or gulf-access views. Budget flexible up to $1.5M. Showing Naples homes next Thursday.'],
            [$contacts[8], 'Lisa is very responsive. Pre-approved with Chase for $650K. Prefers high-floor ocean views in Aventura.'],
            [$contacts[10], 'Rachel needs to close fast. Already lost one offer due to timing. Prioritize showing active inventory in Las Olas with motivated sellers.', true],
            [$contacts[13], 'Kevin\'s property at 890 Beach Blvd needs some repairs. Suggested getting inspection before listing.'],
        ];
        foreach ($noteData as $row) {
            Note::create([
                'user_id' => $user->id,
                'notable_id' => $row[0]->id,
                'notable_type' => Contact::class,
                'body' => $row[1],
                'is_pinned' => $row[2] ?? false,
            ]);
        }

        // --- Tasks ---
        $taskData = [
            [$contacts[0], 'Schedule showing at Brickell Heights', 'high', now()->addDays(2)],
            [$contacts[0], 'Send pre-approval letter to listing agent', 'urgent', now()->addDay()],
            [$contacts[1], 'Follow up on Weston community tour', 'normal', now()->addDays(7)],
            [$contacts[2], 'Prepare CMA for 789 Coral Way', 'high', now()->addDays(3)],
            [$contacts[3], 'Send thank-you card for referral', 'low', now()->addDays(5)],
            [$contacts[5], 'Research Naples waterfront listings', 'high', now()->addDays(1)],
            [$contacts[5], 'Schedule Thursday showings in Naples', 'normal', now()->addDays(3)],
            [$contacts[8], 'Send ocean view condos in Aventura', 'normal', now()->addDays(2)],
            [$contacts[10], 'Submit offer for 321 Las Olas Blvd', 'urgent', now()],
            [$contacts[13], 'Order home inspection for 890 Beach Blvd', 'high', now()->addDays(4)],
            [$contacts[6], 'Call Amanda to discuss listing timeline', 'normal', now()->addDays(6)],
        ];
        foreach ($taskData as [$contact, $title, $priority, $dueDate]) {
            Task::create([
                'user_id' => $user->id,
                'taskable_id' => $contact->id,
                'taskable_type' => Contact::class,
                'title' => $title,
                'priority' => $priority,
                'due_date' => $dueDate->toDateString(),
            ]);
        }

        // Completed tasks
        Task::create(['user_id' => $user->id, 'taskable_id' => $contacts[0]->id, 'taskable_type' => Contact::class, 'title' => 'Verify pre-approval status', 'priority' => 'normal', 'is_completed' => true, 'completed_at' => now()->subDays(2)]);
        Task::create(['user_id' => $user->id, 'taskable_id' => $contacts[10]->id, 'taskable_type' => Contact::class, 'title' => 'Pull comps for Las Olas 33301', 'priority' => 'high', 'is_completed' => true, 'completed_at' => now()->subDay()]);

        // --- Call Logs ---
        $callData = [
            [$contacts[0], 'outbound', 'connected', 180, 'Discussed budget and timeline. She\'s very motivated. Wants Brickell or Coconut Grove.'],
            [$contacts[0], 'inbound', 'connected', 45, 'Quick call — confirmed Saturday showing at Brickell Heights.'],
            [$contacts[1], 'outbound', 'connected', 240, 'Went over new construction options in Weston and Coral Springs.'],
            [$contacts[2], 'outbound', 'left_voicemail', null, 'Left VM about scheduling CMA presentation for Coral Gables home.'],
            [$contacts[5], 'outbound', 'connected', 360, 'Long call about relocation timeline from NY. Very interested in Naples waterfront.'],
            [$contacts[7], 'outbound', 'no_answer', null, null],
            [$contacts[8], 'inbound', 'connected', 120, 'Lisa called to ask about Turnberry Ocean Colony listing.'],
            [$contacts[10], 'outbound', 'connected', 150, 'Discussed offer strategy for Las Olas. She wants to go $20K over asking.'],
            [$contacts[13], 'outbound', 'connected', 200, 'Talked about inspection timeline and pricing expectations for Jacksonville Beach property.'],
        ];
        foreach ($callData as $i => [$contact, $dir, $outcome, $dur, $notes]) {
            CallLog::create([
                'user_id' => $user->id,
                'contact_id' => $contact->id,
                'direction' => $dir,
                'outcome' => $outcome,
                'duration_seconds' => $dur,
                'notes' => $notes,
                'created_at' => now()->subDays(count($callData) - $i)->subHours(rand(1, 8)),
            ]);
        }

        // --- Email Logs ---
        $emailData = [
            [$contacts[0], 'outbound', 'Listing Packet: Brickell Condos', 'Hi Sarah, attached are the listings we discussed in Brickell Heights and Panorama Tower...'],
            [$contacts[0], 'inbound', 'Re: Listing Packet', 'Thanks! I love the one at Panorama Tower. Can we see it Saturday?'],
            [$contacts[4], 'outbound', 'Properties Matching Your Search', 'Hi Emily, I noticed you saved several properties in West Palm Beach on our site...'],
            [$contacts[5], 'outbound', 'Naples Waterfront Properties', 'Hi James, here are 5 waterfront properties in Naples in your price range...'],
            [$contacts[5], 'inbound', 'Re: Naples Waterfront Properties', 'These look amazing! Can we tour #2 and #4 on Thursday?'],
            [$contacts[8], 'outbound', 'Ocean View Condos in Aventura', 'Hi Lisa, I found 4 ocean view condos in Aventura/Sunny Isles that match your criteria...'],
            [$contacts[10], 'outbound', 'Offer Strategy for 321 Las Olas Blvd', 'Hi Rachel, based on comps, I recommend offering $770K...'],
            [$contacts[14], 'outbound', 'South Florida Real Estate Market Update', 'Hi Megan, thanks for downloading our buyer guide. Here\'s what\'s happening in Miami Beach...'],
        ];
        foreach ($emailData as $i => [$contact, $dir, $subject, $preview]) {
            EmailLog::create([
                'user_id' => $user->id,
                'contact_id' => $contact->id,
                'direction' => $dir,
                'subject' => $subject,
                'body_preview' => $preview,
                'from_address' => $dir === 'outbound' ? 'agent@bunnyidx.com' : $contact->email,
                'to_address' => $dir === 'outbound' ? $contact->email : 'agent@bunnyidx.com',
                'created_at' => now()->subDays(count($emailData) - $i)->subHours(rand(1, 12)),
            ]);
        }

        // --- SMS Logs ---
        $smsData = [
            [$contacts[0], 'outbound', 'Hi Sarah! Confirming our showing Saturday at 10am at Brickell Heights. See you there!'],
            [$contacts[0], 'inbound', 'Perfect, see you then! Can we also look at the unit at Panorama Tower?'],
            [$contacts[5], 'outbound', 'Hi James, Thursday showings confirmed in Naples: 10am, 11:30am, 1pm. I\'ll send addresses.'],
            [$contacts[5], 'inbound', 'Sounds good, looking forward to it. Can\'t wait to see the waterfront ones.'],
            [$contacts[8], 'inbound', 'Hi! Are there any open houses this weekend in Aventura or Sunny Isles?'],
            [$contacts[8], 'outbound', 'Yes! There are 2 open houses Saturday. I\'ll send you the details.'],
            [$contacts[10], 'outbound', 'Rachel, offer submitted for Las Olas! Will update you as soon as we hear back.'],
            [$contacts[10], 'inbound', 'Fingers crossed! Thank you for moving so quickly on this.'],
        ];
        foreach ($smsData as $i => [$contact, $dir, $body]) {
            SmsLog::create([
                'user_id' => $user->id,
                'contact_id' => $contact->id,
                'direction' => $dir,
                'body' => $body,
                'phone_number' => $contact->phone,
                'created_at' => now()->subDays(count($smsData) - $i)->subHours(rand(1, 6)),
            ]);
        }

        // --- Meetings ---
        Meeting::create(['user_id' => $user->id, 'contact_id' => $contacts[0]->id, 'title' => 'Saturday Showings - Brickell', 'meeting_type' => 'showing', 'location' => 'Brickell Heights, Miami FL', 'starts_at' => now()->addDays(2)->setHour(10), 'ends_at' => now()->addDays(2)->setHour(13)]);
        Meeting::create(['user_id' => $user->id, 'contact_id' => $contacts[5]->id, 'title' => 'Naples Waterfront Tours', 'meeting_type' => 'showing', 'location' => 'Naples, FL', 'starts_at' => now()->addDays(4)->setHour(10), 'ends_at' => now()->addDays(4)->setHour(14)]);
        Meeting::create(['user_id' => $user->id, 'contact_id' => $contacts[2]->id, 'title' => 'CMA Presentation', 'meeting_type' => 'video', 'starts_at' => now()->addDays(3)->setHour(14), 'ends_at' => now()->addDays(3)->setHour(15)]);
        Meeting::create(['user_id' => $user->id, 'contact_id' => $contacts[6]->id, 'title' => 'Listing Consultation', 'meeting_type' => 'in_person', 'location' => '567 Magnolia Dr, Orlando FL', 'starts_at' => now()->addDays(6)->setHour(11), 'ends_at' => now()->addDays(6)->setHour(12)]);

        Meeting::create(['user_id' => $user->id, 'contact_id' => $contacts[8]->id, 'title' => 'Buyer phone consultation', 'meeting_type' => 'phone', 'starts_at' => now()->addDays(1)->setHour(9), 'ends_at' => now()->addDays(1)->setHour(9)->addMinutes(30)]);
        Meeting::create(['user_id' => $user->id, 'contact_id' => $contacts[10]->id, 'deal_id' => null, 'title' => 'Open House - 321 Las Olas', 'meeting_type' => 'open_house', 'location' => '321 Las Olas Blvd, Fort Lauderdale FL', 'starts_at' => now()->addDays(8)->setHour(13), 'ends_at' => now()->addDays(8)->setHour(16)]);

        // Past completed meetings
        Meeting::create(['user_id' => $user->id, 'contact_id' => $contacts[1]->id, 'title' => 'Weston Community Tour', 'meeting_type' => 'showing', 'location' => 'Weston, FL', 'starts_at' => now()->subDays(3)->setHour(10), 'ends_at' => now()->subDays(3)->setHour(12), 'is_completed' => true]);
        Meeting::create(['user_id' => $user->id, 'contact_id' => $contacts[3]->id, 'title' => 'Listing paperwork signing', 'meeting_type' => 'in_person', 'location' => 'Office', 'starts_at' => now()->subDays(5)->setHour(14), 'ends_at' => now()->subDays(5)->setHour(15), 'is_completed' => true]);

        // --- Deals ---
        $buyerPipeline = $user->getDefaultPipeline('buyer');
        $sellerPipeline = $user->getDefaultPipeline('seller');
        $buyerStages = $buyerPipeline?->stages ?? collect();
        $sellerStages = $sellerPipeline?->stages ?? collect();
        $buyerOpenStages = $buyerStages->where('type', 'open')->sortBy('position')->values();
        $sellerOpenStages = $sellerStages->where('type', 'open')->sortBy('position')->values();

        // Deal 1: Sarah Johnson buying a condo in Brickell
        $deal1 = Deal::create([
            'user_id' => $user->id,
            'company_id' => null,
            'pipeline_id' => $buyerPipeline->id,
            'pipeline_stage_id' => $buyerOpenStages[2]->id ?? $buyerOpenStages[0]->id,
            'title' => 'Brickell Heights #1802 — Sarah Johnson',
            'value' => 550000,
            'type' => 'buy',
            'property_address' => 'Brickell Heights, 1245 Brickell Ave #1802, Miami FL 33131',
            'mls_number' => 'A11598200',
            'expected_close_date' => now()->addDays(45),
            'commission_rate' => 3.00,
            'commission_amount' => 16500,
            'notes' => 'Pre-approved with Wells Fargo. Lease ends in 60 days.',
        ]);
        $deal1->contacts()->sync([$contacts[0]->id]);
        $deal1->tags()->sync([$tags[0]->id, $tags[2]->id]);

        // Deal 2: James Wilson luxury waterfront buy in Naples
        $deal2 = Deal::create([
            'user_id' => $user->id,
            'company_id' => null,
            'pipeline_id' => $buyerPipeline->id,
            'pipeline_stage_id' => $buyerOpenStages[1]->id ?? $buyerOpenStages[0]->id,
            'title' => 'Naples Waterfront — Wilson',
            'value' => 1250000,
            'type' => 'buy',
            'property_address' => 'TBD Naples Waterfront, FL',
            'expected_close_date' => now()->addDays(90),
            'commission_rate' => 2.50,
            'commission_amount' => 31250,
            'notes' => 'Relocating from New York. Budget up to $1.5M. Wants waterfront or gulf views.',
        ]);
        $deal2->contacts()->sync([$contacts[5]->id, $contacts[8]->id]);
        $deal2->tags()->sync([$tags[0]->id, $tags[4]->id]);

        // Deal 3: Kevin Thompson listing (seller deal) in Jacksonville
        if ($sellerPipeline && $sellerOpenStages->isNotEmpty()) {
            $deal3 = Deal::create([
                'user_id' => $user->id,
                'company_id' => null,
                'pipeline_id' => $sellerPipeline->id,
                'pipeline_stage_id' => $sellerOpenStages[1]->id ?? $sellerOpenStages[0]->id,
                'title' => '890 Beach Blvd Listing — Thompson',
                'value' => 425000,
                'type' => 'sell',
                'property_address' => '890 Beach Blvd, Jacksonville Beach FL 32250',
                'mls_number' => 'J11612890',
                'expected_close_date' => now()->addDays(60),
                'commission_rate' => 3.00,
                'commission_amount' => 12750,
                'notes' => 'Inherited property. Needs inspection before listing.',
            ]);
            $deal3->contacts()->sync([$contacts[13]->id]);
        }

        // --- Extra buyer deals to populate the board across stages ---
        $buyerStageOr = fn (int $idx) => $buyerOpenStages[$idx]->id ?? $buyerOpenStages[0]->id;

        $extraBuyerDeals = [
            [
                'contact_idx' => 1,                // Michael Chen
                'stage_idx' => 0,                  // New / first open stage
                'title' => 'Weston New Construction — Chen',
                'value' => 685000,
                'property_address' => 'GL Homes — Weston, FL',
                'expected_close_date' => now()->addDays(75),
                'notes' => 'Interested in new construction. Likes the GL Homes Weston community.',
                'tags' => [$tags[2]->id], // First Time Buyer
            ],
            [
                'contact_idx' => 8,                // Lisa Nguyen
                'stage_idx' => 2,
                'title' => 'Turnberry Ocean Colony — Nguyen',
                'value' => 640000,
                'property_address' => '18101 Collins Ave, Sunny Isles FL 33160',
                'mls_number' => 'A11623456',
                'expected_close_date' => now()->addDays(55),
                'commission_rate' => 3.00,
                'commission_amount' => 19200,
                'notes' => 'Pre-approved with Chase for $650K. Wants high-floor ocean view.',
                'tags' => [$tags[0]->id], // Hot Lead
            ],
            [
                'contact_idx' => 10,               // Rachel Green
                'stage_idx' => 3,                  // Later stage — offer submitted
                'title' => '321 Las Olas Blvd — Green',
                'value' => 770000,
                'property_address' => '321 Las Olas Blvd, Fort Lauderdale FL 33301',
                'mls_number' => 'F10456789',
                'expected_close_date' => now()->addDays(35),
                'commission_rate' => 2.75,
                'commission_amount' => 21175,
                'notes' => 'Offer submitted $20K over asking. Lease ends in 45 days.',
                'tags' => [$tags[0]->id, $tags[3]->id], // Hot Lead, Investor
            ],
            [
                'contact_idx' => 7,                // Robert Kim
                'stage_idx' => 0,
                'title' => 'Tampa / St. Pete Search — Kim',
                'value' => 395000,
                'property_address' => 'TBD Tampa, FL',
                'expected_close_date' => now()->addDays(180),
                'notes' => 'Cold-call lead. Long timeline (6+ months). Considering Tampa or St. Pete.',
                'tags' => [],
            ],
            [
                'contact_idx' => 4,                // Emily Robinson
                'stage_idx' => 1,
                'title' => 'West Palm Beach Search — Robinson',
                'value' => 360000,
                'property_address' => 'TBD West Palm Beach, FL',
                'expected_close_date' => now()->addDays(120),
                'notes' => 'IDX lead, saved 12 properties. Re-engaging after no response to initial email.',
                'tags' => [$tags[2]->id],
            ],
        ];

        foreach ($extraBuyerDeals as $data) {
            $contact = $contacts[$data['contact_idx']];
            $deal = Deal::create([
                'user_id' => $user->id,
                'company_id' => null,
                'pipeline_id' => $buyerPipeline->id,
                'pipeline_stage_id' => $buyerStageOr($data['stage_idx']),
                'title' => $data['title'],
                'value' => $data['value'],
                'type' => 'buy',
                'property_address' => $data['property_address'],
                'mls_number' => $data['mls_number'] ?? null,
                'expected_close_date' => $data['expected_close_date'],
                'commission_rate' => $data['commission_rate'] ?? 3.00,
                'commission_amount' => $data['commission_amount'] ?? round($data['value'] * 0.03, 2),
                'notes' => $data['notes'],
            ]);
            $deal->contacts()->sync([$contact->id]);
            if (! empty($data['tags'])) {
                $deal->tags()->sync($data['tags']);
            }
        }

        // --- Extra seller deals ---
        if ($sellerPipeline && $sellerOpenStages->isNotEmpty()) {
            $sellerStageOr = fn (int $idx) => $sellerOpenStages[$idx]->id ?? $sellerOpenStages[0]->id;

            $extraSellerDeals = [
                [
                    'contact_idx' => 2,            // Jessica Martinez
                    'stage_idx' => 0,
                    'title' => '789 Coral Way Listing — Martinez',
                    'value' => 480000,
                    'property_address' => '789 Coral Way, Coral Gables FL 33134',
                    'expected_close_date' => now()->addDays(90),
                    'commission_rate' => 3.00,
                    'commission_amount' => 14400,
                    'notes' => 'Met at open house. Wants to sell before buying next home.',
                ],
                [
                    'contact_idx' => 6,            // Amanda Torres
                    'stage_idx' => 2,
                    'title' => '567 Magnolia Dr Listing — Torres',
                    'value' => 520000,
                    'property_address' => '567 Magnolia Dr, Orlando FL 32801',
                    'expected_close_date' => now()->addDays(50),
                    'commission_rate' => 3.00,
                    'commission_amount' => 15600,
                    'notes' => 'Downsizing. Motivated seller — wants to relocate to Winter Park.',
                ],
            ];

            foreach ($extraSellerDeals as $data) {
                $contact = $contacts[$data['contact_idx']];
                $deal = Deal::create([
                    'user_id' => $user->id,
                    'company_id' => null,
                    'pipeline_id' => $sellerPipeline->id,
                    'pipeline_stage_id' => $sellerStageOr($data['stage_idx']),
                    'title' => $data['title'],
                    'value' => $data['value'],
                    'type' => 'sell',
                    'property_address' => $data['property_address'],
                    'expected_close_date' => $data['expected_close_date'],
                    'commission_rate' => $data['commission_rate'],
                    'commission_amount' => $data['commission_amount'],
                    'notes' => $data['notes'],
                ]);
                $deal->contacts()->sync([$contact->id]);
            }
        }

        // --- Won Deals ---
        $buyerWonStage = $buyerStages->where('type', 'won')->first();
        $sellerWonStage = $sellerStages->where('type', 'won')->first();
        $buyerLostStage = $buyerStages->where('type', 'lost')->first();

        // Won Deal 1: David Park past purchase
        if ($buyerWonStage) {
            $wonDeal1 = Deal::create([
                'user_id' => $user->id,
                'pipeline_id' => $buyerPipeline->id,
                'pipeline_stage_id' => $buyerWonStage->id,
                'title' => 'Harbour Towers #405 — David Park',
                'value' => 485000,
                'type' => 'buy',
                'property_address' => '3000 NE 30th Pl #405, Fort Lauderdale FL 33306',
                'mls_number' => 'F10398712',
                'expected_close_date' => now()->subDays(45),
                'actual_close_date' => now()->subDays(30),
                'commission_rate' => 3.00,
                'commission_amount' => 14550,
                'won_at' => now()->subDays(30),
                'notes' => 'Closed successfully. Great client — already referring friends.',
            ]);
            $wonDeal1->contacts()->sync([$contacts[3]->id]);
        }

        // Won Deal 2: Tom Bradley condo purchase
        if ($buyerWonStage) {
            $wonDeal2 = Deal::create([
                'user_id' => $user->id,
                'pipeline_id' => $buyerPipeline->id,
                'pipeline_stage_id' => $buyerWonStage->id,
                'title' => 'Boca Bayou Condo — Tom Bradley',
                'value' => 380000,
                'type' => 'buy',
                'property_address' => '6 Royal Palm Way #301, Boca Raton FL 33432',
                'mls_number' => 'R10512345',
                'expected_close_date' => now()->subDays(90),
                'actual_close_date' => now()->subDays(75),
                'commission_rate' => 2.50,
                'commission_amount' => 9500,
                'won_at' => now()->subDays(75),
                'notes' => 'Smooth closing. Tom now looking to upgrade to single-family.',
            ]);
            $wonDeal2->contacts()->sync([$contacts[11]->id]);
        }

        // Lost Deal: Emily Robinson — deal fell through
        if ($buyerLostStage) {
            $lostDeal = Deal::create([
                'user_id' => $user->id,
                'pipeline_id' => $buyerPipeline->id,
                'pipeline_stage_id' => $buyerLostStage->id,
                'title' => 'Palm Beach Gardens Home — Robinson',
                'value' => 320000,
                'type' => 'buy',
                'property_address' => '1200 Gardens East Dr, Palm Beach Gardens FL 33410',
                'expected_close_date' => now()->subDays(20),
                'commission_rate' => 3.00,
                'commission_amount' => 9600,
                'lost_at' => now()->subDays(10),
                'lost_reason' => 'Buyer financing fell through',
                'notes' => 'Pre-approval was revoked after job change. May re-engage in 6 months.',
            ]);
            $lostDeal->contacts()->sync([$contacts[4]->id]);
        }

        // --- IDX: License + Connection + Listings ---
        $license = License::create([
            'user_id' => $user->id,
            'key' => 'IDX-DEMO-TEST-KEY1',
            'email' => $user->email,
            'purchase_ref' => 'cs_test_demo_seed',
            'purchase_source' => 'manual',
            'status' => 'active',
            'note' => 'Demo license for testing.',
        ]);

        LicenseDomain::create([
            'license_id' => $license->id,
            'domain' => 'localhost',
            'is_active' => true,
            'activated_at' => now(),
        ]);

        $miamiConnection = IdxConnection::create([
            'user_id' => $user->id,
            'provider' => 'bridge',
            'mls_slug' => 'miamire',
            'display_name' => 'Miami Association of REALTORS',
            'api_key' => null,
            'is_active' => true,
            'last_tested_at' => now(),
            'test_status' => 'passed',
        ]);

        // Sample imported MLS listings (all Florida)
        $mlsListings = [
            [
                'mls_listing_id' => 'MIA2024050001',
                'mls_number' => 'A11534782',
                'title' => '22900 SW 122 PL, Miami FL 33170',
                'listing_type' => 'residential',
                'status' => 'active',
                'address' => '22900 SW 122 PL',
                'city' => 'Miami',
                'state_province' => 'FL',
                'postal_code' => '33170',
                'price' => 749000,
                'bedrooms' => 4,
                'bathrooms' => 3.0,
                'sqft' => 2450,
                'year_built' => 2001,
                'description' => 'Stunning 4-bedroom family home in the heart of Miami. Updated kitchen with quartz countertops, impact windows throughout, spacious backyard with pool.',
                'features' => ['Pool', 'Impact Windows', 'Updated Kitchen', 'Walk-in Closets'],
                'listed_at' => '2026-03-15',
                'contact_id' => $contacts[0]->id,
            ],
            [
                'mls_listing_id' => 'MIA2024060002',
                'mls_number' => 'A11598134',
                'title' => '1000 Brickell Ave #3201, Miami FL 33131',
                'listing_type' => 'residential',
                'status' => 'active',
                'address' => '1000 Brickell Ave #3201',
                'city' => 'Miami',
                'state_province' => 'FL',
                'postal_code' => '33131',
                'price' => 525000,
                'bedrooms' => 2,
                'bathrooms' => 2.0,
                'sqft' => 1200,
                'year_built' => 2019,
                'description' => 'Gorgeous 2/2 condo in the heart of Brickell. Floor-to-ceiling windows with breathtaking bay views. Resort-style amenities.',
                'features' => ['Bay View', 'Floor-to-Ceiling Windows', 'Walk-in Closet'],
                'listed_at' => '2026-03-22',
                'contact_id' => $contacts[5]->id,
            ],
            [
                'mls_listing_id' => 'MIA2024070003',
                'mls_number' => 'A11612457',
                'title' => '456 Palm Island Dr, Miami Beach FL 33139',
                'listing_type' => 'residential',
                'status' => 'active',
                'address' => '456 Palm Island Dr',
                'city' => 'Miami Beach',
                'state_province' => 'FL',
                'postal_code' => '33139',
                'price' => 1250000,
                'bedrooms' => 5,
                'bathrooms' => 4.5,
                'sqft' => 3800,
                'year_built' => 2015,
                'description' => 'Luxury waterfront estate on Palm Island. Private dock, infinity pool, chef\'s kitchen, smart home technology.',
                'features' => ['Waterfront', 'Pool', 'Dock', 'Smart Home', 'Chef\'s Kitchen'],
                'listed_at' => '2026-02-28',
                'contact_id' => null,
            ],
            [
                'mls_listing_id' => 'FTL2024080004',
                'mls_number' => 'F10421678',
                'title' => '2500 E Las Olas Blvd #904, Fort Lauderdale FL 33301',
                'listing_type' => 'residential',
                'status' => 'active',
                'address' => '2500 E Las Olas Blvd #904',
                'city' => 'Fort Lauderdale',
                'state_province' => 'FL',
                'postal_code' => '33301',
                'price' => 689000,
                'bedrooms' => 3,
                'bathrooms' => 2.5,
                'sqft' => 1850,
                'year_built' => 2017,
                'description' => 'Stunning intracoastal views from this 3/2.5 condo on Las Olas. Walking distance to restaurants and shops.',
                'features' => ['Intracoastal View', 'Balcony', 'Concierge', 'Fitness Center'],
                'listed_at' => '2026-04-01',
                'contact_id' => $contacts[10]->id,
            ],
            [
                'mls_listing_id' => null,
                'mls_number' => null,
                'title' => '890 Beach Blvd, Jacksonville Beach FL 32250',
                'listing_type' => 'residential',
                'status' => 'active',
                'address' => '890 Beach Blvd',
                'city' => 'Jacksonville Beach',
                'state_province' => 'FL',
                'postal_code' => '32250',
                'price' => 425000,
                'bedrooms' => 3,
                'bathrooms' => 2.0,
                'sqft' => 1800,
                'year_built' => 1998,
                'description' => 'Inherited property — needs inspection before listing. Great location steps from the beach.',
                'features' => ['Near Beach', 'Large Yard', 'Covered Patio'],
                'listed_at' => '2026-03-25',
                'contact_id' => $contacts[13]->id,
            ],
            [
                'mls_listing_id' => null,
                'mls_number' => null,
                'title' => '567 Magnolia Dr, Orlando FL 32801',
                'listing_type' => 'residential',
                'status' => 'coming_soon',
                'address' => '567 Magnolia Dr',
                'city' => 'Orlando',
                'state_province' => 'FL',
                'postal_code' => '32801',
                'price' => 520000,
                'bedrooms' => 4,
                'bathrooms' => 2.5,
                'sqft' => 2200,
                'year_built' => 2005,
                'description' => 'Beautiful family home near downtown Orlando. Downsizing seller — motivated and ready.',
                'features' => ['Open Floor Plan', 'Two-Car Garage', 'Community Pool'],
                'listed_at' => null,
                'contact_id' => $contacts[6]->id,
            ],
            [
                'mls_listing_id' => 'NAP2024090005',
                'mls_number' => 'N10567234',
                'title' => '1500 Gulf Shore Blvd N #802, Naples FL 34102',
                'listing_type' => 'residential',
                'status' => 'active',
                'address' => '1500 Gulf Shore Blvd N #802',
                'city' => 'Naples',
                'state_province' => 'FL',
                'postal_code' => '34102',
                'price' => 1450000,
                'bedrooms' => 3,
                'bathrooms' => 3.0,
                'sqft' => 2600,
                'year_built' => 2020,
                'description' => 'Stunning gulf-front condo in Naples. Panoramic water views, high-end finishes, private beach access.',
                'features' => ['Gulf View', 'Private Beach', 'Hurricane Windows', 'Gourmet Kitchen'],
                'listed_at' => '2026-03-10',
                'contact_id' => null,
            ],
        ];

        foreach ($mlsListings as $mlsData) {
            $listing = Listing::create([
                'user_id' => $user->id,
                'idx_connection_id' => $mlsData['mls_listing_id'] ? $miamiConnection->id : null,
                'mls_listing_id' => $mlsData['mls_listing_id'],
                'mls_slug' => $mlsData['mls_listing_id'] ? 'miamire' : null,
                'mls_number' => $mlsData['mls_number'],
                'title' => $mlsData['title'],
                'listing_type' => $mlsData['listing_type'],
                'status' => $mlsData['status'],
                'address' => $mlsData['address'],
                'city' => $mlsData['city'],
                'state_province' => $mlsData['state_province'],
                'postal_code' => $mlsData['postal_code'],
                'country' => 'US',
                'price' => $mlsData['price'],
                'bedrooms' => $mlsData['bedrooms'],
                'bathrooms' => $mlsData['bathrooms'],
                'sqft' => $mlsData['sqft'],
                'year_built' => $mlsData['year_built'],
                'description' => $mlsData['description'],
                'features' => $mlsData['features'],
                'listed_at' => $mlsData['listed_at'],
                'contact_id' => $mlsData['contact_id'],
                'synced_at' => $mlsData['mls_listing_id'] ? now() : null,
                'sync_status' => $mlsData['mls_listing_id'] ? 'synced' : null,
            ]);

            if ($mlsData['mls_listing_id']) {
                Activity::create([
                    'user_id' => $user->id,
                    'listing_id' => $listing->id,
                    'contact_id' => $mlsData['contact_id'],
                    'event_type' => 'listing_created',
                    'subject' => "Listing imported from MLS: {$listing->title}",
                    'created_at' => now()->subDays(3),
                    'updated_at' => now()->subDays(3),
                ]);
            }
        }

        // --- Timeline Events ---
        $timelineData = [
            [$contacts[0], 'contact_created', 'Sarah Johnson added', now()->subDays(15)],
            [$contacts[0], 'note_created', 'Note added', now()->subDays(10), 'Spoke with Sarah today. She\'s very motivated.'],
            [$contacts[0], 'call_logged', 'Outbound call — connected', now()->subDays(8), '3 min call discussing budget and timeline. Wants Brickell.'],
            [$contacts[0], 'email_sent', 'Sent listing packet', now()->subDays(6)],
            [$contacts[0], 'task_completed', 'Pre-approval verified', now()->subDays(2)],
            [$contacts[1], 'contact_created', 'Michael Chen added', now()->subDays(12)],
            [$contacts[1], 'call_logged', 'Outbound call — connected', now()->subDays(9), '4 min call about new construction in Weston.'],
            [$contacts[2], 'contact_created', 'Jessica Martinez added', now()->subDays(10)],
            [$contacts[3], 'contact_created', 'David Park added', now()->subDays(20)],
            [$contacts[3], 'note_created', 'Note added', now()->subDays(14), 'David referred Michael Chen.'],
            [$contacts[5], 'contact_created', 'James Wilson added', now()->subDays(8)],
            [$contacts[5], 'call_logged', 'Outbound call — connected', now()->subDays(5), '6 min call about relocation from NY to Naples.'],
            [$contacts[5], 'email_sent', 'Sent Naples waterfront listings', now()->subDays(3)],
            [$contacts[8], 'contact_created', 'Lisa Nguyen added', now()->subDays(6)],
            [$contacts[8], 'call_logged', 'Inbound call — connected', now()->subDays(4), 'Asked about Turnberry Ocean Colony.'],
            [$contacts[10], 'contact_created', 'Rachel Green added', now()->subDays(5)],
            [$contacts[10], 'call_logged', 'Outbound call — connected', now()->subDays(2), 'Discussed offer strategy for Las Olas.'],
            [$contacts[10], 'task_completed', 'Pulled comps for Las Olas 33301', now()->subDay()],
            [$contacts[10], 'email_sent', 'Sent offer strategy', now()->subHours(12)],
            [$contacts[13], 'contact_created', 'Kevin Thompson added', now()->subDays(7)],
            [$contacts[13], 'call_logged', 'Outbound call — connected', now()->subDays(4), 'Discussed inspection and pricing for Jacksonville Beach property.'],
        ];
        foreach ($timelineData as $row) {
            Activity::create([
                'user_id' => $user->id,
                'contact_id' => $row[0]->id,
                'event_type' => $row[1],
                'subject' => $row[2],
                'description' => $row[4] ?? null,
                'created_at' => $row[3],
                'updated_at' => $row[3],
            ]);
        }

        // Platform directories rendered on agent sites (/new-developments, /condos).
        $this->call([
            NewDevelopmentSeeder::class,
            CondoBuildingSeeder::class,
        ]);
    }
}
