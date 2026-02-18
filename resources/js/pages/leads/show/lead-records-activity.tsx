import { useState } from 'react';
import {
    CalendarClock,
    CalendarRange,
    ChevronDown,
    Settings,
    Phone,
    Mail,
    MessageSquare,
    ClipboardList,
    UserCheck,
    RefreshCw,
    Loader2,
} from 'lucide-react';
import { Link } from '@inertiajs/react';
import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { LeadActivity } from '@/types/lead';
import { useLeadActivitiesMonthSummary, useLoadMoreMonthActivities, MonthGroup } from '@/hooks/useLead';

interface LeadRecordsActivityProps {
    leadId: string;
}

export function LeadRecordsActivity({ leadId }: LeadRecordsActivityProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [expandedDescriptions, setExpandedDescriptions] = useState<Record<number|string, boolean>>({});
    const [loadedPages, setLoadedPages] = useState<Record<string, number>>({});
    const [additionalActivities, setAdditionalActivities] = useState<Record<string, LeadActivity[]>>({});

    // Fetch activities grouped by month via API
    const { data: monthSummary, isLoading, error } = useLeadActivitiesMonthSummary(leadId, 20);
    const loadMoreMutation = useLoadMoreMonthActivities(leadId);

    const formatScheduledDate = (dateString: string) => {
        try {
            const date = parseISO(dateString);
            if (isToday(date)) return 'Today ' + format(date, 'h:mm a');
            if (isTomorrow(date)) return 'Tomorrow ' + format(date, 'h:mm a');
            return format(date, 'MMM d, h:mm a');
        } catch {
            return dateString;
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getUserData = (activity: LeadActivity) => {
        if (!activity.user) return null;
        if ('data' in activity.user && activity.user.data) {
            return activity.user.data;
        }
        if ('id' in activity.user && 'name' in activity.user) {
            return activity.user as { id: number; name: string; email: string; avatar?: string };
        }
        return null;
    };

    const formatTimeAgo = (dateString: string) => {
        try {
            return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
        } catch {
            return dateString;
        }
    };

    const getActivityAction = (type: string) => {
        switch (type) {
            case 'note':
                return 'added a note';
            case 'call':
                return 'made a call';
            case 'email':
                return 'sent an email';
            case 'meeting':
                return 'scheduled a meeting';
            case 'status_change':
                return 'changed';
            case 'assignment_change':
                return 'assigned';
            case 'task':
                return 'created a task';
            case 'follow_up':
                return 'scheduled follow-up';
            default:
                return 'updated';
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'call':
                return <Phone className="size-3.5 text-muted-foreground" />;
            case 'email':
                return <Mail className="size-3.5 text-muted-foreground" />;
            case 'note':
                return <MessageSquare className="size-3.5 text-muted-foreground" />;
            case 'task':
                return <ClipboardList className="size-3.5 text-muted-foreground" />;
            case 'assignment_change':
                return <UserCheck className="size-3.5 text-muted-foreground" />;
            case 'status_change':
                return <RefreshCw className="size-3.5 text-muted-foreground" />;
            default:
                return <Settings className="size-3.5 text-muted-foreground" />;
        }
    };

    const handleSeeMore = async (monthGroup: MonthGroup) => {
        const currentPage = loadedPages[monthGroup.month] || 1;
        const nextPage = currentPage + 1;

        try {
            const result = await loadMoreMutation.mutateAsync({
                month: monthGroup.month,
                page: nextPage,
            });

            // Append new activities to the existing ones
            setAdditionalActivities((prev) => ({
                ...prev,
                [monthGroup.month]: [...(prev[monthGroup.month] || []), ...(result.data?.data || [])],
            }));

            setLoadedPages((prev) => ({
                ...prev,
                [monthGroup.month]: nextPage,
            }));
        } catch (error) {
            console.error('Failed to load more activities:', error);
        }
    };

    const getVisibleActivities = (monthGroup: MonthGroup): LeadActivity[] => {
        const baseActivities = monthGroup.activities || [];
        const additional = additionalActivities[monthGroup.month] || [];
        return [...baseActivities, ...additional];
    };

    const getRemainingCount = (monthGroup: MonthGroup): number => {
        const loaded = getVisibleActivities(monthGroup).length;
        return Math.max(0, monthGroup.total - loaded);
    };

    if (isLoading) {
        return (
            <div className="w-full px-2 sm:px-0">
                <h2 className="text-sm font-semibold mb-6">Activity</h2>
                <div className="space-y-6">
                    {[...Array(2)].map((_, monthIdx) => (
                        <div key={monthIdx} className="space-y-4">
                            <div className="flex items-center gap-2 animate-pulse">
                                <div className="size-4 rounded bg-muted" />
                                <div className="h-4 bg-muted rounded w-24" />
                                <Separator className="flex-1" />
                            </div>
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-start gap-3 animate-pulse ml-4">
                                    <div className="size-6 rounded-full bg-muted" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-muted rounded w-3/4" />
                                        <div className="h-3 bg-muted rounded w-1/2" />
                                    </div>
                                    <div className="h-3 bg-muted rounded w-16" />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full px-2 sm:px-0">
                <h2 className="text-sm font-semibold mb-6">Activity</h2>
                <div className="text-destructive py-12 text-center text-sm">
                    Failed to load activities. Please try again.
                </div>
            </div>
        );
    }

    const monthGroups = monthSummary?.data || [];

    if (monthGroups.length === 0) {
        return (
            <div className="w-full px-2 sm:px-0">
                <h2 className="text-sm font-semibold mb-6">Activity</h2>
                <div className="text-muted-foreground py-12 text-center text-sm">
                    No activity recorded yet
                </div>
            </div>
        );
    }

    return (
        <div className="w-full px-2 sm:px-0">
            <h2 className="text-sm font-semibold mb-6">Activity</h2>

            {monthGroups.map((monthGroup, monthIndex) => {
                const visibleActivities = getVisibleActivities(monthGroup);
                const remainingCount = getRemainingCount(monthGroup);
                const hasMore = remainingCount > 0;
                const isExpanded = expanded[monthGroup.month] ?? (monthIndex === 0);
                const isLoadingMore = loadMoreMutation.isPending && loadMoreMutation.variables?.month === monthGroup.month;

                return (
                    <Collapsible
                        key={monthGroup.month}
                        open={isExpanded}
                        onOpenChange={(open) =>
                            setExpanded((prev) => ({ ...prev, [monthGroup.month]: open }))
                        }
                        className="relative mb-10"
                    >
                        <CollapsibleTrigger asChild>
                            <button
                                className="flex items-center justify-between w-full gap-0.5 cursor-pointer text-xs font-medium text-muted-foreground mb-5 focus:outline-none select-none hover:text-foreground transition-colors"
                                type="button"
                            >
                                <div className="flex items-center gap-2 shrink-0">
                                    {monthIndex === 0 ? (
                                        <CalendarClock className="size-4 z-10" />
                                    ) : (
                                        <CalendarRange className="size-4 z-10" />
                                    )}
                                    {monthGroup.month_label}
                                    <span className="text-muted-foreground/60">({monthGroup.total})</span>
                                </div>

                                <Separator className="flex-1 mx-0.5" />

                                <span
                                    className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                                >
                                    <ChevronDown className="size-4" />
                                </span>
                            </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="relative">
                            <div className="space-y-5">
                                {visibleActivities.map((activity, itemIdx) => {
                                    const user = getUserData(activity);
                                    const isLast = itemIdx === visibleActivities.length - 1 && !hasMore;

                                    return (
                                        <div
                                            key={activity.id}
                                            className="relative flex gap-3 mb-5 last:mb-0"
                                        >
                                            <div className="flex justify-between w-full">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 flex-wrap relative">
                                                        <Avatar className="size-6 relative border-2 border-background">
                                                            {!isLast && (
                                                                <div className="absolute w-px !h-full min-h-10 bg-border left-2.5 top-5.5" />
                                                            )}
                                                            {user?.avatar ? (
                                                                <AvatarImage
                                                                    src={user.avatar}
                                                                    alt={user.name}
                                                                />
                                                            ) : null}
                                                            <AvatarFallback>
                                                                {user ? getInitials(user.name) : getActivityIcon(activity.type)}
                                                            </AvatarFallback>
                                                        </Avatar>

                                                        <Link
                                                            href="#"
                                                            className="font-medium text-sm hover:text-primary"
                                                        >
                                                            {user?.name || 'System'}
                                                        </Link>
                                                        <span className="text-muted-foreground text-sm">
                                                            {getActivityAction(activity.type)}
                                                        </span>
                                                        {activity.subject && (
                                                            <span className="font-semibold text-sm">
                                                                {activity.subject}
                                                            </span>
                                                        )}
                                                        {activity.type === 'meeting' && activity.scheduled_at && (
                                                            <Badge size="sm" variant="outline" className="shrink-0">
                                                                {formatScheduledDate(activity.scheduled_at)}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {activity.description && (
                                                        <div className="ml-8 text-xs text-muted-foreground mt-0.5">
                                                            <div className={expandedDescriptions[activity.id] ? '' : 'line-clamp-2'}>
                                                                {activity.description}
                                                            </div>
                                                            {activity.description.length > 100 && (
                                                                <button
                                                                    onClick={() => setExpandedDescriptions(prev => ({
                                                                        ...prev,
                                                                        [activity.id]: !prev[activity.id]
                                                                    }))}
                                                                    className="text-primary hover:underline text-xs mt-0.5"
                                                                    type="button"
                                                                >
                                                                    {expandedDescriptions[activity.id] ? 'Show less' : 'Show more'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                                                    {formatTimeAgo(activity.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {hasMore && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="ml-8 text-xs text-muted-foreground"
                                        onClick={() => handleSeeMore(monthGroup)}
                                        disabled={isLoadingMore}
                                    >
                                        {isLoadingMore ? (
                                            <>
                                                <Loader2 className="size-3 mr-1 animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            `See more (${remainingCount} remaining)`
                                        )}
                                    </Button>
                                )}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                );
            })}
        </div>
    );
}
