<?php

use App\Models\Label;
use App\Models\Message;
use App\Models\MessageLabel;
use App\Models\MessageRecipient;
use App\Models\User;
use Spatie\Permission\Models\Role;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function createMailUser(): User
{
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    return $user;
}

function sendMessage(User $sender, User $recipient, array $overrides = []): Message
{
    $message = Message::factory()->create(array_merge([
        'sender_id' => $sender->id,
    ], $overrides));

    MessageRecipient::create([
        'message_id' => $message->id,
        'user_id' => $recipient->id,
        'type' => 'to',
    ]);

    return $message;
}

// ── Page Rendering ──

it('renders the mail page', function () {
    $user = createMailUser();

    $this->actingAs($user)
        ->get(route('mail'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('mail/index'));
});

// ── Messages List ──

it('lists inbox messages for authenticated user', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    sendMessage($sender, $user);

    $this->actingAs($user)
        ->getJson(route('mail.messages', ['folder' => 'inbox']))
        ->assertOk()
        ->assertJsonCount(1, 'messages');
});

it('does not show messages in inbox that were trashed', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    $message = sendMessage($sender, $user);

    MessageRecipient::where('message_id', $message->id)
        ->where('user_id', $user->id)
        ->update(['trashed_at' => now()]);

    $this->actingAs($user)
        ->getJson(route('mail.messages', ['folder' => 'inbox']))
        ->assertOk()
        ->assertJsonCount(0, 'messages');
});

it('lists sent messages', function () {
    $user = createMailUser();
    $recipient = User::factory()->create();

    sendMessage($user, $recipient);

    $this->actingAs($user)
        ->getJson(route('mail.messages', ['folder' => 'sent']))
        ->assertOk()
        ->assertJsonCount(1, 'messages');
});

it('lists draft messages', function () {
    $user = createMailUser();
    $recipient = User::factory()->create();

    sendMessage($user, $recipient, ['is_draft' => true, 'sent_at' => null]);

    $this->actingAs($user)
        ->getJson(route('mail.messages', ['folder' => 'drafts']))
        ->assertOk()
        ->assertJsonCount(1, 'messages');
});

it('lists starred messages', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    $message = sendMessage($sender, $user);

    MessageRecipient::where('message_id', $message->id)
        ->where('user_id', $user->id)
        ->update(['is_starred' => true]);

    $this->actingAs($user)
        ->getJson(route('mail.messages', ['folder' => 'starred']))
        ->assertOk()
        ->assertJsonCount(1, 'messages');
});

it('lists trashed messages', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    $message = sendMessage($sender, $user);

    MessageRecipient::where('message_id', $message->id)
        ->where('user_id', $user->id)
        ->update(['trashed_at' => now()]);

    $this->actingAs($user)
        ->getJson(route('mail.messages', ['folder' => 'trash']))
        ->assertOk()
        ->assertJsonCount(1, 'messages');
});

it('searches messages by subject', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    sendMessage($sender, $user, ['subject' => 'Quarterly Report']);
    sendMessage($sender, $user, ['subject' => 'Lunch Plans']);

    $this->actingAs($user)
        ->getJson(route('mail.messages', ['folder' => 'inbox', 'search' => 'Quarterly']))
        ->assertOk()
        ->assertJsonCount(1, 'messages');
});

it('filters messages by label', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    $message1 = sendMessage($sender, $user);
    $message2 = sendMessage($sender, $user);

    $label = Label::factory()->create(['user_id' => $user->id]);
    MessageLabel::create(['message_id' => $message1->id, 'label_id' => $label->id, 'user_id' => $user->id]);

    $this->actingAs($user)
        ->getJson(route('mail.messages', ['folder' => 'inbox', 'label' => $label->id]))
        ->assertOk()
        ->assertJsonCount(1, 'messages');
});

// ── Show Message ──

