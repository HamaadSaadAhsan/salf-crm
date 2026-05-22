<?php

use App\Models\City;
use App\Models\Country;
use App\Models\Province;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class)->beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    // Create role for API access
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
});

it('can list all cities', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();
    $province = Province::factory()->for($country)->create();
    City::factory()->count(3)->for($province)->create();

    $response = $this->actingAs($user)->getJson('/api/cities');

    $response->assertSuccessful();
    $response->assertJsonCount(3, 'cities');
    $response->assertJsonStructure([
        'cities' => [
            '*' => [
                'id',
                'province_id',
                'province',
                'name',
                'code',
                'latitude',
                'longitude',
                'is_active',
                'zones_count',
                'created_at',
                'updated_at',
            ],
        ],
    ]);
});

it('can filter cities by province', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();
    $province1 = Province::factory()->for($country)->create();
    $province2 = Province::factory()->for($country)->create();

    City::factory()->count(2)->for($province1)->create();
    City::factory()->count(3)->for($province2)->create();

    $response = $this->actingAs($user)->getJson("/api/cities?province_id={$province1->id}");

    $response->assertSuccessful();
    $response->assertJsonCount(2, 'cities');
});

it('can create a city', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();
    $province = Province::factory()->for($country)->create();

    $response = $this->actingAs($user)->postJson('/api/cities', [
        'province_id' => $province->id,
        'name' => 'Test City',
        'code' => 'TSC',
        'latitude' => 45.5017,
        'longitude' => -73.5673,
        'is_active' => true,
    ]);

    $response->assertCreated();
    $response->assertJsonFragment(['name' => 'Test City']);

    expect(City::count())->toBe(1);
    expect(City::first()->name)->toBe('Test City');
});

it('validates required fields when creating a city', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    $response = $this->actingAs($user)->postJson('/api/cities', []);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['province_id', 'name']);
});

it('validates province exists when creating a city', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    $response = $this->actingAs($user)->postJson('/api/cities', [
        'province_id' => 99999,
        'name' => 'Test City',
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['province_id']);
});

it('validates latitude and longitude ranges', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();
    $province = Province::factory()->for($country)->create();

    $response = $this->actingAs($user)->postJson('/api/cities', [
        'province_id' => $province->id,
        'name' => 'Test City',
        'latitude' => 91,
        'longitude' => 181,
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['latitude', 'longitude']);
});

it('can show a single city', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();
    $province = Province::factory()->for($country)->create();
    $city = City::factory()->for($province)->create(['name' => 'Test City']);

    $response = $this->actingAs($user)->getJson("/api/cities/{$city->id}");

    $response->assertSuccessful();
    $response->assertJsonFragment(['name' => 'Test City']);
});

it('can update a city', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();
    $province = Province::factory()->for($country)->create();
    $city = City::factory()->for($province)->create(['name' => 'Original Name']);

    $response = $this->actingAs($user)->putJson("/api/cities/{$city->id}", [
        'province_id' => $province->id,
        'name' => 'Updated Name',
        'is_active' => false,
    ]);

    $response->assertSuccessful();

    $city->refresh();
    expect($city->name)->toBe('Updated Name');
    expect($city->is_active)->toBeFalse();
});

it('can delete a city without zones', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();
    $province = Province::factory()->for($country)->create();
    $city = City::factory()->for($province)->create();

    $response = $this->actingAs($user)->deleteJson("/api/cities/{$city->id}");

    $response->assertSuccessful();
    expect(City::count())->toBe(0);
});

it('cannot delete a city with zones', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();
    $province = Province::factory()->for($country)->create();
    $city = City::factory()->for($province)->create();
    $zone = Zone::factory()->create();

    $city->zones()->attach($zone->id);

    $response = $this->actingAs($user)->deleteJson("/api/cities/{$city->id}");

    $response->assertStatus(422);
    expect(City::count())->toBe(1);
});
