<?php

use App\Models\Country;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class)->beforeEach(function () {
    $this->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class);

    // Create role for API access
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
});

it('can list all countries', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    Country::factory()->count(3)->create();

    $response = $this->actingAs($user)->getJson('/api/countries');

    $response->assertSuccessful();
    $response->assertJsonCount(3, 'countries');
    $response->assertJsonStructure([
        'countries' => [
            '*' => [
                'id',
                'name',
                'code',
                'iso2',
                'phone_code',
                'currency',
                'currency_symbol',
                'is_active',
                'provinces_count',
                'created_at',
                'updated_at',
            ],
        ],
    ]);
});

it('can create a country', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    $response = $this->actingAs($user)->postJson('/api/countries', [
        'name' => 'Test Country',
        'code' => 'TST',
        'iso2' => 'TC',
        'phone_code' => '+999',
        'currency' => 'TST',
        'currency_symbol' => 'T$',
        'is_active' => true,
    ]);

    $response->assertCreated();
    $response->assertJsonFragment(['name' => 'Test Country']);

    expect(Country::count())->toBe(1);
    expect(Country::first()->name)->toBe('Test Country');
});

it('validates required fields when creating a country', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    $response = $this->actingAs($user)->postJson('/api/countries', []);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['name', 'code', 'iso2']);
});

it('validates unique fields when creating a country', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    Country::factory()->create([
        'name' => 'Existing Country',
        'code' => 'EXC',
        'iso2' => 'EC',
    ]);

    $response = $this->actingAs($user)->postJson('/api/countries', [
        'name' => 'Existing Country',
        'code' => 'EXC',
        'iso2' => 'EC',
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['name', 'code', 'iso2']);
});

it('can show a single country', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create(['name' => 'Test Country']);

    $response = $this->actingAs($user)->getJson("/api/countries/{$country->id}");

    $response->assertSuccessful();
    $response->assertJsonFragment(['name' => 'Test Country']);
});

it('can update a country', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create(['name' => 'Original Name']);

    $response = $this->actingAs($user)->putJson("/api/countries/{$country->id}", [
        'name' => 'Updated Name',
        'code' => $country->code,
        'iso2' => $country->iso2,
        'is_active' => false,
    ]);

    $response->assertSuccessful();

    $country->refresh();
    expect($country->name)->toBe('Updated Name');
    expect($country->is_active)->toBeFalse();
});

it('can delete a country without provinces', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->create();

    $response = $this->actingAs($user)->deleteJson("/api/countries/{$country->id}");

    $response->assertSuccessful();
    expect(Country::count())->toBe(0);
});

it('cannot delete a country with provinces', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');
    $country = Country::factory()->hasProvinces(2)->create();

    $response = $this->actingAs($user)->deleteJson("/api/countries/{$country->id}");

    $response->assertStatus(422);
    expect(Country::count())->toBe(1);
});
