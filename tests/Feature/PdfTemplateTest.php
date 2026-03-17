<?php

use App\Models\PdfTemplate;
use App\Models\PdfTemplateField;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function createPdfTemplateAdmin(): User
{
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    return $user;
}

it('can list pdf templates', function () {
    $user = createPdfTemplateAdmin();
    PdfTemplate::factory()->count(3)->create();

    $response = $this->actingAs($user)->getJson('/api/pdf-templates');

    $response->assertSuccessful()
        ->assertJsonCount(3, 'data');
});

it('can create a pdf template with file', function () {
    Storage::fake('public');

    $user = createPdfTemplateAdmin();

    $response = $this->actingAs($user)->postJson('/api/pdf-templates', [
        'name' => 'Dominica Application',
        'description' => 'CBI application form',
        'file' => UploadedFile::fake()->create('form.pdf', 100, 'application/pdf'),
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Dominica Application');

    expect(PdfTemplate::count())->toBe(1);
    expect(PdfTemplate::first()->created_by)->toBe($user->id);
});

it('validates name and file are required when creating a template', function () {
    $user = createPdfTemplateAdmin();

    $response = $this->actingAs($user)->postJson('/api/pdf-templates', []);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'file']);
});

it('can show a pdf template with its fields', function () {
    $user = createPdfTemplateAdmin();
    $template = PdfTemplate::factory()->create();
    PdfTemplateField::factory()->count(5)->create(['pdf_template_id' => $template->id]);

    $response = $this->actingAs($user)->getJson("/api/pdf-templates/{$template->id}");

    $response->assertSuccessful()
        ->assertJsonPath('data.id', $template->id)
        ->assertJsonCount(5, 'data.fields');
});

it('can update a pdf template', function () {
    $user = createPdfTemplateAdmin();
    $template = PdfTemplate::factory()->create(['name' => 'Old Name']);

    $response = $this->actingAs($user)->patchJson("/api/pdf-templates/{$template->id}", [
        'name' => 'New Name',
        'is_active' => false,
    ]);

    $response->assertSuccessful();
    $template->refresh();
    expect($template->name)->toBe('New Name');
    expect($template->is_active)->toBeFalse();
});

it('can delete a pdf template', function () {
    $user = createPdfTemplateAdmin();
    $template = PdfTemplate::factory()->create();

    $response = $this->actingAs($user)->deleteJson("/api/pdf-templates/{$template->id}");

    $response->assertSuccessful();
    expect(PdfTemplate::count())->toBe(0);
});

it('can save field configuration for a template', function () {
    $user = createPdfTemplateAdmin();
    $template = PdfTemplate::factory()->create();

    $response = $this->actingAs($user)->postJson("/api/pdf-templates/{$template->id}/fields", [
        'fields' => [
            [
                'field_name' => 'full_name',
                'field_label' => 'Full Name',
                'field_type' => 'text',
                'lead_field_mapping' => 'name',
                'sort_order' => 0,
                'is_required' => true,
            ],
            [
                'field_name' => 'email_address',
                'field_label' => 'Email Address',
                'field_type' => 'text',
                'lead_field_mapping' => 'email',
                'sort_order' => 1,
                'is_required' => false,
            ],
        ],
    ]);

    $response->assertSuccessful();
    expect($template->fields()->count())->toBe(2);
    expect($template->fields()->where('is_required', true)->count())->toBe(1);
});

it('replaces existing fields when saving field configuration', function () {
    $user = createPdfTemplateAdmin();
    $template = PdfTemplate::factory()->create();
    PdfTemplateField::factory()->count(3)->create(['pdf_template_id' => $template->id]);

    $response = $this->actingAs($user)->postJson("/api/pdf-templates/{$template->id}/fields", [
        'fields' => [
            [
                'field_name' => 'new_field',
                'field_label' => 'New Field',
                'field_type' => 'text',
                'sort_order' => 0,
                'is_required' => false,
            ],
        ],
    ]);

    $response->assertSuccessful();
    expect($template->fields()->count())->toBe(1);
    expect($template->fields()->first()->field_name)->toBe('new_field');
});

it('validates field type when saving fields', function () {
    $user = createPdfTemplateAdmin();
    $template = PdfTemplate::factory()->create();

    $response = $this->actingAs($user)->postJson("/api/pdf-templates/{$template->id}/fields", [
        'fields' => [
            [
                'field_name' => 'test',
                'field_label' => 'Test',
                'field_type' => 'invalid_type',
                'sort_order' => 0,
                'is_required' => false,
            ],
        ],
    ]);

    $response->assertUnprocessable();
});

it('cascades delete to fields when template is deleted', function () {
    $user = createPdfTemplateAdmin();
    $template = PdfTemplate::factory()->create();
    PdfTemplateField::factory()->count(3)->create(['pdf_template_id' => $template->id]);

    $this->actingAs($user)->deleteJson("/api/pdf-templates/{$template->id}");

    expect(PdfTemplateField::count())->toBe(0);
});