it('shows a single message and marks it as read', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    $message = sendMessage($sender, $user);

    $this->actingAs($user)
        ->getJson(route('mail.show', $message))
        ->assertOk()
        ->assertJsonPath('message.id', $message->id);

    $recipient = MessageRecipient::where('message_id', $message->id)
        ->where('user_id', $user->id)
        ->first();

    expect($recipient->is_read)->toBeTrue();
    expect($recipient->read_at)->not->toBeNull();
});

// ── Send Message ──

it('sends a new message', function () {
    $user = createMailUser();
    $recipient = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('mail.send'), [
            'to' => [$recipient->id],
            'cc' => [],
            'bcc' => [],
            'subject' => 'Test Subject',
            'body' => 'Test body content.',
            'type' => 'new',
            'is_draft' => false,
        ])
        ->assertCreated()
        ->assertJsonPath('success', true);

    $this->assertDatabaseHas('messages', [
        'sender_id' => $user->id,
        'subject' => 'Test Subject',
        'is_draft' => false,
    ]);

    $this->assertDatabaseHas('message_recipients', [
        'user_id' => $recipient->id,
        'type' => 'to',
    ]);
});

it('saves a draft message', function () {
    $user = createMailUser();
    $recipient = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('mail.send'), [
            'to' => [$recipient->id],
            'subject' => 'Draft Subject',
            'body' => 'Draft content.',
            'is_draft' => true,
        ])
        ->assertCreated();

    $this->assertDatabaseHas('messages', [
        'sender_id' => $user->id,
        'subject' => 'Draft Subject',
        'is_draft' => true,
        'sent_at' => null,
    ]);
});

it('validates required fields when sending', function () {
    $user = createMailUser();

    $this->actingAs($user)
        ->postJson(route('mail.send'), [
            'to' => [],
            'subject' => '',
            'body' => '',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['to', 'subject', 'body']);
});

it('creates a reply message in the same thread', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    $original = sendMessage($sender, $user);

    $this->actingAs($user)
        ->postJson(route('mail.send'), [
            'to' => [$sender->id],
            'subject' => 'Re: '.$original->subject,
            'body' => 'Reply content.',
            'parent_id' => $original->id,
            'type' => 'reply',
            'is_draft' => false,
        ])
        ->assertCreated();

    $reply = Message::where('parent_id', $original->id)->first();
    expect($reply->thread_id)->toBe($original->thread_id);
});

// ── Toggle Star ──

it('toggles star on a message', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    $message = sendMessage($sender, $user);

    $this->actingAs($user)
        ->postJson(route('mail.star', $message))
        ->assertOk()
        ->assertJsonPath('is_starred', true);

    $this->actingAs($user)
        ->postJson(route('mail.star', $message))
        ->assertOk()
        ->assertJsonPath('is_starred', false);
});

// ── Toggle Read ──

it('toggles read status on a message', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    $message = sendMessage($sender, $user);

    $this->actingAs($user)
        ->postJson(route('mail.read', $message))
        ->assertOk()
        ->assertJsonPath('is_read', true);

    $this->actingAs($user)
        ->postJson(route('mail.read', $message))
        ->assertOk()
        ->assertJsonPath('is_read', false);
});

// ── Trash / Restore ──

it('trashes a message', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    $message = sendMessage($sender, $user);

    $this->actingAs($user)
        ->postJson(route('mail.trash', $message))
        ->assertOk()
        ->assertJsonPath('success', true);

    $recipient = MessageRecipient::where('message_id', $message->id)
        ->where('user_id', $user->id)
        ->first();

    expect($recipient->trashed_at)->not->toBeNull();
});

it('restores a trashed message', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    $message = sendMessage($sender, $user);

    MessageRecipient::where('message_id', $message->id)
        ->where('user_id', $user->id)
        ->update(['trashed_at' => now()]);

    $this->actingAs($user)
        ->postJson(route('mail.restore', $message))
        ->assertOk();

    $recipient = MessageRecipient::where('message_id', $message->id)
        ->where('user_id', $user->id)
        ->first();

    expect($recipient->trashed_at)->toBeNull();
});

// ── Delete ──

