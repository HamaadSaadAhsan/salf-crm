<?php

use App\Ai\Agents\CrmAssistant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'support-agent', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'sales-rep', 'guard_name' => 'web']);
});

test('unauthenticated users cannot access ai chat endpoints', function () {
    $this->postJson('/api/ai-chat/message', ['message' => 'hello'])
        ->assertUnauthorized();

    $this->getJson('/api/ai-chat/conversations')
        ->assertUnauthorized();

    $this->getJson('/api/ai-chat/suggestions')
        ->assertUnauthorized();
});

test('authenticated user can reach message endpoint with valid payload', function () {
    CrmAssistant::fake(['Hello! How can I help you today?']);

    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    $response = $this->actingAs($user)
        ->postJson('/api/ai-chat/message', ['message' => 'How many leads do I have?']);

    // The endpoint should not return 401, 403, or 422
    // StreamedResponse uses getStatusCode() instead of status()
    expect($response->getStatusCode())->not->toBeIn([401, 403, 422]);
});

test('empty message is rejected with validation error', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $this->actingAs($user)
        ->postJson('/api/ai-chat/message', ['message' => ''])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['message']);
});

test('message exceeding max length is rejected', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $this->actingAs($user)
        ->postJson('/api/ai-chat/message', ['message' => str_repeat('a', 2001)])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['message']);
});

test('suggestions endpoint returns role-based suggestions for admin', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    $this->actingAs($user)
        ->getJson('/api/ai-chat/suggestions')
        ->assertSuccessful()
        ->assertJsonStructure(['suggestions'])
        ->assertJsonFragment(['Show team performance overview']);
});

test('suggestions endpoint returns role-based suggestions for CRO', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('support-agent');

    $this->actingAs($user)
        ->getJson('/api/ai-chat/suggestions')
        ->assertSuccessful()
        ->assertJsonFragment(['Show my lead stats by status']);
});

test('suggestions endpoint returns role-based suggestions for advisor', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('sales-rep');

    $this->actingAs($user)
        ->getJson('/api/ai-chat/suggestions')
        ->assertSuccessful()
        ->assertJsonFragment(['What are my hot leads?']);
});

test('conversations list returns only the authenticated user conversations', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $otherUser = User::factory()->create(['email_verified_at' => now()]);

    // Insert conversations directly
    DB::table('agent_conversations')->insert([
        ['id' => 'conv-1', 'user_id' => $user->id, 'title' => 'My conversation', 'created_at' => now(), 'updated_at' => now()],
        ['id' => 'conv-2', 'user_id' => $otherUser->id, 'title' => 'Other conversation', 'created_at' => now(), 'updated_at' => now()],
    ]);

    $response = $this->actingAs($user)
        ->getJson('/api/ai-chat/conversations')
        ->assertSuccessful()
        ->assertJsonCount(1, 'conversations');

    expect($response->json('conversations.0.title'))->toBe('My conversation');
});

test('conversation detail returns 404 for other user conversation', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $otherUser = User::factory()->create(['email_verified_at' => now()]);

    DB::table('agent_conversations')->insert([
        'id' => 'conv-other', 'user_id' => $otherUser->id, 'title' => 'Secret', 'created_at' => now(), 'updated_at' => now(),
    ]);

    $this->actingAs($user)
        ->getJson('/api/ai-chat/conversations/conv-other')
        ->assertNotFound();
});

test('conversation detail returns messages for own conversation', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    DB::table('agent_conversations')->insert([
        'id' => 'conv-mine', 'user_id' => $user->id, 'title' => 'My Chat', 'created_at' => now(), 'updated_at' => now(),
    ]);

    DB::table('agent_conversation_messages')->insert([
        'id' => 'msg-1', 'conversation_id' => 'conv-mine', 'user_id' => $user->id,
        'agent' => CrmAssistant::class, 'role' => 'user', 'content' => 'Hello',
        'attachments' => '', 'tool_calls' => '', 'tool_results' => '',
        'usage' => '', 'meta' => '',
        'created_at' => now(), 'updated_at' => now(),
    ]);

    $this->actingAs($user)
        ->getJson('/api/ai-chat/conversations/conv-mine')
        ->assertSuccessful()
        ->assertJsonCount(1, 'messages')
        ->assertJsonPath('conversation.title', 'My Chat');
});
