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
} from 'lucide-react';
import { Link } from '@inertiajs/react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { LeadActivity } from '@/types/lead';

const ITEMS_PER_MONTH = 5;

interface LeadRecordsActivityProps {
    activities?: LeadActivity[];
}

export function LeadRecordsActivity({ activities = [] }: LeadRecordsActivityProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
    const [expandedDescriptions, setExpandedDescriptions] = useState<Record<number, boolean>>({});

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

    // Group activities by month
    const groupedByMonth = activities.reduce((acc, activity) => {
        const date = parseISO(activity.created_at);
        const monthKey = format(date, 'MMMM yyyy');
        if (!acc[monthKey]) {
            acc[monthKey] = [];
        }
        acc[monthKey].push(activity);
        return acc;
    }, {} as Record<string, LeadActivity[]>);

    // Sort activities within each month by date (newest first)
    Object.keys(groupedByMonth).forEach((monthKey) => {
        groupedByMonth[monthKey].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    });

    // Sort months by date (newest first)
    const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => {
        const dateA = parseISO(groupedByMonth[a][0].created_at);
        const dateB = parseISO(groupedByMonth[b][0].created_at);
        return dateB.getTime() - dateA.getTime();
    });

    // Initialize expanded state for all months
    if (sortedMonths.length > 0 && Object.keys(expanded).length === 0) {
        const initialExpanded: Record<string, boolean> = {};
        sortedMonths.forEach((month) => {
            initialExpanded[month] = true;
        });
        setExpanded(initialExpanded);
    }

    const handleSeeMore = (monthKey: string) => {
        setVisibleCounts((prev) => ({
            ...prev,
            [monthKey]: (prev[monthKey] || ITEMS_PER_MONTH) + ITEMS_PER_MONTH,
        }));
    };

    const getVisibleActivities = (monthKey: string) => {
        const count = visibleCounts[monthKey] || ITEMS_PER_MONTH;
        return groupedByMonth[monthKey].slice(0, count);
    };

    if (activities.length === 0) {
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

            {sortedMonths.map((month, monthIndex) => {
                const monthActivities = groupedByMonth[month];
                const visibleActivities = getVisibleActivities(month);
                const hasMore = monthActivities.length > visibleActivities.length;
                const isExpanded = expanded[month] ?? true;

                return (
                    <div key={month} className="relative mb-10">
                        <button
                            className="flex items-center justify-between w-full gap-0.5 cursor-pointer text-xs font-medium text-muted-foreground mb-5 focus:outline-none select-none"
                            onClick={() =>
                                setExpanded((prev) => ({ ...prev, [month]: !prev[month] }))
                            }
                            aria-expanded={isExpanded}
                            aria-controls={`timeline-group-${month}`}
                            type="button"
                        >
                            <div className="flex items-center gap-2 shrink-0">
                                {monthIndex === 0 ? (
                                    <CalendarClock className="size-4 z-10" />
                                ) : (
                                    <CalendarRange className="size-4 z-10" />
                                )}
                                {month}
                            </div>

                            <Separator className="flex-1 mx-0.5" />

                            <span
                                className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                            >
                                <ChevronDown className="size-4" />
                            </span>
                        </button>

                        <div className={`${isExpanded ? 'block' : 'hidden'} relative`}>
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
                                        onClick={() => handleSeeMore(month)}
                                    >
                                        See more ({monthActivities.length - visibleActivities.length} remaining)
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