it('permanently deletes a message by the sender', function () {
    $user = createMailUser();
    $recipient = User::factory()->create();

    $message = sendMessage($user, $recipient);

    $this->actingAs($user)
        ->deleteJson(route('mail.destroy', $message))
        ->assertOk();

    $this->assertDatabaseMissing('messages', ['id' => $message->id]);
});

it('prevents non-sender from permanently deleting a message', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    $message = sendMessage($sender, $user);

    $this->actingAs($user)
        ->deleteJson(route('mail.destroy', $message))
        ->assertForbidden();
});

// ── Labels ──

it('lists labels for the user', function () {
    $user = createMailUser();

    Label::factory()->count(3)->create(['user_id' => $user->id]);
    Label::factory()->create(); // another user's label

    $this->actingAs($user)
        ->getJson(route('mail.labels'))
        ->assertOk()
        ->assertJsonCount(3, 'labels');
});

it('creates a label', function () {
    $user = createMailUser();

    $this->actingAs($user)
        ->postJson(route('mail.labels.store'), [
            'name' => 'Important',
            'color' => 'red',
        ])
        ->assertCreated()
        ->assertJsonPath('label.name', 'Important');

    $this->assertDatabaseHas('labels', [
        'user_id' => $user->id,
        'name' => 'Important',
        'color' => 'red',
    ]);
});

it('deletes own label', function () {
    $user = createMailUser();
    $label = Label::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->deleteJson(route('mail.labels.destroy', $label))
        ->assertOk();

    $this->assertDatabaseMissing('labels', ['id' => $label->id]);
});

it('prevents deleting another user label', function () {
    $user = createMailUser();
    $otherLabel = Label::factory()->create();

    $this->actingAs($user)
        ->deleteJson(route('mail.labels.destroy', $otherLabel))
        ->assertForbidden();
});

it('toggles label on a message', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    $message = sendMessage($sender, $user);
    $label = Label::factory()->create(['user_id' => $user->id]);

    // Attach
    $this->actingAs($user)
        ->postJson(route('mail.labels.toggle', [$message, $label]))
        ->assertOk()
        ->assertJsonPath('attached', true);

    $this->assertDatabaseHas('message_labels', [
        'message_id' => $message->id,
        'label_id' => $label->id,
        'user_id' => $user->id,
    ]);

    // Detach
    $this->actingAs($user)
        ->postJson(route('mail.labels.toggle', [$message, $label]))
        ->assertOk()
        ->assertJsonPath('attached', false);

    $this->assertDatabaseMissing('message_labels', [
        'message_id' => $message->id,
        'label_id' => $label->id,
    ]);
});

// ── Users Search ──

it('searches users for recipient picker', function () {
    $user = createMailUser();
    User::factory()->create(['name' => 'Alice Smith']);
    User::factory()->create(['name' => 'Bob Jones']);

    $this->actingAs($user)
        ->getJson(route('mail.users', ['search' => 'Alice']))
        ->assertOk()
        ->assertJsonCount(1, 'users')
        ->assertJsonPath('users.0.name', 'Alice Smith');
});

it('excludes current user from user search', function () {
    $user = createMailUser();

    $this->actingAs($user)
        ->getJson(route('mail.users', ['search' => $user->name]))
        ->assertOk()
        ->assertJsonCount(0, 'users');
});

// ── Counts ──

it('returns correct mail counts', function () {
    $user = createMailUser();
    $sender = User::factory()->create();

    // 2 unread inbox messages
    sendMessage($sender, $user);
    sendMessage($sender, $user);

    // 1 draft
    Message::factory()->draft()->create(['sender_id' => $user->id]);

    // 1 starred
    $starred = sendMessage($sender, $user);
    MessageRecipient::where('message_id', $starred->id)
        ->where('user_id', $user->id)
        ->update(['is_starred' => true]);

    $this->actingAs($user)
        ->getJson(route('mail.counts'))
        ->assertOk()
        ->assertJson([
            'inbox' => 3, // 2 unread + 1 starred (also unread)
            'drafts' => 1,
            'starred' => 1,
        ]);
});
