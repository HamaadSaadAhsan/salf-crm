<?php

use App\Models\Lead;
use App\Models\LeadGoogleDriveFile;
use App\Models\StorageAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function createDriveFileTestUser(): User
{
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    return $user;
}

it('can list google drive files for a lead', function () {
    $user = createDriveFileTestUser();
    $lead = Lead::factory()->create();
    $account = StorageAccount::factory()->create(['user_id' => $user->id]);

    LeadGoogleDriveFile::factory()->create([
        'lead_id' => $lead->id,
        'storage_account_id' => $account->id,
        'file_name' => 'document.pdf',
    ]);

    $response = $this->actingAs($user)
        ->getJson("/api/leads/{$lead->id}/google-drive-files");

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.file_name', 'document.pdf');
});

it('can attach a google drive file to a lead', function () {
    $user = createDriveFileTestUser();
    $lead = Lead::factory()->create();
    $account = StorageAccount::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)
        ->postJson("/api/leads/{$lead->id}/google-drive-files", [
            'storage_account_id' => $account->id,
            'google_file_id' => 'abc123fileId',
            'file_name' => 'report.xlsx',
            'mime_type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'file_size' => 204800,
            'icon_link' => 'https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'web_view_link' => 'https://docs.google.com/spreadsheets/d/abc123/edit',
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.file_name', 'report.xlsx')
        ->assertJsonPath('data.google_file_id', 'abc123fileId');

    $this->assertDatabaseHas('lead_google_drive_files', [
        'lead_id' => $lead->id,
        'storage_account_id' => $account->id,
        'google_file_id' => 'abc123fileId',
        'file_name' => 'report.xlsx',
    ]);
});

it('validates required fields when attaching a drive file', function () {
    $user = createDriveFileTestUser();
    $lead = Lead::factory()->create();

    $response = $this->actingAs($user)
        ->postJson("/api/leads/{$lead->id}/google-drive-files", []);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['storage_account_id', 'google_file_id', 'file_name']);
});

it('prevents attaching with another users storage account', function () {
    $user = createDriveFileTestUser();
    $otherUser = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create();
    $otherAccount = StorageAccount::factory()->create(['user_id' => $otherUser->id]);

    $response = $this->actingAs($user)
        ->postJson("/api/leads/{$lead->id}/google-drive-files", [
            'storage_account_id' => $otherAccount->id,
            'google_file_id' => 'abc123',
            'file_name' => 'stolen.pdf',
        ]);

    $response->assertNotFound();
    $this->assertDatabaseMissing('lead_google_drive_files', [
        'lead_id' => $lead->id,
        'storage_account_id' => $otherAccount->id,
    ]);
});

it('can detach a google drive file from a lead', function () {
    $user = createDriveFileTestUser();
    $lead = Lead::factory()->create();
    $account = StorageAccount::factory()->create(['user_id' => $user->id]);

    $linkedFile = LeadGoogleDriveFile::factory()->create([
        'lead_id' => $lead->id,
        'storage_account_id' => $account->id,
    ]);

    $response = $this->actingAs($user)
        ->deleteJson("/api/leads/{$lead->id}/google-drive-files/{$linkedFile->id}");

    $response->assertOk()
        ->assertJsonPath('message', 'File reference removed.');

    $this->assertDatabaseMissing('lead_google_drive_files', ['id' => $linkedFile->id]);
});

it('prevents detaching a file that belongs to a different lead', function () {
    $user = createDriveFileTestUser();
    $lead1 = Lead::factory()->create();
    $lead2 = Lead::factory()->create();
    $account = StorageAccount::factory()->create(['user_id' => $user->id]);

    $linkedFile = LeadGoogleDriveFile::factory()->create([
        'lead_id' => $lead1->id,
        'storage_account_id' => $account->id,
    ]);

    $response = $this->actingAs($user)
        ->deleteJson("/api/leads/{$lead2->id}/google-drive-files/{$linkedFile->id}");

    $response->assertNotFound();
    $this->assertDatabaseHas('lead_google_drive_files', ['id' => $linkedFile->id]);
});

it('cascades deletion when storage account is disconnected', function () {
    $user = createDriveFileTestUser();
    $lead = Lead::factory()->create();
    $account = StorageAccount::factory()->create(['user_id' => $user->id]);

    LeadGoogleDriveFile::factory()->count(3)->create([
        'lead_id' => $lead->id,
        'storage_account_id' => $account->id,
    ]);

    expect(LeadGoogleDriveFile::where('storage_account_id', $account->id)->count())->toBe(3);

    $account->delete();

    expect(LeadGoogleDriveFile::where('storage_account_id', $account->id)->count())->toBe(0);
});

it('cascades deletion when lead is deleted', function () {
    $user = createDriveFileTestUser();
    $lead = Lead::factory()->create();
    $account = StorageAccount::factory()->create(['user_id' => $user->id]);

    LeadGoogleDriveFile::factory()->count(2)->create([
        'lead_id' => $lead->id,
        'storage_account_id' => $account->id,
    ]);

    expect(LeadGoogleDriveFile::where('lead_id', $lead->id)->count())->toBe(2);

    $lead->forceDelete();

    expect(LeadGoogleDriveFile::where('lead_id', $lead->id)->count())->toBe(0);
});

it('includes storage account email when listing drive files', function () {
    $user = createDriveFileTestUser();
    $lead = Lead::factory()->create();
    $account = StorageAccount::factory()->create([
        'user_id' => $user->id,
        'provider_account_email' => 'myaccount@gmail.com',
    ]);

    LeadGoogleDriveFile::factory()->create([
        'lead_id' => $lead->id,
        'storage_account_id' => $account->id,
    ]);

    $response = $this->actingAs($user)
        ->getJson("/api/leads/{$lead->id}/google-drive-files");

    $response->assertOk()
        ->assertJsonPath('data.0.storage_account.provider_account_email', 'myaccount@gmail.com');
});
