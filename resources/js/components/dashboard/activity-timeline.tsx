import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { useActivityTimeline } from '@/hooks/useDashboard';
import { useState } from 'react';
import { Clock, Phone, Mail, MessageSquare, Calendar, FileText } from 'lucide-react';

type Period = 7 | 14 | 30;

const activityIcons: Record<string, typeof Clock> = {
    call: Phone,
    email: Mail,
    message: MessageSquare,
    meeting: Calendar,
    note: FileText,
    default: Clock,
};

const activityColors: Record<string, string> = {
    call: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    email: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    message: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    meeting: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    note: 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300',
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300',
};

export function ActivityTimeline() {
    const [period, setPeriod] = useState<Period>(7);
    const { data, isLoading, error } = useActivityTimeline(period);

    const periods: { value: Period; label: string }[] = [
        { value: 7, label: '7D' },
        { value: 14, label: '14D' },
        { value: 30, label: '30D' },
    ];

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Activity Timeline</CardTitle>
                    <CardDescription className="mt-1">Recent team activities and interactions</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[500px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Activity Timeline</CardTitle>
                    <CardDescription className="mt-1">Recent team activities and interactions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[500px] items-center justify-center text-muted-foreground">
                        Error loading activity timeline
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.timeline_data.length === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Activity Timeline</CardTitle>
                    <CardDescription className="mt-1">Recent team activities and interactions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[500px] items-center justify-center text-muted-foreground">
                        No activities found
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="min-h-auto py-6 border-0">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-xl font-semibold">Activity Timeline</CardTitle>
                        <CardDescription className="mt-1">
                            {data.total_activities} activities in the last {period} days
                        </CardDescription>
                    </div>
                </div>
                <CardToolbar className="flex items-center gap-2 flex-wrap">
                    <ToggleGroup
                        type="single"
                        value={period.toString()}
                        variant="outline"
                        onValueChange={(value) => value && setPeriod(parseInt(value) as Period)}
                        className=""
                    >
                        {periods.map((p) => (
                            <ToggleGroupItem
                                key={p.value}
                                value={p.value.toString()}
                                className="px-3.5 first:rounded-s-full! last:rounded-e-full!"
                            >
                                {p.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </CardToolbar>
            </CardHeader>
            <CardContent className="p-6">
                {/* Activity Type Summary */}
                <div className="mb-6 flex flex-wrap gap-2">
                    {data.type_summary.map((type) => {
                        const Icon = activityIcons[type.type] || activityIcons.default;
                        const colorClass = activityColors[type.type] || activityColors.default;
                        return (
                            <Badge key={type.type} variant="secondary" className={colorClass}>
                                <Icon className="mr-1 h-3 w-3" />
                                {type.type}: {type.count}
                            </Badge>
                        );
                    })}
                </div>

                {/* Timeline */}
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                    {data.timeline_data.map((day) => (
                        <div key={day.date} className="relative">
                            {/* Date Header */}
                            <div className="sticky top-0 z-10 mb-3 flex items-center gap-3 bg-background pb-2">
                                <div className="flex-1 border-t" />
                                <span className="text-sm font-medium text-muted-foreground">
                                    {new Date(day.date).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                    {day.total_activities} activities
                                </Badge>
                                <div className="flex-1 border-t" />
                            </div>

                            {/* Activities for this day */}
                            <div className="space-y-3">
                                {day.activities.map((activity) => {
                                    const Icon = activityIcons[activity.type] || activityIcons.default;
                                    const colorClass = activityColors[activity.type] || activityColors.default;

                                    return (
                                        <div
                                            key={activity.id}
                                            className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className={`rounded-full p-2 ${colorClass}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs capitalize">
                                                        {activity.type}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(activity.created_at).toLocaleTimeString('en-US', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-sm text-foreground">
                                                    {activity.description || 'No description'}
                                                </p>
                                                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span>Lead: {activity.lead_name}</span>
                                                    <span>•</span>
                                                    <span>By: {activity.user_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
