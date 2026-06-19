<?php

use App\Http\Middleware\EnsureUserHasTeam;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleCalendarIntegrationErrors;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // Exclude Asterisk webhook endpoints from CSRF verification
        $middleware->preventRequestForgery(except: [
            'asterisk/*',
            'facebook/webhook',
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            EnsureUserHasTeam::class,
        ]);

        $middleware->alias([
            'calendar.errors' => HandleCalendarIntegrationErrors::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'team' => EnsureUserHasTeam::class,
        ]);
    })
    ->withSchedule(function ($schedule) {
        // Check for task reminders every 15 minutes
        $schedule->command('tasks:check-reminders')
            ->everyFifteenMinutes()
            ->withoutOverlapping()
            ->runInBackground();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->renderable(function (UnauthorizedException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'You do not have permission to access this resource.'], 403);
            }

            $user = $request->user();
            $redirectTo = $user?->can('view dashboard') ? 'dashboard' : 'home';

            return redirect()->route($redirectTo)
                ->with('error', 'You do not have permission to access that page.');
        });
    })->create();
