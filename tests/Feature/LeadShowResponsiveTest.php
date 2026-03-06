<?php

use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Disable broadcasting to avoid Pusher/Reverb connection errors in tests
    config(['broadcasting.default' => 'null']);

    // Create admin user with view leads permission
    $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $this->user = User::factory()->create();
    $this->user->assignRole($role);
});

describe('Lead Show Page Responsive Design', function () {
    it('renders the lead show page successfully', function () {
        $lead = Lead::factory()->create();

        $response = $this->actingAs($this->user)
            ->get("/leads/{$lead->id}/overview");

        $response->assertOk();
    });

    it('includes lead data in the page props', function () {
        $lead = Lead::factory()->create([
            'name' => 'Test Lead Name',
            'email' => 'test@example.com',
        ]);

        $response = $this->actingAs($this->user)
            ->get("/leads/{$lead->id}/overview");

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('leads/show')
                ->has('lead')
                ->where('lead.name', 'Test Lead Name')
                ->where('lead.email', 'test@example.com')
            );
    });

    it('includes users data for assignment options', function () {
        $lead = Lead::factory()->create();

        $response = $this->actingAs($this->user)
            ->get("/leads/{$lead->id}/overview");

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('users')
            );
    });
});

describe('Lead Show Page Structure', function () {
    it('returns correct Inertia component', function () {
        $lead = Lead::factory()->create();

        $response = $this->actingAs($this->user)
            ->get("/leads/{$lead->id}/overview");

        $response->assertInertia(fn (Assert $page) => $page
            ->component('leads/show')
        );
    });

    it('loads lead with required relationships', function () {
        $lead = Lead::factory()->create();

        $response = $this->actingAs($this->user)
            ->get("/leads/{$lead->id}/overview");

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('lead')
            );
    });
});
