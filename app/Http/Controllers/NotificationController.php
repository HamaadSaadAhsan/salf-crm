<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /**
     * Display the notifications page.
     */
    public function page(Request $request): Response
    {
        $user = $request->user();
        $filter = $request->query('filter', 'all');
        $perPage = 20;
        $isSuperAdmin = $user->hasRole('super-admin');

        $query = $this->getNotificationsQuery($user, $isSuperAdmin);

        if ($filter === 'unread') {
            $query->whereNull('read_at');
        } elseif ($filter === 'read') {
            $query->whereNotNull('read_at');
        }

        $notifications = $query->latest()->paginate($perPage);

        return Inertia::render('notifications/index', [
            'notifications' => $notifications->through(fn ($notification) => $this->formatNotification($notification, $isSuperAdmin)),
            'unread_count' => $this->getUnreadCount($user, $isSuperAdmin),
            'total_count' => $this->getTotalCount($user, $isSuperAdmin),
            'filter' => $filter,
            'is_super_admin' => $isSuperAdmin,
        ]);
    }

    /**
     * Get all notifications for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $filter = $request->query('filter', 'all');
        $perPage = $request->query('per_page', 20);
        $isSuperAdmin = $user->hasRole('super-admin');

        $query = $this->getNotificationsQuery($user, $isSuperAdmin);

        if ($filter === 'unread') {
            $query->whereNull('read_at');
        } elseif ($filter === 'read') {
            $query->whereNotNull('read_at');
        }

        $notifications = $query->latest()->paginate($perPage);

        return response()->json([
            'notifications' => $notifications->through(fn ($notification) => $this->formatNotification($notification, $isSuperAdmin)),
            'unread_count' => $this->getUnreadCount($user, $isSuperAdmin),
            'total_count' => $this->getTotalCount($user, $isSuperAdmin),
            'is_super_admin' => $isSuperAdmin,
        ]);
    }

    /**
     * Get unread notifications count.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super-admin');

        return response()->json([
            'count' => $this->getUnreadCount($user, $isSuperAdmin),
        ]);
    }

    /**
     * Mark a notification as read.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super-admin');

        $notification = $this->findNotification($user, $id, $isSuperAdmin);

        if (! $notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }

        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read',
            'notification' => $this->formatNotification($notification->fresh(), $isSuperAdmin),
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super-admin');

        if ($isSuperAdmin) {
            // Mark all notifications from all users as read
            DatabaseNotification::query()
                ->where('notifiable_type', User::class)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        } else {
            $user->unreadNotifications->markAsRead();
        }

        return response()->json([
            'message' => 'All notifications marked as read',
            'unread_count' => 0,
        ]);
    }

    /**
     * Delete a notification.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super-admin');

        $notification = $this->findNotification($user, $id, $isSuperAdmin);

        if (! $notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }

        $notification->delete();

        return response()->json([
            'message' => 'Notification deleted',
        ]);
    }

    /**
     * Get the notifications query based on user role.
     */
    private function getNotificationsQuery(User $user, bool $isSuperAdmin): Builder
    {
        if ($isSuperAdmin) {
            // Super admin sees all user notifications
            return DatabaseNotification::query()
                ->where('notifiable_type', User::class);
        }

        // Regular users see only their own notifications
        return $user->notifications()->getQuery();
    }

    /**
     * Find a notification by ID based on user role.
     */
    private function findNotification(User $user, string $id, bool $isSuperAdmin): ?DatabaseNotification
    {
        if ($isSuperAdmin) {
            return DatabaseNotification::query()
                ->where('notifiable_type', User::class)
                ->where('id', $id)
                ->first();
        }

        return $user->notifications()->where('id', $id)->first();
    }

    /**
     * Get unread count based on user role.
     */
    private function getUnreadCount(User $user, bool $isSuperAdmin): int
    {
        if ($isSuperAdmin) {
            return DatabaseNotification::query()
                ->where('notifiable_type', User::class)
                ->whereNull('read_at')
                ->count();
        }

        return $user->unreadNotifications()->count();
    }

    /**
     * Get total count based on user role.
     */
    private function getTotalCount(User $user, bool $isSuperAdmin): int
    {
        if ($isSuperAdmin) {
            return DatabaseNotification::query()
                ->where('notifiable_type', User::class)
                ->count();
        }

        return $user->notifications()->count();
    }

    /**
     * Format a notification for the frontend.
     */
    private function formatNotification(DatabaseNotification $notification, bool $includeMeta = false): array
    {
        $data = $notification->data;
        $description = $data['message'] ?? $data['description'] ?? '';

        $formatted = [
            'id' => $notification->id,
            'type' => $data['type'] ?? $this->extractNotificationType($notification->type),
            'title' => $data['title'] ?? 'Notification',
            'description' => $this->stripPhoneNumbers($description),
            'timestamp' => $notification->created_at->diffForHumans(),
            'created_at' => $notification->created_at->toISOString(),
            'read' => $notification->read_at !== null,
            'read_at' => $notification->read_at?->toISOString(),
            'data' => $data,
            'action_url' => $data['action_url'] ?? null,
        ];

        // Include notifiable user info for super admin view
        if ($includeMeta && $notification->notifiable_type === User::class) {
            $notifiable = User::find($notification->notifiable_id);
            if ($notifiable) {
                $formatted['user'] = [
                    'id' => $notifiable->id,
                    'name' => $notifiable->name,
                    'email' => $notifiable->email,
                ];
            }
        }

        return $formatted;
    }

    /**
     * Extract notification type from class name.
     */
    private function extractNotificationType(string $className): string
    {
        $parts = explode('\\', $className);
        $className = end($parts);

        // Map class names to notification types
        $typeMap = [
            'FacebookIntegrationAlert' => 'facebook',
            'LeadAssignedNotification' => 'lead_assigned',
            'LeadActivityNotification' => 'lead_activity',
            'TaskDueNotification' => 'task',
            'TaskOverdueNotification' => 'task_overdue',
            'SystemNotification' => 'system',
        ];

        return $typeMap[$className] ?? 'system';
    }

    /**
     * Strip phone numbers from a string.
     */
    private function stripPhoneNumbers(string $text): string
    {
        // Remove phone numbers in various formats:
        // - +1-234-567-8901, +1 234 567 8901, +12345678901
        // - (123) 456-7890, 123-456-7890, 123.456.7890
        // - +208-305324153 (example from data)
        $patterns = [
            '/\+\d{1,3}[\s\-\.]?\d{2,4}[\s\-\.]?\d{2,4}[\s\-\.]?\d{2,4}/', // International +1-234-567-8901 (must be first!)
            '/\s*-\s*\+?\d[\d\s\-\.]{7,}\d/',         // " - +208-305324153" pattern
            '/\s*-\s*\(\d{3}\)\s*\d{3}[\-\.\s]\d{4}/', // " - (123) 456-7890" pattern
            '/\d[\d\s\-\.]{8,}\d/',                    // General phone pattern (10+ digits with separators)
        ];

        foreach ($patterns as $pattern) {
            $text = preg_replace($pattern, '', $text);
        }

        // Clean up any leftover artifacts like "- (" or trailing separators
        $text = preg_replace('/\s+-\s*\(\s*$/', '', $text);
        $text = preg_replace('/\s+-\s*$/', '', $text);
        $text = preg_replace('/\s{2,}/', ' ', $text);

        return trim($text);
    }
}
