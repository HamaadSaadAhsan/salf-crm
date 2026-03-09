<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessWorkflowWebhook;
use App\Models\Workflow;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class DynamicWebhookController extends Controller
{
    /**
     * Handle GET requests - supports multiple verification strategies:
     * - Facebook hub.challenge verification
     * - Simple token-based GET verification
     */
    public function verify(Request $request, string $token): Response
    {
        $workflow = Workflow::where('webhook_token', $token)->first();

        if (! $workflow) {
            return response('Not Found', 404);
        }

        // Facebook-style hub.challenge verification
        if ($request->has('hub_challenge')) {
            $challenge = $request->get('hub_challenge');
            $verifyToken = $request->get('hub_verify_token');
            $expectedToken = $workflow->metadata['webhook_verify_token'] ?? $token;

            if ($request->get('hub_mode') === 'subscribe' && $verifyToken === $expectedToken) {
                Log::info('Webhook hub.challenge verified', ['workflow_id' => $workflow->id]);

                return response($challenge, 200, ['Content-Type' => 'text/plain']);
            }

            return response('Invalid verification token', 403);
        }

        // Generic verification - just confirm the endpoint exists
        return response('OK', 200, ['Content-Type' => 'text/plain']);
    }

    /**
     * Handle POST requests (incoming webhook data)
     */
    public function handle(Request $request, string $token): Response
    {
        $workflow = Workflow::where('webhook_token', $token)
            ->where('status', 'active')
            ->first();

        if (! $workflow) {
            Log::warning('Webhook received for unknown/inactive token', ['token' => $token]);

            return response('Not Found', 404);
        }

        $payload = $request->all();

        Log::info('Dynamic webhook received', [
            'workflow_id' => $workflow->id,
            'payload_keys' => array_keys($payload),
        ]);

        ProcessWorkflowWebhook::dispatch($workflow->id, $payload, [
            'source' => 'webhook',
            'ip' => $request->ip(),
            'headers' => $request->headers->all(),
        ]);

        return response('OK', 200);
    }
}
