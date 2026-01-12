<?php

use App\Models\User;
use App\Notifications\SystemNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

test('user can get their notifications', function () {
    $this->actingAs($this->user);

    // Create some notifications
    $this->user->notify(new SystemNotification(
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'system'
    ));

    $response = $this->getJson('/api/notifications');

    $response->assertOk()
        ->assertJsonStructure([
            'notifications' => [
                'data' => [
                    '*' => [
                        'id',
                        'type',
                        'title',
                        'description',
                        'timestamp',
                        'created_at',
                        'read',
                        'data',
                    ],
                ],
            ],
            'unread_count',
            'total_count',
        ]);
});

test('user can get unread notification count', function () {
    $this->actingAs($this->user);

    // Create two notifications
    $this->user->notify(new SystemNotification(
        title: 'Test 1',
        message: 'Message 1',
        type: 'system'
    ));
    $this->user->notify(new SystemNotification(
        title: 'Test 2',
        message: 'Message 2',
        type: 'system'
    ));

    $response = $this->getJson('/api/notifications/unread-count');

    $response->assertOk()
        ->assertJson(['count' => 2]);
});

test('user can mark a notification as read', function () {
    $this->actingAs($this->user);

    $this->user->notify(new SystemNotification(
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'system'
    ));

    $notification = $this->user->notifications()->first();

    $response = $this->postJson("/api/notifications/{$notification->id}/mark-read");

    $response->assertOk()
        ->assertJsonPath('notification.read', true);

    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('user can mark all notifications as read', function () {
    $this->actingAs($this->user);

    // Create multiple notifications
    $this->user->notify(new SystemNotification(
        title: 'Test 1',
        message: 'Message 1',
        type: 'system'
    ));
    $this->user->notify(new SystemNotification(
        title: 'Test 2',
        message: 'Message 2',
        type: 'system'
    ));

    $response = $this->postJson('/api/notifications/mark-all-read');

    $response->assertOk()
        ->assertJson(['unread_count' => 0]);

    expect($this->user->unreadNotifications()->count())->toBe(0);
});

test('user can filter notifications by read status', function () {
    $this->actingAs($this->user);

    // Create and mark one as read
    $this->user->notify(new SystemNotification(
        title: 'Test 1',
        message: 'Message 1',
        type: 'system'
    ));
    $this->user->notify(new SystemNotification(
        title: 'Test 2',
        message: 'Message 2',
        type: 'system'
    ));

    $this->user->notifications()->first()->markAsRead();

    // Test unread filter
    $response = $this->getJson('/api/notifications?filter=unread');
    $response->assertOk();
    expect($response->json('notifications.data'))->toHaveCount(1);

    // Test read filter
    $response = $this->getJson('/api/notifications?filter=read');
    $response->assertOk();
    expect($response->json('notifications.data'))->toHaveCount(1);
});

test('user can delete a notification', function () {
    $this->actingAs($this->user);

    $this->user->notify(new SystemNotification(
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'system'
    ));

    $notification = $this->user->notifications()->first();

    $response = $this->deleteJson("/api/notifications/{$notification->id}");

    $response->assertOk();
    expect($this->user->notifications()->count())->toBe(0);
});

test('user cannot access other users notifications', function () {
    $this->actingAs($this->user);

    $otherUser = User::factory()->create();
    $otherUser->notify(new SystemNotification(
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'system'
    ));

    $notification = $otherUser->notifications()->first();

    $response = $this->postJson("/api/notifications/{$notification->id}/mark-read");

    $response->assertNotFound();
});

test('unauthenticated user cannot access notifications', function () {
    $response = $this->getJson('/api/notifications');

    $response->assertUnauthorized();
});
