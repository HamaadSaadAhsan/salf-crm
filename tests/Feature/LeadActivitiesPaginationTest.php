<?php

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;

it('can paginate comments and all activities independently', function () {
    // Create a user and lead
    $user = User::factory()->create();
    $lead = Lead::factory()->create();

    // Create several comment activities (type: note)
    $comments = LeadActivity::factory()->count(15)->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'type' => 'note',
        'description' => 'Test comment'
    ]);

    // Create several non-comment activities
    $otherActivities = LeadActivity::factory()->count(10)->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'type' => 'call',
        'description' => 'Test call activity'
    ]);

    // Test comments pagination (should only return note type)
    $commentsResponse = $this->actingAs($user)
        ->getJson("/lead-activities?lead_id={$lead->id}&type=note&per_page=5");

    $commentsResponse->assertOk();
    $commentsData = $commentsResponse->json();
    
    // Should have 5 comments on first page with pagination meta
    expect($commentsData['data'])->toHaveCount(5);
    expect($commentsData['meta']['total'])->toBe(15);
    expect($commentsData['meta']['current_page'])->toBe(1);
    expect($commentsData['meta']['last_page'])->toBe(3);
    
    // All returned activities should be type 'note'
    foreach ($commentsData['data'] as $activity) {
        expect($activity['type'])->toBe('note');
    }

    // Test all activities pagination (should return all types)
    $allActivitiesResponse = $this->actingAs($user)
        ->getJson("/lead-activities?lead_id={$lead->id}&per_page=10");

    $allActivitiesResponse->assertOk();
    $allActivitiesData = $allActivitiesResponse->json();
    
    // Should have 10 activities on first page with pagination meta
    expect($allActivitiesData['data'])->toHaveCount(10);
    expect($allActivitiesData['meta']['total'])->toBe(25); // 15 comments + 10 other activities
    expect($allActivitiesData['meta']['current_page'])->toBe(1);
    expect($allActivitiesData['meta']['last_page'])->toBe(3);
    
    // Should contain different types of activities
    $types = collect($allActivitiesData['data'])->pluck('type')->unique()->toArray();
    expect(count($types))->toBeGreaterThan(1);

    // Test second page of comments
    $commentsPage2Response = $this->actingAs($user)
        ->getJson("/lead-activities?lead_id={$lead->id}&type=note&per_page=5&page=2");

    $commentsPage2Response->assertOk();
    $commentsPage2Data = $commentsPage2Response->json();
    
    expect($commentsPage2Data['data'])->toHaveCount(5);
    expect($commentsPage2Data['meta']['current_page'])->toBe(2);
    
    // Should be different activities from first page
    $firstPageIds = collect($commentsData['data'])->pluck('id')->toArray();
    $secondPageIds = collect($commentsPage2Data['data'])->pluck('id')->toArray();
    expect(array_intersect($firstPageIds, $secondPageIds))->toBeEmpty();
});

it('maintains separate pagination state for comments and activities', function () {
    $user = User::factory()->create();
    $lead = Lead::factory()->create();

    // Create mixed activities
    LeadActivity::factory()->count(12)->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'type' => 'note',
        'description' => 'Test comment'
    ]);

    LeadActivity::factory()->count(8)->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'type' => 'email',
        'description' => 'Test email activity'
    ]);

    // Request page 2 of comments
    $commentsPage2 = $this->actingAs($user)
        ->getJson("/lead-activities?lead_id={$lead->id}&type=note&per_page=5&page=2");

    // Request page 1 of all activities  
    $allActivitiesPage1 = $this->actingAs($user)
        ->getJson("/lead-activities?lead_id={$lead->id}&per_page=10&page=1");

    // Both requests should succeed and have correct pagination
    $commentsPage2->assertOk();
    $allActivitiesPage1->assertOk();

    $commentsData = $commentsPage2->json();
    $allActivitiesData = $allActivitiesPage1->json();

    // Comments page 2 should have correct pagination
    expect($commentsData['meta']['current_page'])->toBe(2);
    expect($commentsData['meta']['total'])->toBe(12);
    
    // All activities page 1 should have correct pagination
    expect($allActivitiesData['meta']['current_page'])->toBe(1);
    expect($allActivitiesData['meta']['total'])->toBe(20); // 12 + 8

    // They should have different data sets
    $commentsIds = collect($commentsData['data'])->pluck('id')->toArray();
    $allActivitiesIds = collect($allActivitiesData['data'])->pluck('id')->toArray();
    
    // The sets should not be identical (though some may overlap)
    expect($commentsIds)->not->toBe($allActivitiesIds);
});