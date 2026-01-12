/**
 * Notification types for the CRM application
 */

export type NotificationType =
    | 'lead_activity'
    | 'lead_assigned'
    | 'facebook'
    | 'facebook_lead'
    | 'task'
    | 'task_overdue'
    | 'call'
    | 'system';

export interface NotificationUser {
    id: number;
    name: string;
    email: string;
}

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    description: string;
    timestamp: string;
    created_at: string;
    read: boolean;
    read_at: string | null;
    data: Record<string, unknown>;
    action_url: string | null;
    user?: NotificationUser; // Present for super admin view
}

export interface NotificationPagination {
    data: Notification[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export interface NotificationsResponse {
    notifications: NotificationPagination;
    unread_count: number;
    total_count: number;
}

export type NotificationFilter = 'all' | 'unread' | 'read';
