<?php

namespace App\Http\Middleware;

use Closure;
use Exception;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HandleCalendarIntegrationErrors
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            return $next($request);
        } catch (Exception $e) {
            // Log the error
            \Log::error('Calendar Integration Error: ' . $e->getMessage(), [
                'user_id' => $request->user()?->id,
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'trace' => $e->getTraceAsString()
            ]);

            // Return standardized error response
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing your calendar request',
                'error_code' => 'CALENDAR_INTEGRATION_ERROR'
            ], 500);
        }
    }
}
