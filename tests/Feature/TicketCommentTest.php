<?php

use App\Models\Ticket;
use App\Models\TicketComment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function createCommentAdmin(): User
{
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    return $user;
}

function createCommentUser(): User
{
    return User::factory()->create(['email_verified_at' => now()]);
}

it('allows ticket owner to add a comment', function () {
    $user = createCommentUser();
    $ticket = Ticket::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->post("/support/{$ticket->id}/comments", [
        'body' => 'This is a comment on my ticket.',
    ]);

    $response->assertRedirect();
    expect(TicketComment::count())->toBe(1);

    $comment = TicketComment::first();
    expect($comment->body)->toBe('This is a comment on my ticket.');
    expect($comment->user_id)->toBe($user->id);
    expect($comment->is_admin_reply)->toBeFalse();
});

it('marks comment as admin reply when posted by super admin', function () {
    $admin = createCommentAdmin();
    $user = createCommentUser();
    $ticket = Ticket::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($admin)->post("/support/{$ticket->id}/comments", [
        'body' => 'Admin response to your ticket.',
    ]);

    $response->assertRedirect();
    $comment = TicketComment::first();
    expect($comment->is_admin_reply)->toBeTrue();
});

it('prevents non-owner non-admin from commenting', function () {
    $user = createCommentUser();
    $otherUser = createCommentUser();
    $ticket = Ticket::factory()->create(['user_id' => $otherUser->id]);

    $response = $this->actingAs($user)->post("/support/{$ticket->id}/comments", [
        'body' => 'Unauthorized comment.',
    ]);

    $response->assertForbidden();
});

it('validates comment body is required', function () {
    $user = createCommentUser();
    $ticket = Ticket::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->postJson("/support/{$ticket->id}/comments", [
        'body' => '',
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['body']);
});

it('allows comment with attachments', function () {
    Storage::fake('public');
    $user = createCommentUser();
    $ticket = Ticket::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->post("/support/{$ticket->id}/comments", [
        'body' => 'See attachment.',
        'attachments' => [
            UploadedFile::fake()->image('proof.png', 400, 300),
        ],
    ]);

    $response->assertRedirect();
    $comment = TicketComment::first();
    expect($comment->attachments)->toHaveCount(1);
    expect($comment->attachments->first()->file_name)->toBe('proof.png');
    expect($comment->attachments->first()->ticket_id)->toBe($ticket->id);
});

it('requires authentication to comment', function () {
    $ticket = Ticket::factory()->create();

    $this->post("/support/{$ticket->id}/comments", [
        'body' => 'Test',
    ])->assertRedirect('/login');
});
