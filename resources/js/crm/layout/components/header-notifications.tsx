import { useState, useEffect, useCallback } from 'react';
import { useEcho } from '@laravel/echo-react';
import { usePage, router } from '@inertiajs/react';
import {
    Bell,
    Check,
    CheckCheck,
    Mail,
    MessageSquare,
    Calendar,
    AlertCircle,
    UserPlus,
    FileText,
    Inbox,
    Facebook,
    Phone,
    Activity,
    Settings,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { PageProps } from '@/types/global';

// Types
interface NotificationUser {
    id: number;
    name: string;
    email: string;
}

interface Notification {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    created_at: string;
    read: boolean;
    read_at: string | null;
    data: Record<string, unknown>;
    action_url: string | null;
    user?: NotificationUser;
}

interface NotificationsResponse {
    notifications: {
        data: Notification[];
        current_page: number;
        last_page: number;
        total: number;
    };
    unread_count: number;
    total_count: number;
    is_super_admin?: boolean;
}

// Icon mapping for notification types
const notificationIcons: Record<string, typeof Bell> = {
    lead_activity: Activity,
    lead_assigned: UserPlus,
    facebook: Facebook,
    facebook_lead: Facebook,
    task: Check,
    task_overdue: AlertCircle,
    message: MessageSquare,
    calendar: Calendar,
    document: FileText,
    call: Phone,
    system: Settings,
};

// Color mapping for notification types
const notificationColors: Record<string, string> = {
    lead_activity: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    lead_assigned: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    facebook: 'bg-blue-600/10 text-blue-700 dark:text-blue-400',
    facebook_lead: 'bg-blue-600/10 text-blue-700 dark:text-blue-400',
    task: 'bg-green-500/10 text-green-600 dark:text-green-400',
    task_overdue: 'bg-red-500/10 text-red-600 dark:text-red-400',
    message: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    calendar: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    document: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    call: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    system: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
};

// Notification item component
function NotificationItem({
    notification,
    onMarkAsRead,
    onNavigate,
}: {
    notification: Notification;
    onMarkAsRead: (id: string) => void;
    onNavigate: (url: string) => void;
}) {
    const Icon = notificationIcons[notification.type] || Bell;
    const colorClass = notificationColors[notification.type] || 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400';

    const handleClick = () => {
        if (!notification.read) {
            onMarkAsRead(notification.id);
        }
        if (notification.action_url) {
            onNavigate(notification.action_url);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={cn(
                'group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50',
                !notification.read && 'bg-primary/5 dark:bg-primary/10'
            )}
        >
            {/* Unread indicator - left border accent */}
            {!notification.read && (
                <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />
            )}

            {/* Icon */}
            <div
                className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    colorClass
                )}
            >
                <Icon className="size-4" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        {/* Show user badge for super admin view */}
                        {notification.user && (
                            <Badge variant="secondary" size="xs" className="mb-1">
                                {notification.user.name}
                            </Badge>
                        )}
                        <p
                            className={cn(
                                'text-sm leading-tight',
                                !notification.read ? 'font-medium text-foreground' : 'text-foreground'
                            )}
                        >
                            {notification.title}
                        </p>
                    </div>
                    {!notification.read && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMarkAsRead(notification.id);
                            }}
                            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                            title="Mark as read"
                        >
                            <Check className="size-3.5" />
                        </button>
                    )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {notification.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                    {notification.timestamp}
                </p>
            </div>
        </div>
    );
}

// Loading skeleton
function NotificationSkeleton() {
    return (
        <div className="flex gap-3 p-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/4" />
            </div>
        </div>
    );
}

// Empty state component
function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Inbox className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">No notifications</p>
            <p className="mt-1 text-xs text-muted-foreground">{message}</p>
        </div>
    );
}

