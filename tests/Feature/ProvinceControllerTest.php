<?php

use App\Models\Country;
use App\Models\Province;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class)->beforeEach(function () {
    $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class);

    // Create role for API access
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
});

it('can list all provinces', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();
    Province::factory()->count(3)->for($country)->create();

    $response = $this->actingAs($user)->getJson('/api/provinces');

    $response->assertSuccessful();
    $response->assertJsonCount(3, 'provinces');
    $response->assertJsonStructure([
        'provinces' => [
            '*' => [
                'id',
                'country_id',
                'country',
                'name',
                'code',
                'is_active',
                'cities_count',
                'created_at',
                'updated_at',
            ],
        ],
    ]);
});

it('can filter provinces by country', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country1 = Country::factory()->create();
    $country2 = Country::factory()->create();

    Province::factory()->count(2)->for($country1)->create();
    Province::factory()->count(3)->for($country2)->create();

    $response = $this->actingAs($user)->getJson("/api/provinces?country_id={$country1->id}");

    $response->assertSuccessful();
    $response->assertJsonCount(2, 'provinces');
});

it('can create a province', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/provinces', [
        'country_id' => $country->id,
        'name' => 'Test Province',
        'code' => 'TP',
        'is_active' => true,
    ]);

    $response->assertCreated();
    $response->assertJsonFragment(['name' => 'Test Province']);

    expect(Province::count())->toBe(1);
    expect(Province::first()->name)->toBe('Test Province');
});

it('validates required fields when creating a province', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    $response = $this->actingAs($user)->postJson('/api/provinces', []);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['country_id', 'name', 'code']);
});

it('validates country exists when creating a province', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    $response = $this->actingAs($user)->postJson('/api/provinces', [
        'country_id' => 99999,
        'name' => 'Test Province',
        'code' => 'TP',
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['country_id']);
});

it('can show a single province', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();
    $province = Province::factory()->for($country)->create(['name' => 'Test Province']);

    $response = $this->actingAs($user)->getJson("/api/provinces/{$province->id}");

    $response->assertSuccessful();
    $response->assertJsonFragment(['name' => 'Test Province']);
});

it('can update a province', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();
    $province = Province::factory()->for($country)->create(['name' => 'Original Name']);

    $response = $this->actingAs($user)->putJson("/api/provinces/{$province->id}", [
        'country_id' => $country->id,
        'name' => 'Updated Name',
        'code' => $province->code,
        'is_active' => false,
    ]);

    $response->assertSuccessful();

    $province->refresh();
    expect($province->name)->toBe('Updated Name');
    expect($province->is_active)->toBeFalse();
});

it('can delete a province without cities', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();
    $province = Province::factory()->for($country)->create();

    $response = $this->actingAs($user)->deleteJson("/api/provinces/{$province->id}");

    $response->assertSuccessful();
    expect(Province::count())->toBe(0);
});

it('cannot delete a province with cities', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();
    $province = Province::factory()->for($country)->hasCities(2)->create();

    $response = $this->actingAs($user)->deleteJson("/api/provinces/{$province->id}");

    $response->assertStatus(422);
    expect(Province::count())->toBe(1);
});
