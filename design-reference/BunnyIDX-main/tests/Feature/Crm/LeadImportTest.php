<?php

namespace Tests\Feature\Crm;

use App\Models\Contact;
use App\Models\LeadImport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class LeadImportTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->user = User::factory()->create();
    }

    public function test_lead_imports_page_loads(): void
    {
        $this->actingAs($this->user)
            ->get(route('crm.settings.tab', 'lead-imports'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Crm/Settings/Index')
                ->has('leadImports')
            );
    }

    public function test_sample_csv_is_downloadable(): void
    {
        $this->actingAs($this->user)
            ->get(route('crm.lead-imports.sample'))
            ->assertOk()
            ->assertDownload('lead-import-sample.csv');
    }

    public function test_valid_csv_creates_contacts(): void
    {
        $import = $this->uploadCsv(
            "first_name,last_name,email,phone\n".
            "John,Smith,john@example.com,+15551234567\n".
            "Bob,Lee,bob@example.com,\n"
        );

        $this->processImport($import, [0 => 'first_name', 1 => 'last_name', 2 => 'email', 3 => 'phone'])
            ->assertRedirect(route('crm.settings', ['tab' => 'lead-imports']));

        $this->assertDatabaseHas('contacts', ['email' => 'john@example.com', 'user_id' => $this->user->id]);
        $this->assertDatabaseHas('contacts', ['email' => 'bob@example.com']);

        $import->refresh();
        $this->assertSame(2, $import->imported_count);
        $this->assertSame(0, $import->skipped_count);
    }

    public function test_invalid_email_row_is_skipped(): void
    {
        $import = $this->uploadCsv(
            "first_name,email\n".
            "Jane,not-an-email\n".
            "Amy,amy@example.com\n"
        );

        $this->processImport($import, [0 => 'first_name', 1 => 'email']);

        $import->refresh();
        $this->assertSame(1, $import->imported_count);
        $this->assertSame(1, $import->skipped_count);
        $this->assertDatabaseHas('contacts', ['email' => 'amy@example.com']);
        $this->assertDatabaseMissing('contacts', ['email' => 'not-an-email']);
    }

    public function test_duplicate_email_does_not_create_a_second_contact(): void
    {
        Contact::create([
            'user_id' => $this->user->id,
            'first_name' => 'John',
            'last_name' => 'Smith',
            'email' => 'john@example.com',
            'source' => 'manual',
        ]);

        $import = $this->uploadCsv("first_name,email\nJohn,john@example.com\n");
        $this->processImport($import, [0 => 'first_name', 1 => 'email']);

        $this->assertSame(1, Contact::where('email', 'john@example.com')->count());
        $import->refresh();
        $this->assertSame(0, $import->imported_count);
        $this->assertSame(1, $import->skipped_count);
    }

    public function test_phone_duplicate_is_skipped_when_email_missing(): void
    {
        Contact::create([
            'user_id' => $this->user->id,
            'first_name' => 'Existing',
            'last_name' => 'Contact',
            'phone' => '+15550001111',
            'source' => 'manual',
        ]);

        $import = $this->uploadCsv("first_name,phone\nDup,+15550001111\nFresh,+15552223333\n");
        $this->processImport($import, [0 => 'first_name', 1 => 'phone']);

        $import->refresh();
        $this->assertSame(1, $import->imported_count); // only the fresh phone
        $this->assertSame(1, $import->skipped_count);  // the duplicate
    }

    public function test_empty_rows_are_skipped(): void
    {
        $import = $this->uploadCsv("first_name,email\n,\nKim,kim@example.com\n");
        $this->processImport($import, [0 => 'first_name', 1 => 'email']);

        $import->refresh();
        $this->assertSame(1, $import->imported_count);
        $this->assertSame(1, $import->skipped_count);
    }

    public function test_result_message_reports_imported_and_skipped_counts(): void
    {
        $import = $this->uploadCsv(
            "first_name,email\n".
            "Ok,ok@example.com\n".
            "Bad,nope\n"
        );

        $this->processImport($import, [0 => 'first_name', 1 => 'email'])
            ->assertSessionHas('success', fn ($msg) => str_contains($msg, 'Imported 1 contact')
                && str_contains($msg, 'invalid email'));
    }

    // ── helpers ──────────────────────────────────────────────────────

    private function uploadCsv(string $content, string $name = 'leads.csv'): LeadImport
    {
        $file = UploadedFile::fake()->createWithContent($name, $content);

        $this->actingAs($this->user)
            ->post(route('crm.lead-imports.upload'), ['file' => $file])
            ->assertRedirect();

        return LeadImport::where('user_id', $this->user->id)->latest('id')->firstOrFail();
    }

    private function processImport(LeadImport $import, array $mapping): TestResponse
    {
        return $this->actingAs($this->user)
            ->post(route('crm.lead-imports.process', $import->id), ['mapping' => $mapping]);
    }
}