it('saves fields with section and repeat_group', function () {
    $user = createPdfTemplateAdmin();
    $template = PdfTemplate::factory()->create();

    $response = $this->actingAs($user)->postJson("/api/pdf-templates/{$template->id}/fields", [
        'fields' => [
            [
                'field_name' => 'Full Name',
                'field_label' => 'Full Name',
                'field_type' => 'text',
                'sort_order' => 0,
                'page_number' => 4,
                'section' => 'D4 Dependents',
                'repeat_group' => 'd4_dependents',
                'is_required' => false,
            ],
            [
                'field_name' => 'Date of Birth',
                'field_label' => 'Date of Birth',
                'field_type' => 'date',
                'sort_order' => 1,
                'page_number' => 4,
                'section' => 'D4 Dependents',
                'repeat_group' => 'd4_dependents',
                'is_required' => false,
            ],
            [
                'field_name' => 'passport_number',
                'field_label' => 'Passport Number',
                'field_type' => 'text',
                'sort_order' => 2,
                'section' => 'D1 Main Applicant',
                'is_required' => true,
            ],
        ],
    ]);

    $response->assertSuccessful();
    expect($template->fields()->count())->toBe(3);

    $repeatGroupFields = $template->fields()->whereNotNull('repeat_group')->get();
    expect($repeatGroupFields)->toHaveCount(2);
    expect($repeatGroupFields->first()->repeat_group)->toBe('d4_dependents');
    expect($repeatGroupFields->first()->section)->toBe('D4 Dependents');

    $sectionedField = $template->fields()->where('field_name', 'passport_number')->first();
    expect($sectionedField->section)->toBe('D1 Main Applicant');
    expect($sectionedField->repeat_group)->toBeNull();
});

it('returns section and repeat_group in show response', function () {
    $user = createPdfTemplateAdmin();
    $template = PdfTemplate::factory()->create();
    PdfTemplateField::factory()
        ->withSection('D4 Dependents')
        ->repeatGroup('d4_dependents')
        ->create(['pdf_template_id' => $template->id, 'field_name' => 'Full Name']);

    $response = $this->actingAs($user)->getJson("/api/pdf-templates/{$template->id}");

    $response->assertSuccessful();
    $field = $response->json('data.fields.0');
    expect($field['section'])->toBe('D4 Dependents');
    expect($field['repeat_group'])->toBe('d4_dependents');
});

it('preserves section and repeat_group on field re-save', function () {
    $user = createPdfTemplateAdmin();
    $template = PdfTemplate::factory()->create();
    PdfTemplateField::factory()
        ->withSection('Page 4')
        ->repeatGroup('d4_dependents')
        ->create(['pdf_template_id' => $template->id]);

    // Re-save with updated fields
    $response = $this->actingAs($user)->postJson("/api/pdf-templates/{$template->id}/fields", [
        'fields' => [
            [
                'field_name' => 'Full Name',
                'field_label' => 'Full Name',
                'field_type' => 'text',
                'sort_order' => 0,
                'section' => 'D4 Family Members',
                'repeat_group' => 'd4_dependents',
                'is_required' => false,
            ],
        ],
    ]);

    $response->assertSuccessful();
    $field = $template->fields()->first();
    expect($field->section)->toBe('D4 Family Members');
    expect($field->repeat_group)->toBe('d4_dependents');
});

it('can bulk delete pdf templates', function () {
    Storage::fake('public');

    $user = createPdfTemplateAdmin();
    $templates = PdfTemplate::factory()->count(3)->create();
    PdfTemplateField::factory()->count(2)->create(['pdf_template_id' => $templates[0]->id]);

    $ids = $templates->pluck('id')->toArray();

    $response = $this->actingAs($user)->deleteJson('/api/pdf-templates/bulk', [
        'ids' => $ids,
    ]);

    $response->assertSuccessful()
        ->assertJsonPath('deleted_count', 3);

    expect(PdfTemplate::count())->toBe(0);
    expect(PdfTemplateField::count())->toBe(0);
});

it('validates ids are required for bulk delete', function () {
    $user = createPdfTemplateAdmin();

    $response = $this->actingAs($user)->deleteJson('/api/pdf-templates/bulk', [
        'ids' => [],
    ]);

    $response->assertUnprocessable();
});

it('returns 404 when scanning template with missing file', function () {
    $user = createPdfTemplateAdmin();
    $template = PdfTemplate::factory()->create(['file_path' => 'pdf-templates/nonexistent.pdf']);

    $response = $this->actingAs($user)->postJson("/api/pdf-templates/{$template->id}/scan");

    $response->assertNotFound()
        ->assertJsonPath('error', 'PDF file not found.');
});

it('can access settings page for pdf templates', function () {
    $user = createPdfTemplateAdmin();

    $response = $this->actingAs($user)->get('/settings/management/pdf-templates');

    $response->assertSuccessful();
});
