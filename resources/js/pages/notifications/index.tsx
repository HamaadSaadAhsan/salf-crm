import { useCallback, useEffect, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import {
    Bell,
    BellOff,
    Check,
    CheckCheck,
    Inbox,
    Search,
    Trash2,
    Activity,
    UserPlus,
    Facebook,
    Phone,
    AlertCircle,
    Settings,
    MoreHorizontal,
    RefreshCw,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { type Notification, type NotificationFilter, type NotificationPagination } from '@/types/notification.d';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, InputWrapper } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// Props interface
interface NotificationsPageProps {
    notifications: NotificationPagination;
    unread_count: number;
    total_count: number;
    filter: NotificationFilter;
    is_super_admin: boolean;
}

// Icon mapping for notification types
const notificationIcons: Record<string, typeof Bell> = {
    lead_activity: Activity,
    lead_assigned: UserPlus,
    facebook: Facebook,
    facebook_lead: Facebook,
    task: Check,
    task_overdue: AlertCircle,
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
    call: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    system: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
};

// Notification item component
function NotificationItem({
    notification,
    onMarkAsRead,
    onDelete,
    onNavigate,
    showUser = false,
}: {
    notification: Notification;
    onMarkAsRead: (id: string) => void;
    onDelete: (id: string) => void;
    onNavigate: (url: string) => void;
    showUser?: boolean;
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
                'group relative flex cursor-pointer gap-4 rounded-lg border bg-card p-4 transition-all hover:shadow-sm',
                !notification.read
                    ? 'border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.03]'
                    : 'border-border hover:border-border/80'
            )}
        >
            {/* Unread indicator */}
            {!notification.read && (
                <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
            )}

            {/* Icon */}
            <div
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                    colorClass
                )}
            >
                <Icon className="size-5" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        {/* Show user badge for super admin */}
                        {showUser && notification.user && (
                            <Badge variant="secondary" size="xs" className="mb-1.5">
                                {notification.user.name}
                            </Badge>
                        )}
                        <p
                            className={cn(
                                'text-sm leading-tight',
                                !notification.read ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                            )}
                        >
                            {notification.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {notification.description}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground/70">
                            {notification.timestamp}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                        {!notification.read && (
                            <Button
                                variant="ghost"
                                size="sm"
                                mode="icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkAsRead(notification.id);
                                }}
                                className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
                                title="Mark as read"
                            >
                                <Check className="size-4" />
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    mode="icon"
                                    onClick={(e) => e.stopPropagation()}
                                    className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                {!notification.read && (
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMarkAsRead(notification.id);
                                        }}
                                    >
                                        <Check className="size-4" />
                                        Mark as read
                                    </DropdownMenuItem>
                                )}
                                {notification.action_url && (
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onNavigate(notification.action_url!);
                                        }}
                                    >
                                        <Activity className="size-4" />
                                        View details
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    variant="destructive"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(notification.id);
                                    }}
                                >
                                    <Trash2 className="size-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Loading skeleton
function NotificationSkeleton() {
    return (
        <div className="flex gap-4 rounded-lg border border-border bg-card p-4">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/4" />
            </div>
        </div>
    );
}

// Empty state component
function EmptyState({ filter }: { filter: NotificationFilter }) {
    const messages: Record<NotificationFilter, { title: string; description: string }> = {
        all: {
            title: 'No notifications yet',
            description: 'When you receive notifications, they will appear here.',
        },
        unread: {
            title: 'All caught up!',
            description: 'You have no unread notifications.',
        },
        read: {
            title: 'No read notifications',
            description: 'Notifications you have read will appear here.',
        },
    };

    const IconComponent = filter === 'unread' ? CheckCheck : Inbox;

    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                <IconComponent className="size-7 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">{messages[filter].title}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{messages[filter].description}</p>
        </div>
    );
}

// Page header component
function PageHeader({
    unreadCount,
    totalCount,
    onMarkAllAsRead,
    onRefresh,
    isRefreshing,
    searchQuery,
    onSearchChange,
}: {
    unreadCount: number;
    totalCount: number;
    onMarkAllAsRead: () => void;
    onRefresh: () => void;
    isRefreshing: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}) {
    return (
        <div className="flex flex-col gap-4 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                <h1 className="inline-flex items-center gap-2.5 text-lg font-semibold">
                    <Bell className="size-5 text-primary" />
                    Notifications
                </h1>
                {unreadCount > 0 && (
                    <Badge variant="primary" appearance="light" size="sm">
                        {unreadCount} unread
                    </Badge>
                )}
            </div>

            <div className="flex items-center gap-2.5">
                {/* Search */}
                <InputWrapper variant="sm" className="w-48">
                    <Search className="size-4 text-muted-foreground" />
                    <Input
                        variant="sm"
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </InputWrapper>

                {/* Refresh */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                >
                    <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
                </Button>

                {/* Mark all as read */}
                {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
                        <CheckCheck className="size-4" />
                        Mark all read
                    </Button>
                )}
            </div>
        </div>
    );
}

