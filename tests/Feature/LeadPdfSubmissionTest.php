<?php

use App\Models\Lead;
use App\Models\LeadPdfSubmission;
use App\Models\PdfTemplate;
use App\Models\PdfTemplateField;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function ensurePdfPermissions(): void
{
    Permission::firstOrCreate(['name' => 'view documents', 'guard_name' => 'web']);
}

function createPdfSubmissionUser(): User
{
    ensurePdfPermissions();
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    return $user;
}

function createPdfSubmissionUserWithPermission(string $permission): User
{
    ensurePdfPermissions();
    Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->givePermissionTo($permission);

    return $user;
}

function createPdfSubmissionUserWithoutPermission(): User
{
    ensurePdfPermissions();

    return User::factory()->create(['email_verified_at' => now()]);
}

it('can list available templates for a lead', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();

    PdfTemplate::factory()->count(2)->create(['is_active' => true]);
    PdfTemplate::factory()->create(['is_active' => false]);

    $response = $this->actingAs($user)->getJson("/api/leads/{$lead->id}/pdf-templates");

    $response->assertSuccessful()
        ->assertJsonCount(2, 'data');
});

it('filters templates by lead service', function () {
    $user = createPdfSubmissionUser();
    $service = Service::factory()->create();
    $otherService = Service::factory()->create();
    $lead = Lead::factory()->create(['service_id' => $service->id]);

    PdfTemplate::factory()->create(['service_id' => $service->id, 'is_active' => true]);
    PdfTemplate::factory()->create(['service_id' => null, 'is_active' => true]);
    PdfTemplate::factory()->create(['service_id' => $otherService->id, 'is_active' => true]);

    $response = $this->actingAs($user)->getJson("/api/leads/{$lead->id}/pdf-templates");

    $response->assertSuccessful()
        ->assertJsonCount(2, 'data');
});

it('can list submissions for a lead', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    LeadPdfSubmission::factory()->count(2)->create([
        'lead_id' => $lead->id,
        'pdf_template_id' => $template->id,
        'submitted_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->getJson("/api/leads/{$lead->id}/pdf-submissions");

    $response->assertSuccessful()
        ->assertJsonCount(2, 'data');
});

it('can create a pdf submission', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    $response = $this->actingAs($user)->postJson("/api/leads/{$lead->id}/pdf-submissions", [
        'pdf_template_id' => $template->id,
        'field_values' => ['full_name' => 'John Doe', 'email' => 'john@example.com'],
        'status' => 'draft',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.status', 'draft');

    expect(LeadPdfSubmission::count())->toBe(1);
    $submission = LeadPdfSubmission::first();
    expect($submission->submitted_by)->toBe($user->id);
    expect($submission->field_values)->toBe(['full_name' => 'John Doe', 'email' => 'john@example.com']);
});

it('validates required fields when creating a submission', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();

    $response = $this->actingAs($user)->postJson("/api/leads/{$lead->id}/pdf-submissions", []);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['pdf_template_id', 'field_values']);
});

