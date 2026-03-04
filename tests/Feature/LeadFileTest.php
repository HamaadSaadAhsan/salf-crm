<?php

use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function createFileTestUser(): User
{
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    return $user;
}

it('can list files for a lead', function () {
    $user = createFileTestUser();
    $lead = Lead::factory()->create();

    $lead->addMedia(UploadedFile::fake()->image('photo.jpg'))
        ->toMediaCollection('files');

    $response = $this->actingAs($user)->getJson("/api/leads/{$lead->id}/files");

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.file_name', 'photo.jpg');
});

it('can upload files to a lead', function () {
    Storage::fake('public');

    $user = createFileTestUser();
    $lead = Lead::factory()->create();

    $response = $this->actingAs($user)->postJson("/api/leads/{$lead->id}/files", [
        'files' => [
            UploadedFile::fake()->image('doc1.jpg', 100, 100),
            UploadedFile::fake()->create('report.pdf', 500, 'application/pdf'),
        ],
    ]);

    $response->assertCreated()
        ->assertJsonCount(2, 'data');

    expect($lead->getMedia('files'))->toHaveCount(2);
});

it('validates file upload requires files', function () {
    $user = createFileTestUser();
    $lead = Lead::factory()->create();

    $response = $this->actingAs($user)->postJson("/api/leads/{$lead->id}/files", []);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors('files');
});

it('can download a file from a lead', function () {
    $user = createFileTestUser();
    $lead = Lead::factory()->create();

    $media = $lead->addMedia(UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'))
        ->toMediaCollection('files');

    $response = $this->actingAs($user)->get("/api/leads/{$lead->id}/files/{$media->id}/download");

    $response->assertOk()
        ->assertDownload('document.pdf');
});

it('can delete a file from a lead', function () {
    $user = createFileTestUser();
    $lead = Lead::factory()->create();

    $media = $lead->addMedia(UploadedFile::fake()->image('photo.jpg'))
        ->toMediaCollection('files');

    $response = $this->actingAs($user)->deleteJson("/api/leads/{$lead->id}/files/{$media->id}");

    $response->assertOk();
    expect($lead->getMedia('files'))->toHaveCount(0);
});

it('prevents downloading a file from a different lead', function () {
    $user = createFileTestUser();
    $lead1 = Lead::factory()->create();
    $lead2 = Lead::factory()->create();

    $media = $lead1->addMedia(UploadedFile::fake()->image('photo.jpg'))
        ->toMediaCollection('files');

    $response = $this->actingAs($user)->get("/api/leads/{$lead2->id}/files/{$media->id}/download");

    $response->assertNotFound();
});

it('prevents deleting a file from a different lead', function () {
    $user = createFileTestUser();
    $lead1 = Lead::factory()->create();
    $lead2 = Lead::factory()->create();

    $media = $lead1->addMedia(UploadedFile::fake()->image('photo.jpg'))
        ->toMediaCollection('files');

    $response = $this->actingAs($user)->deleteJson("/api/leads/{$lead2->id}/files/{$media->id}");

    $response->assertNotFound();
});
