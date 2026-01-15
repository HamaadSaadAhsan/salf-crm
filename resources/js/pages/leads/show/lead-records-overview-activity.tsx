import * as React from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { formatDistanceToNow, parseISO, isToday, isThisWeek, isThisMonth, isThisYear, format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { LeadActivity } from '@/types/lead';

type TimeFilter = 'today' | 'week' | 'month' | 'year';

interface LeadRecordsOverviewActivityProps {
    activities?: LeadActivity[];
    onViewAll?: () => void;
}

const ITEMS_PER_MONTH = 3;

export function LeadRecordsOverviewActivity({
    activities = [],
    onViewAll,
}: LeadRecordsOverviewActivityProps) {
    const [isActivityOpen, setIsActivityOpen] = React.useState(true);
    const [timeFilter, setTimeFilter] = React.useState<TimeFilter>('month');
    const [expandedMonths, setExpandedMonths] = React.useState<Record<string, number>>({});

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
                return 'added';
            case 'call':
                return 'made a call';
            case 'email':
                return 'sent';
            case 'meeting':
                return 'scheduled';
            case 'status_change':
                return 'changed';
            case 'assignment_change':
                return 'assigned';
            case 'task':
                return 'created';
            case 'follow_up':
                return 'scheduled';
            default:
                return 'updated';
        }
    };

    // Filter activities by time period
    const filteredActivities = React.useMemo(() => {
        return activities.filter((activity) => {
            const date = parseISO(activity.created_at);
            switch (timeFilter) {
                case 'today':
                    return isToday(date);
                case 'week':
                    return isThisWeek(date);
                case 'month':
                    return isThisMonth(date);
                case 'year':
                    return isThisYear(date);
                default:
                    return true;
            }
        });
    }, [activities, timeFilter]);

    // Group activities by month
    const groupedActivities = React.useMemo(() => {
        const groups: Record<string, LeadActivity[]> = {};

        // Sort by most recent first
        const sorted = [...filteredActivities].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        sorted.forEach((activity) => {
            const date = parseISO(activity.created_at);
            const monthKey = format(date, 'MMMM yyyy');
            if (!groups[monthKey]) {
                groups[monthKey] = [];
            }
            groups[monthKey].push(activity);
        });

        return groups;
    }, [filteredActivities]);

    const handleSeeMore = (monthKey: string) => {
        setExpandedMonths((prev) => ({
            ...prev,
            [monthKey]: (prev[monthKey] || ITEMS_PER_MONTH) + ITEMS_PER_MONTH,
        }));
    };

    const getVisibleActivities = (monthKey: string, activities: LeadActivity[]) => {
        const limit = expandedMonths[monthKey] || ITEMS_PER_MONTH;
        return activities.slice(0, limit);
    };

    const monthKeys = Object.keys(groupedActivities);

    return (
        <Collapsible
            className="space-y-2 relative"
            open={isActivityOpen}
            onOpenChange={setIsActivityOpen}
        >
            <div className="flex items-center justify-between gap-2.5">
                <CollapsibleTrigger asChild>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-sm text-semibold [&:not(:hover)[data-state=open]]:bg-transparent hover:bg-accent ps-1.5"
                    >
                        <Activity />
                        Activity
                        <ChevronRight className="[[data-state=open]_&]:rotate-90" />
                    </Button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
                <Tabs
                    value={timeFilter}
                    onValueChange={(value) => setTimeFilter(value as TimeFilter)}
                    className="text-sm text-muted-foreground end-0 top-0 absolute z-1"
                >
                    <TabsList
                        variant="button"
                        size="xs"
                        className="[&_button]:text-muted-foreground"
                    >
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="week">Week</TabsTrigger>
                        <TabsTrigger value="month">Month</TabsTrigger>
                        <TabsTrigger value="year">Year</TabsTrigger>
                    </TabsList>
                </Tabs>

                <Card className="shadow-none">
                    <CardContent className="space-y-3 p-3.5">
                        {filteredActivities.length === 0 ? (
                            <div className="text-muted-foreground py-8 text-center text-sm">
                                No activity for this period
                            </div>
                        ) : (
                            <>
                                {monthKeys.map((monthKey) => {
                                    const monthActivities = groupedActivities[monthKey];
                                    const visibleActivities = getVisibleActivities(monthKey, monthActivities);
                                    const hasMore = monthActivities.length > visibleActivities.length;

                                    return (
                                        <div key={monthKey} className="space-y-2.5">
                                            {monthKeys.length > 1 && (
                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                    {monthKey}
                                                </h4>
                                            )}
                                            <ul className="flex flex-col gap-2.5">
                                                {visibleActivities.map((activity) => {
                                                    const user = getUserData(activity);
                                                    return (
                                                        <li key={activity.id} className="flex items-center gap-1.5 text-sm">
                                                            <Avatar className="size-6">
                                                                {user?.avatar && (
                                                                    <AvatarImage
                                                                        src={user.avatar}
                                                                        alt={user.name}
                                                                    />
                                                                )}
                                                                <AvatarFallback>
                                                                    {user ? getInitials(user.name) : '?'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex items-center gap-1 min-w-0 flex-1">
                                                                <Link href="#" className="font-medium hover:text-primary shrink-0">
                                                                    {user?.name || 'Unknown'}
                                                                </Link>
                                                                <span className="text-muted-foreground shrink-0">
                                                                    {getActivityAction(activity.type)}
                                                                </span>
                                                                <Link
                                                                    href="#"
                                                                    className="text-mono font-medium hover:text-primary truncate"
                                                                >
                                                                    {activity.subject || activity.type}
                                                                </Link>
                                                            </div>
                                                            <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                                                                {formatTimeAgo(activity.created_at)}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                            {hasMore && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs text-muted-foreground"
                                                    onClick={() => handleSeeMore(monthKey)}
                                                >
                                                    See more ({monthActivities.length - visibleActivities.length} remaining)
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                                <div className="flex justify-start">
                                    <Button mode="link" underline="solid" onClick={onViewAll}>
                                        View all
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </CollapsibleContent>
        </Collapsible>
    );
}