it('can show a specific submission', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();
    PdfTemplateField::factory()->count(3)->create(['pdf_template_id' => $template->id]);

    $submission = LeadPdfSubmission::factory()->create([
        'lead_id' => $lead->id,
        'pdf_template_id' => $template->id,
        'submitted_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->getJson("/api/leads/{$lead->id}/pdf-submissions/{$submission->id}");

    $response->assertSuccessful()
        ->assertJsonPath('data.id', $submission->id)
        ->assertJsonPath('data.template.id', $template->id);
});

it('prevents showing a submission from a different lead', function () {
    $user = createPdfSubmissionUser();
    $lead1 = Lead::factory()->create();
    $lead2 = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    $submission = LeadPdfSubmission::factory()->create([
        'lead_id' => $lead1->id,
        'pdf_template_id' => $template->id,
        'submitted_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->getJson("/api/leads/{$lead2->id}/pdf-submissions/{$submission->id}");

    $response->assertNotFound();
});

it('can update a submission', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    $submission = LeadPdfSubmission::factory()->create([
        'lead_id' => $lead->id,
        'pdf_template_id' => $template->id,
        'submitted_by' => $user->id,
        'status' => 'draft',
    ]);

    $response = $this->actingAs($user)->patchJson("/api/leads/{$lead->id}/pdf-submissions/{$submission->id}", [
        'field_values' => ['full_name' => 'Jane Doe'],
        'status' => 'completed',
    ]);

    $response->assertSuccessful();
    $submission->refresh();
    expect($submission->field_values)->toBe(['full_name' => 'Jane Doe']);
    expect($submission->status)->toBe('completed');
});

it('can delete a submission', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    $submission = LeadPdfSubmission::factory()->create([
        'lead_id' => $lead->id,
        'pdf_template_id' => $template->id,
        'submitted_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->deleteJson("/api/leads/{$lead->id}/pdf-submissions/{$submission->id}");

    $response->assertSuccessful();
    expect(LeadPdfSubmission::count())->toBe(0);
});

it('cascades delete submissions when lead is deleted', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    LeadPdfSubmission::factory()->count(3)->create([
        'lead_id' => $lead->id,
        'pdf_template_id' => $template->id,
        'submitted_by' => $user->id,
    ]);

    $lead->forceDelete();

    expect(LeadPdfSubmission::count())->toBe(0);
});

it('can bulk delete submissions', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    $submissions = LeadPdfSubmission::factory()->count(3)->create([
        'lead_id' => $lead->id,
        'pdf_template_id' => $template->id,
        'submitted_by' => $user->id,
    ]);

    $ids = $submissions->pluck('id')->toArray();

    $response = $this->actingAs($user)->deleteJson("/api/leads/{$lead->id}/pdf-submissions/bulk", [
        'ids' => $ids,
    ]);

    $response->assertSuccessful()
        ->assertJsonPath('deleted_count', 3);

    expect(LeadPdfSubmission::count())->toBe(0);
});

it('bulk delete only deletes submissions the user owns', function () {
    $owner = createPdfSubmissionUserWithPermission('view documents');
    $otherUser = createPdfSubmissionUserWithPermission('view documents');
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    $ownSubmission = LeadPdfSubmission::factory()->create([
        'lead_id' => $lead->id,
        'pdf_template_id' => $template->id,
        'submitted_by' => $otherUser->id,
    ]);

    $otherSubmission = LeadPdfSubmission::factory()->create([
        'lead_id' => $lead->id,
        'pdf_template_id' => $template->id,
        'submitted_by' => $owner->id,
    ]);

    $response = $this->actingAs($otherUser)->deleteJson("/api/leads/{$lead->id}/pdf-submissions/bulk", [
        'ids' => [$ownSubmission->id, $otherSubmission->id],
    ]);

    $response->assertSuccessful()
        ->assertJsonPath('deleted_count', 1);

    expect(LeadPdfSubmission::count())->toBe(1);
    expect(LeadPdfSubmission::first()->id)->toBe($otherSubmission->id);
});

it('super admin can bulk delete any submissions', function () {
    $admin = createPdfSubmissionUser();
    $otherUser = createPdfSubmissionUserWithPermission('view documents');
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    LeadPdfSubmission::factory()->count(2)->create([
        'lead_id' => $lead->id,
        'pdf_template_id' => $template->id,
        'submitted_by' => $otherUser->id,
    ]);

    $ids = LeadPdfSubmission::pluck('id')->toArray();

    $response = $this->actingAs($admin)->deleteJson("/api/leads/{$lead->id}/pdf-submissions/bulk", [
        'ids' => $ids,
    ]);

    $response->assertSuccessful()
        ->assertJsonPath('deleted_count', 2);

    expect(LeadPdfSubmission::count())->toBe(0);
});

it('validates ids are required for bulk delete submissions', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();

    $response = $this->actingAs($user)->deleteJson("/api/leads/{$lead->id}/pdf-submissions/bulk", [
        'ids' => [],
    ]);

    $response->assertUnprocessable();
});

// =====================
// AUTHORIZATION TESTS
// =====================

it('unauthorized user cannot list templates', function () {
    $user = createPdfSubmissionUserWithoutPermission();
    $lead = Lead::factory()->create();

    $response = $this->actingAs($user)->getJson("/api/leads/{$lead->id}/pdf-templates");

    $response->assertForbidden();
});

