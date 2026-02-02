<?php

use App\Models\Service;
use App\Models\User;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

beforeEach(function () {
    // Create role for management access
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

    $this->user = User::factory()->create();
    $this->user->assignRole('super-admin');
    actingAs($this->user);
});

it('displays the services index page', function () {
    $response = $this->get(route('services.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page->component('services/index'));
});

it('shows services list on index page', function () {
    $service1 = Service::factory()->create(['name' => 'Test Service 1', 'status' => 'active']);
    $service2 = Service::factory()->create(['name' => 'Test Service 2', 'status' => 'active']);

    $response = $this->get(route('services.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('services/index')
        ->has('services', 2)
    );
});

it('can create a new service', function () {
    $serviceData = [
        'name' => 'New Test Service',
        'detail' => 'This is a test service',
        'country_code' => 'US',
        'country_name' => 'United States',
        'sort_order' => 1,
        'status' => 'active',
    ];

    $response = $this->post(route('services.store'), $serviceData);

    $response->assertRedirect();
    $this->assertDatabaseHas('services', [
        'name' => 'New Test Service',
        'detail' => 'This is a test service',
        'country_code' => 'US',
        'status' => 'active',
    ]);
});

it('validates required fields when creating service', function () {
    $response = $this->post(route('services.store'), [
        'detail' => 'Missing name',
    ]);

    $response->assertSessionHasErrors(['name', 'status']);
});

it('can update an existing service', function () {
    $service = Service::factory()->create([
        'name' => 'Original Name',
        'status' => 'draft',
    ]);

    $response = $this->patch(route('services.update', $service), [
        'name' => 'Updated Name',
        'detail' => 'Updated detail',
        'status' => 'active',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('services', [
        'id' => $service->id,
        'name' => 'Updated Name',
        'detail' => 'Updated detail',
        'status' => 'active',
    ]);
});

it('prevents circular parent reference when updating service', function () {
    $service = Service::factory()->create(['name' => 'Service A']);

    $response = $this->patch(route('services.update', $service), [
        'name' => 'Service A Updated',
        'parent_id' => $service->id, // Trying to set itself as parent
        'status' => 'active',
    ]);

    $response->assertSessionHasErrors(['parent_id']);
});

it('can delete a service without dependencies', function () {
    $service = Service::factory()->create(['name' => 'Service to Delete']);

    $response = $this->delete(route('services.destroy', $service));

    $response->assertRedirect();
    $this->assertDatabaseMissing('services', [
        'id' => $service->id,
    ]);
});

it('prevents deletion of service with children', function () {
    $parentService = Service::factory()->create(['name' => 'Parent Service']);
    $childService = Service::factory()->create([
        'name' => 'Child Service',
        'parent_id' => $parentService->id,
    ]);

    $response = $this->delete(route('services.destroy', $parentService));

    $response->assertSessionHasErrors(['error']);
    $this->assertDatabaseHas('services', [
        'id' => $parentService->id,
    ]);
});

it('prevents deletion of service with assigned users', function () {
    $service = Service::factory()->create(['name' => 'Service with Users']);
    $user = User::factory()->create();

    // Assign user to service
    $service->users()->attach($user->id, [
        'assigned_at' => now(),
        'status' => 'active',
    ]);

    $response = $this->delete(route('services.destroy', $service));

    $response->assertSessionHasErrors(['error']);
    $this->assertDatabaseHas('services', [
        'id' => $service->id,
    ]);
});

it('supports service hierarchy with parent and children', function () {
    $parentService = Service::factory()->create([
        'name' => 'Parent Service',
        'parent_id' => null,
        'sort_order' => 1,
    ]);

    $childService = Service::factory()->create([
        'name' => 'Child Service',
        'parent_id' => $parentService->id,
        'sort_order' => 2,
    ]);

    $response = $this->get(route('services.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->has('services', 2)
        ->where('services.0.id', $parentService->id)
        ->where('services.0.children_count', 1)
        ->where('services.1.parent_id', $parentService->id)
        ->where('services.1.parent_name', 'Parent Service')
    );
});

it('displays services with counts in index', function () {
    $service = Service::factory()->create(['name' => 'Service with Stats']);

    $response = $this->get(route('services.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->has('services', 1)
        ->where('services.0.name', 'Service with Stats')
        ->where('services.0.active_users_count', 0)
        ->where('services.0.leads_count', 0)
        ->where('services.0.children_count', 0)
    );
});

it('supports different service statuses', function () {
    $statuses = ['draft', 'active', 'inactive', 'archived'];

    foreach ($statuses as $status) {
        $service = Service::factory()->create([
            'name' => "Service {$status}",
            'status' => $status,
        ]);

        $this->assertDatabaseHas('services', [
            'id' => $service->id,
            'status' => $status,
        ]);
    }
});