export function HeaderNotifications() {
    const { auth } = usePage<PageProps>().props;
    const userId = auth.user.id;

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeTab, setActiveTab] = useState('all');

    const { play } = useNotificationSound({ enabled: true });

    // Fetch notifications
    const fetchNotifications = useCallback(async (filter: string = 'all') => {
        setLoading(true);
        try {
            const response = await fetch(`/api/notifications?filter=${filter}&per_page=50`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            if (response.ok) {
                const data: NotificationsResponse = await response.json();
                setNotifications(data.notifications.data);
                setUnreadCount(data.unread_count);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch unread count only
    const fetchUnreadCount = useCallback(async () => {
        try {
            const response = await fetch('/api/notifications/unread-count', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            if (response.ok) {
                const data = await response.json();
                setUnreadCount(data.count);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    // Fetch when sheet opens
    useEffect(() => {
        if (open) {
            fetchNotifications(activeTab);
        }
    }, [open, activeTab, fetchNotifications]);

    // Listen to Echo for new notifications
    useEcho(
        `App.Models.User.${userId}`,
        '.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated',
        (event: Notification) => {
            // Add new notification to the list
            setNotifications((prev) => [event, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Play notification sound
            play('normal');
        }
    );

    // Also listen to the private user channel for custom events
    useEcho(`user.${userId}`, '.notification', (event: Notification) => {
        setNotifications((prev) => [event, ...prev]);
        setUnreadCount((prev) => prev + 1);
        play('normal');
    });

    const handleMarkAsRead = async (id: string) => {
        try {
            const response = await fetch(`/api/notifications/${id}/mark-read`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                setNotifications((prev) =>
                    prev.map((n) => (n.id === id ? { ...n, read: true } : n))
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    };

    const handleNavigate = (url: string) => {
        setOpen(false);
        router.visit(url);
    };

    const readNotifications = notifications.filter((n) => n.read);
    const unreadNotifications = notifications.filter((n) => !n.read);

    const displayedNotifications = activeTab === 'all'
        ? notifications
        : activeTab === 'unread'
        ? unreadNotifications
        : readNotifications;

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <div className="relative">
                    <Button
                        variant="ghost"
                        size="sm"
                        mode="icon"
                        className="text-white hover:border-zinc-800 hover:bg-zinc-800 hover:text-white"
                    >
                        <Bell className="size-4 text-white" />
                    </Button>
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            size="xs"
                            shape="circle"
                            className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center p-0 text-[10px]"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </div>
            </SheetTrigger>

            <SheetContent side="right" close={false} className="flex w-full flex-col p-0 sm:max-w-md">
                {/* Header */}
                <SheetHeader className="border-b px-5 py-4">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-base font-semibold">Notifications</SheetTitle>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                                onClick={handleMarkAllAsRead}
                            >
                                <CheckCheck className="size-3.5" />
                                Mark all as read
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                {/* Tabs */}
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex flex-1 flex-col overflow-hidden"
                >
                    <div className="border-b px-5">
                        <TabsList variant="line" size="sm" className="w-full justify-start">
                            <TabsTrigger value="all" className="relative">
                                All
                                {notifications.length > 0 && (
                                    <Badge variant="secondary" size="xs" className="ml-1.5">
                                        {notifications.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="unread" className="relative">
                                Unread
                                {unreadCount > 0 && (
                                    <Badge variant="primary" appearance="light" size="xs" className="ml-1.5">
                                        {unreadCount}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="read">Read</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Notification list */}
                    <TabsContent value={activeTab} className="mt-0 flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="flex flex-col gap-1 p-3">
                                {loading ? (
                                    <>
                                        <NotificationSkeleton />
                                        <NotificationSkeleton />
                                        <NotificationSkeleton />
                                    </>
                                ) : displayedNotifications.length > 0 ? (
                                    displayedNotifications.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onMarkAsRead={handleMarkAsRead}
                                            onNavigate={handleNavigate}
                                        />
                                    ))
                                ) : (
                                    <EmptyState
                                        message={
                                            activeTab === 'unread'
                                                ? 'No unread notifications'
                                                : activeTab === 'read'
                                                ? 'No read notifications yet'
                                                : "You're all caught up!"
                                        }
                                    />
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                {/* Footer */}
                <div className="border-t p-4">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                            setOpen(false);
                            router.visit('/notifications');
                        }}
                    >
                        <Mail className="size-4" />
                        View all notifications
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