it('unauthorized user cannot create submissions', function () {
    $user = createPdfSubmissionUserWithoutPermission();
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    $response = $this->actingAs($user)->postJson("/api/leads/{$lead->id}/pdf-submissions", [
        'pdf_template_id' => $template->id,
        'field_values' => ['name' => 'Test'],
        'status' => 'draft',
    ]);

    $response->assertForbidden();
});

it('user with view documents permission can create submissions', function () {
    $user = createPdfSubmissionUserWithPermission('view documents');
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    $response = $this->actingAs($user)->postJson("/api/leads/{$lead->id}/pdf-submissions", [
        'pdf_template_id' => $template->id,
        'field_values' => ['name' => 'Test'],
        'status' => 'draft',
    ]);

    $response->assertCreated();
});

it('user cannot delete another users submission', function () {
    $owner = createPdfSubmissionUserWithPermission('view documents');
    $otherUser = createPdfSubmissionUserWithPermission('view documents');
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    $submission = LeadPdfSubmission::factory()->create([
        'lead_id' => $lead->id,
        'pdf_template_id' => $template->id,
        'submitted_by' => $owner->id,
    ]);

    $response = $this->actingAs($otherUser)->deleteJson("/api/leads/{$lead->id}/pdf-submissions/{$submission->id}");

    $response->assertForbidden();
    expect(LeadPdfSubmission::count())->toBe(1);
});

it('super admin can delete any submission', function () {
    $user = createPdfSubmissionUser();
    $otherUser = createPdfSubmissionUserWithPermission('view documents');
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    $submission = LeadPdfSubmission::factory()->create([
        'lead_id' => $lead->id,
        'pdf_template_id' => $template->id,
        'submitted_by' => $otherUser->id,
    ]);

    $response = $this->actingAs($user)->deleteJson("/api/leads/{$lead->id}/pdf-submissions/{$submission->id}");

    $response->assertSuccessful();
    expect(LeadPdfSubmission::count())->toBe(0);
});

// =====================
// REQUIRED FIELD VALIDATION TESTS
// =====================

it('rejects completed submission when required fields are missing', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    PdfTemplateField::factory()->create([
        'pdf_template_id' => $template->id,
        'field_name' => 'full_name',
        'is_required' => true,
    ]);
    PdfTemplateField::factory()->create([
        'pdf_template_id' => $template->id,
        'field_name' => 'email',
        'is_required' => true,
    ]);

    $response = $this->actingAs($user)->postJson("/api/leads/{$lead->id}/pdf-submissions", [
        'pdf_template_id' => $template->id,
        'field_values' => ['full_name' => 'John Doe'],
        'status' => 'completed',
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['field_values']);
});

it('allows completed submission when all required fields are filled', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    PdfTemplateField::factory()->create([
        'pdf_template_id' => $template->id,
        'field_name' => 'full_name',
        'is_required' => true,
    ]);

    $response = $this->actingAs($user)->postJson("/api/leads/{$lead->id}/pdf-submissions", [
        'pdf_template_id' => $template->id,
        'field_values' => ['full_name' => 'John Doe'],
        'status' => 'completed',
    ]);

    $response->assertCreated();
});

it('allows draft submission even with missing required fields', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    PdfTemplateField::factory()->create([
        'pdf_template_id' => $template->id,
        'field_name' => 'full_name',
        'is_required' => true,
    ]);

    $response = $this->actingAs($user)->postJson("/api/leads/{$lead->id}/pdf-submissions", [
        'pdf_template_id' => $template->id,
        'field_values' => ['other_field' => 'value'],
        'status' => 'draft',
    ]);

    $response->assertCreated();
});

it('validates required fields on update to completed status', function () {
    $user = createPdfSubmissionUser();
    $lead = Lead::factory()->create();
    $template = PdfTemplate::factory()->create();

    PdfTemplateField::factory()->create([
        'pdf_template_id' => $template->id,
        'field_name' => 'full_name',
        'is_required' => true,
    ]);

    $submission = LeadPdfSubmission::factory()->create([
        'lead_id' => $lead->id,
        'pdf_template_id' => $template->id,
        'submitted_by' => $user->id,
        'status' => 'draft',
    ]);

    $response = $this->actingAs($user)->patchJson("/api/leads/{$lead->id}/pdf-submissions/{$submission->id}", [
        'field_values' => ['other_field' => 'value'],
        'status' => 'completed',
    ]);

    $response->assertUnprocessable();
});
