<?php

namespace App\Http\Controllers\Api;

use App\Ai\Agents\CrmAssistant;
use App\Http\Controllers\Controller;
use App\Http\Requests\AiChatMessageRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AiChatController extends Controller
{
    /**
     * Send a message to the AI assistant and stream the response.
     */
    public function message(AiChatMessageRequest $request): mixed
    {
        $user = $request->user();
        $message = $request->validated('message');
        $conversationId = $request->validated('conversation_id');

        $agent = CrmAssistant::make(user: $user);

        if ($conversationId) {
            $agent->continue($conversationId, as: $user);
        } else {
            $agent->forUser($user);
        }

        return $agent->stream($message)->usingVercelDataProtocol();
    }

    /**
     * List conversations for the authenticated user.
     */
    public function conversations(Request $request): JsonResponse
    {
        $conversations = DB::table('agent_conversations')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get()
            ->map(fn ($conv) => [
                'id' => $conv->id,
                'title' => $conv->title,
                'updated_at' => $conv->updated_at,
            ]);

        return response()->json(['conversations' => $conversations]);
    }

    /**
     * Get a single conversation with its messages.
     */
    public function conversation(Request $request, string $id): JsonResponse
    {
        $conversation = DB::table('agent_conversations')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $conversation) {
            abort(404, 'Conversation not found.');
        }

        $messages = DB::table('agent_conversation_messages')
            ->where('conversation_id', $id)
            ->orderBy('created_at')
            ->get()
            ->map(fn ($msg) => [
                'id' => $msg->id,
                'role' => $msg->role,
                'content' => $msg->content,
                'created_at' => $msg->created_at,
            ]);

        return response()->json([
            'conversation' => [
                'id' => $conversation->id,
                'title' => $conversation->title,
                'updated_at' => $conversation->updated_at,
            ],
            'messages' => $messages,
        ]);
    }

    /**
     * Get role-based prompt suggestions (no AI call).
     */
    public function suggestions(Request $request): JsonResponse
    {
        $user = $request->user();

        $common = [
            'How many leads do I have this month?',
            'What are my overdue tasks?',
            'Show my performance metrics',
        ];

        $roleSpecific = match (true) {
            $user->hasAnyRole(['super-admin', 'admin']) => [
                'Show team performance overview',
                'What is our overall conversion rate?',
                'Show the lead funnel for the last 30 days',
            ],
            $user->hasAnyRole(['manager', 'team-lead']) => [
                'Show team performance for today',
                'Who are the top performers this week?',
                'What is our conversion funnel looking like?',
            ],
            $user->hasAnyRole(['support-agent', 'senior-support-agent']) => [
                'Show my lead stats by status',
                'What calls did I make today?',
                'Which leads need follow-up?',
            ],
            $user->hasAnyRole(['sales-rep', 'senior-sales-rep']) => [
                'Show my pipeline status',
                'What are my hot leads?',
                'How many leads did I convert this month?',
            ],
            default => [],
        };

        return response()->json([
            'suggestions' => array_merge($common, $roleSpecific),
        ]);
    }
}
