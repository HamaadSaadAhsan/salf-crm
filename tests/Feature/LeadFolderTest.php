<?php

use App\Models\Lead;
use App\Models\LeadFolder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function createFolderTestUser(): User
{
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    return $user;
}

it('can list folders for a lead', function () {
    $user = createFolderTestUser();
    $lead = Lead::factory()->create();

    LeadFolder::factory()->create(['lead_id' => $lead->id, 'name' => 'Documents']);
    LeadFolder::factory()->create(['lead_id' => $lead->id, 'name' => 'Images']);

    $response = $this->actingAs($user)->getJson("/api/leads/{$lead->id}/folders");

    $response->assertOk()
        ->assertJsonCount(2, 'data');
});

it('can create a folder for a lead', function () {
    $user = createFolderTestUser();
    $lead = Lead::factory()->create();

    $response = $this->actingAs($user)->postJson("/api/leads/{$lead->id}/folders", [
        'name' => 'Contracts',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Contracts');

    expect($lead->folders)->toHaveCount(1);
});

it('validates folder name is required', function () {
    $user = createFolderTestUser();
    $lead = Lead::factory()->create();

    $response = $this->actingAs($user)->postJson("/api/leads/{$lead->id}/folders", []);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors('name');
});

it('can rename a folder', function () {
    $user = createFolderTestUser();
    $lead = Lead::factory()->create();
    $folder = LeadFolder::factory()->create(['lead_id' => $lead->id, 'name' => 'Old Name']);

    $response = $this->actingAs($user)->patchJson("/api/leads/{$lead->id}/folders/{$folder->id}/rename", [
        'name' => 'New Name',
    ]);

    $response->assertOk();
    expect($folder->fresh()->name)->toBe('New Name');
});

it('can delete a folder', function () {
    $user = createFolderTestUser();
    $lead = Lead::factory()->create();
    $folder = LeadFolder::factory()->create(['lead_id' => $lead->id, 'name' => 'To Delete']);

    $response = $this->actingAs($user)->deleteJson("/api/leads/{$lead->id}/folders/{$folder->id}");

    $response->assertOk();
    expect(LeadFolder::find($folder->id))->toBeNull();
});

it('removes folder_id from files when folder is deleted', function () {
    $user = createFolderTestUser();
    $lead = Lead::factory()->create();
    $folder = LeadFolder::factory()->create(['lead_id' => $lead->id, 'name' => 'Documents']);

    $media = $lead->addMedia(UploadedFile::fake()->image('photo.jpg'))
        ->withCustomProperties(['folder_id' => $folder->id])
        ->toMediaCollection('files');

    $this->actingAs($user)->deleteJson("/api/leads/{$lead->id}/folders/{$folder->id}");

    $media->refresh();
    expect($media->getCustomProperty('folder_id'))->toBeNull();
});

it('prevents renaming a folder from a different lead', function () {
    $user = createFolderTestUser();
    $lead1 = Lead::factory()->create();
    $lead2 = Lead::factory()->create();
    $folder = LeadFolder::factory()->create(['lead_id' => $lead1->id, 'name' => 'Folder']);

    $response = $this->actingAs($user)->patchJson("/api/leads/{$lead2->id}/folders/{$folder->id}/rename", [
        'name' => 'Hacked',
    ]);

    $response->assertNotFound();
});

it('can move a file to a folder', function () {
    $user = createFolderTestUser();
    $lead = Lead::factory()->create();
    $folder = LeadFolder::factory()->create(['lead_id' => $lead->id, 'name' => 'Documents']);

    $media = $lead->addMedia(UploadedFile::fake()->image('photo.jpg'))
        ->toMediaCollection('files');

    $response = $this->actingAs($user)->patchJson("/api/leads/{$lead->id}/files/{$media->id}/move", [
        'folder_id' => $folder->id,
    ]);

    $response->assertOk();

    $media->refresh();
    expect($media->getCustomProperty('folder_id'))->toBe($folder->id);
});

it('can move a file back to root', function () {
    $user = createFolderTestUser();
    $lead = Lead::factory()->create();
    $folder = LeadFolder::factory()->create(['lead_id' => $lead->id, 'name' => 'Documents']);

    $media = $lead->addMedia(UploadedFile::fake()->image('photo.jpg'))
        ->withCustomProperties(['folder_id' => $folder->id])
        ->toMediaCollection('files');

    $response = $this->actingAs($user)->patchJson("/api/leads/{$lead->id}/files/{$media->id}/move", [
        'folder_id' => null,
    ]);

    $response->assertOk();

    $media->refresh();
    expect($media->getCustomProperty('folder_id'))->toBeNull();
});

it('includes folder_id in file listing', function () {
    $user = createFolderTestUser();
    $lead = Lead::factory()->create();
    $folder = LeadFolder::factory()->create(['lead_id' => $lead->id, 'name' => 'Documents']);

    $lead->addMedia(UploadedFile::fake()->image('photo.jpg'))
        ->withCustomProperties(['folder_id' => $folder->id])
        ->toMediaCollection('files');

    $response = $this->actingAs($user)->getJson("/api/leads/{$lead->id}/files");

    $response->assertOk()
        ->assertJsonPath('data.0.folder_id', $folder->id);
});
