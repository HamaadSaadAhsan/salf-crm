<?php

use App\Models\StorageAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function createDriveTestUser(): User
{
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    return $user;
}

it('redirects to Google OAuth for drive connect', function () {
    $user = createDriveTestUser();

    $response = $this->actingAs($user)
        ->get('/settings/storage-accounts/google-drive/connect');

    $response->assertRedirect();
    expect($response->headers->get('Location'))->toContain('accounts.google.com');
});

it('handles OAuth callback and creates a storage account', function () {
    $user = createDriveTestUser();

    $socialiteUser = new SocialiteUser;
    $socialiteUser->map([
        'id' => '123456',
        'name' => 'Test User',
        'email' => 'test@gmail.com',
        'avatar' => null,
    ]);
    $socialiteUser->token = 'fake-access-token';
    $socialiteUser->refreshToken = 'fake-refresh-token';
    $socialiteUser->expiresIn = 3600;

    Socialite::shouldReceive('driver')
        ->with('google_drive')
        ->andReturn(
            tap(Mockery::mock(\Laravel\Socialite\Two\GoogleProvider::class), function ($mock) use ($socialiteUser) {
                $mock->shouldReceive('user')->once()->andReturn($socialiteUser);
            })
        );

    $response = $this->actingAs($user)
        ->get('/settings/storage-accounts/google-drive/callback');

    $response->assertRedirect(route('settings.storage-accounts'));

    $this->assertDatabaseHas('storage_accounts', [
        'user_id' => $user->id,
        'provider' => 'google_drive',
        'provider_account_email' => 'test@gmail.com',
        'provider_account_name' => 'Test User',
        'is_active' => true,
    ]);
});

it('updates existing storage account on re-connect', function () {
    $user = createDriveTestUser();

    StorageAccount::factory()->create([
        'user_id' => $user->id,
        'provider' => 'google_drive',
        'provider_account_email' => 'test@gmail.com',
        'provider_account_name' => 'Old Name',
    ]);

    $socialiteUser = new SocialiteUser;
    $socialiteUser->map([
        'id' => '123456',
        'name' => 'New Name',
        'email' => 'test@gmail.com',
        'avatar' => null,
    ]);
    $socialiteUser->token = 'new-access-token';
    $socialiteUser->refreshToken = 'new-refresh-token';
    $socialiteUser->expiresIn = 3600;

    Socialite::shouldReceive('driver')
        ->with('google_drive')
        ->andReturn(
            tap(Mockery::mock(\Laravel\Socialite\Two\GoogleProvider::class), function ($mock) use ($socialiteUser) {
                $mock->shouldReceive('user')->once()->andReturn($socialiteUser);
            })
        );

    $this->actingAs($user)
        ->get('/settings/storage-accounts/google-drive/callback');

    expect(StorageAccount::where('user_id', $user->id)->count())->toBe(1);
    $this->assertDatabaseHas('storage_accounts', [
        'user_id' => $user->id,
        'provider_account_name' => 'New Name',
    ]);
});

it('can disconnect a storage account', function () {
    $user = createDriveTestUser();

    $account = StorageAccount::factory()->create([
        'user_id' => $user->id,
        'provider' => 'google_drive',
    ]);

    $response = $this->actingAs($user)
        ->delete("/settings/storage-accounts/google-drive/{$account->id}/disconnect");

    $response->assertRedirect(route('settings.storage-accounts'));
    $this->assertDatabaseMissing('storage_accounts', ['id' => $account->id]);
});

it('prevents disconnecting another users storage account', function () {
    $user = createDriveTestUser();
    $otherUser = User::factory()->create(['email_verified_at' => now()]);

    $account = StorageAccount::factory()->create([
        'user_id' => $otherUser->id,
        'provider' => 'google_drive',
    ]);

    $response = $this->actingAs($user)
        ->delete("/settings/storage-accounts/google-drive/{$account->id}/disconnect");

    $response->assertForbidden();
    $this->assertDatabaseHas('storage_accounts', ['id' => $account->id]);
});

it('shows storage accounts page with connected accounts', function () {
    $user = createDriveTestUser();

    StorageAccount::factory()->create([
        'user_id' => $user->id,
        'provider' => 'google_drive',
        'provider_account_email' => 'drive@gmail.com',
    ]);

    $response = $this->actingAs($user)
        ->get('/settings/storage-accounts');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/storage-accounts')
            ->has('storageAccounts', 1)
            ->where('storageAccounts.0.provider_account_email', 'drive@gmail.com')
        );
});

it('shows empty storage accounts page', function () {
    $user = createDriveTestUser();

    $response = $this->actingAs($user)
        ->get('/settings/storage-accounts');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/storage-accounts')
            ->has('storageAccounts', 0)
        );
});

it('lists storage accounts via api', function () {
    $user = createDriveTestUser();

    StorageAccount::factory()->create([
        'user_id' => $user->id,
        'provider' => 'google_drive',
        'provider_account_email' => 'api@gmail.com',
    ]);

    // Create inactive account that shouldn't show
    StorageAccount::factory()->inactive()->create([
        'user_id' => $user->id,
        'provider' => 'google_drive',
        'provider_account_email' => 'inactive@gmail.com',
    ]);

    $response = $this->actingAs($user)
        ->getJson('/api/storage-accounts');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.provider_account_email', 'api@gmail.com');
});

it('requires authentication for storage accounts', function () {
    $this->get('/settings/storage-accounts')
        ->assertRedirect('/login');

    $this->get('/settings/storage-accounts/google-drive/connect')
        ->assertRedirect('/login');
});