// Main page component
export default function NotificationsPage({
    notifications: initialNotifications,
    unread_count: initialUnreadCount,
    total_count: initialTotalCount,
    filter: initialFilter,
    is_super_admin: isSuperAdmin = false,
}: NotificationsPageProps) {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const userId = auth.user.id;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Notifications', href: '/notifications' },
    ];

    // State
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications.data);
    const [pagination, setPagination] = useState({
        currentPage: initialNotifications.current_page,
        lastPage: initialNotifications.last_page,
        total: initialNotifications.total,
    });
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [activeFilter, setActiveFilter] = useState<NotificationFilter>(initialFilter || 'all');
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Update state when props change
    useEffect(() => {
        setNotifications(initialNotifications.data);
        setPagination({
            currentPage: initialNotifications.current_page,
            lastPage: initialNotifications.last_page,
            total: initialNotifications.total,
        });
        setUnreadCount(initialUnreadCount);
        setTotalCount(initialTotalCount);
    }, [initialNotifications, initialUnreadCount, initialTotalCount]);

    // Listen to Echo for real-time updates
    useEcho(
        `App.Models.User.${userId}`,
        '.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated',
        (event: Notification) => {
            setNotifications((prev) => [event, ...prev]);
            setUnreadCount((prev) => prev + 1);
            setTotalCount((prev) => prev + 1);
            toast.info('New notification received');
        }
    );

    // Also listen to the private user channel for custom events
    useEcho(`user.${userId}`, '.notification', (event: Notification) => {
        setNotifications((prev) => [event, ...prev]);
        setUnreadCount((prev) => prev + 1);
        setTotalCount((prev) => prev + 1);
        toast.info('New notification received');
    });

    // Fetch notifications
    const fetchNotifications = useCallback(async (filter: NotificationFilter, page: number = 1) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/notifications?filter=${filter}&per_page=20&page=${page}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            if (response.ok) {
                const data = await response.json();
                if (page === 1) {
                    setNotifications(data.notifications.data);
                } else {
                    setNotifications((prev) => [...prev, ...data.notifications.data]);
                }
                setPagination({
                    currentPage: data.notifications.current_page,
                    lastPage: data.notifications.last_page,
                    total: data.notifications.total,
                });
                setUnreadCount(data.unread_count);
                setTotalCount(data.total_count);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle filter change
    const handleFilterChange = (newFilter: string) => {
        const filter = newFilter as NotificationFilter;
        setActiveFilter(filter);
        setSearchQuery('');
        router.visit(`/notifications?filter=${filter}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Handle refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchNotifications(activeFilter);
        setIsRefreshing(false);
        toast.success('Notifications refreshed');
    };

    // Handle mark as read
    const handleMarkAsRead = async (id: string) => {
        try {
            const response = await fetch(`/api/notifications/${id}/mark-read`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                setNotifications((prev) =>
                    prev.map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            toast.error('Failed to mark as read');
        }
    };

    // Handle mark all as read
    const handleMarkAllAsRead = async () => {
        try {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                setNotifications((prev) =>
                    prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
                );
                setUnreadCount(0);
                toast.success('All notifications marked as read');
            }
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            toast.error('Failed to mark all as read');
        }
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/notifications/${id}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                const deletedNotification = notifications.find((n) => n.id === id);
                setNotifications((prev) => prev.filter((n) => n.id !== id));
                setTotalCount((prev) => prev - 1);
                if (deletedNotification && !deletedNotification.read) {
                    setUnreadCount((prev) => Math.max(0, prev - 1));
                }
                toast.success('Notification deleted');
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
            toast.error('Failed to delete notification');
        }
    };

    // Handle navigate
    const handleNavigate = (url: string) => {
        router.visit(url);
    };

    // Handle load more
    const handleLoadMore = () => {
        if (pagination.currentPage < pagination.lastPage) {
            fetchNotifications(activeFilter, pagination.currentPage + 1);
        }
    };

    // Filter notifications by search query
    const filteredNotifications = searchQuery
        ? notifications.filter(
              (n) =>
                  n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  n.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : notifications;

    // Tab configuration
    const tabs = [
        {
            value: 'all',
            label: 'All',
            icon: Bell,
            count: totalCount,
        },
        {
            value: 'unread',
            label: 'Unread',
            icon: BellOff,
            count: unreadCount,
        },
        {
            value: 'read',
            label: 'Read',
            icon: Check,
            count: totalCount - unreadCount,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notifications" />

            <PageHeader
                unreadCount={unreadCount}
                totalCount={totalCount}
                onMarkAllAsRead={handleMarkAllAsRead}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            <div className="flex flex-1 flex-col py-0">
                {/* Tab Navigation */}
                <div className="border-b">
                    <div className="flex gap-6 px-6">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeFilter === tab.value;

                            return (
                                <button
                                    key={tab.value}
                                    onClick={() => handleFilterChange(tab.value)}
                                    className={cn(
                                        'inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-secondary-foreground hover:border-border hover:text-foreground'
                                    )}
                                >
                                    <Icon className="size-4" />
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <Badge
                                            variant={isActive ? 'primary' : 'secondary'}
                                            appearance="light"
                                            size="xs"
                                        >
                                            {tab.count}
                                        </Badge>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Notification List */}
                <ScrollArea className="flex-1">
                    <div className="flex flex-col gap-3 p-6">
                        {isLoading && notifications.length === 0 ? (
                            <>
                                <NotificationSkeleton />
                                <NotificationSkeleton />
                                <NotificationSkeleton />
                                <NotificationSkeleton />
                            </>
                        ) : filteredNotifications.length > 0 ? (
                            <>
                                {filteredNotifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onMarkAsRead={handleMarkAsRead}
                                        onDelete={handleDelete}
                                        onNavigate={handleNavigate}
                                        showUser={isSuperAdmin}
                                    />
                                ))}

                                {/* Load more button */}
                                {pagination.currentPage < pagination.lastPage && !searchQuery && (
                                    <div className="flex justify-center pt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleLoadMore}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <RefreshCw className="size-4 animate-spin" />
                                                    Loading...
                                                </>
                                            ) : (
                                                <>Load more</>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <EmptyState filter={activeFilter} />
                        )}
                    </div>
                </ScrollArea>
            </div>
        </AppLayout>
    );
}
