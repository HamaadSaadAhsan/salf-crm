import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type Period = 7 | 14 | 30;

interface HeatmapCell {
    day: string;
    hour: number;
    count: number;
    intensity: number;
}

interface ActivityHeatmapData {
    heatmap_data: HeatmapCell[];
    period_days: number;
    total_activities: number;
    max_count: number;
}

interface Props {
    userId: number;
}

export function UserActivityHeatmap({ userId }: Props) {
    const [period, setPeriod] = useState<Period>(30);

    const { data, isLoading, error } = useQuery<ActivityHeatmapData>({
        queryKey: ['user', userId, 'activity-heatmap', period],
        queryFn: async () => {
            const response = await axios.get(`/api/users/${userId}/activity-heatmap`, {
                params: { period },
            });
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const periods: { value: Period; label: string }[] = [
        { value: 7, label: '7D' },
        { value: 14, label: '14D' },
        { value: 30, label: '30D' },
    ];

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-base">Activity Heatmap</CardTitle>
                    <CardDescription className="mt-1">Activity patterns by day and time</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-base">Activity Heatmap</CardTitle>
                    <CardDescription className="mt-1">Activity patterns by day and time</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                        Error loading heatmap data
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.heatmap_data.length === 0 || data.total_activities === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-base">Activity Heatmap</CardTitle>
                    <CardDescription className="mt-1">Activity patterns by day and time</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                        No activity data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const getColor = (intensity: number) => {
        if (intensity === 0) return 'bg-muted';
        if (intensity < 0.2) return 'bg-blue-100 dark:bg-blue-950';
        if (intensity < 0.4) return 'bg-blue-200 dark:bg-blue-900';
        if (intensity < 0.6) return 'bg-blue-300 dark:bg-blue-800';
        if (intensity < 0.8) return 'bg-blue-400 dark:bg-blue-700';
        return 'bg-blue-500 dark:bg-blue-600';
    };

    return (
        <Card>
            <CardHeader className="min-h-auto py-6 border-0">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-base">Activity Heatmap</CardTitle>
                        <CardDescription className="mt-1">Activity patterns by day and time</CardDescription>
                    </div>
                </div>
                <CardToolbar className="flex items-center gap-2 flex-wrap">
                    <ToggleGroup
                        type="single"
                        value={period.toString()}
                        variant="outline"
                        onValueChange={(value) => value && setPeriod(parseInt(value) as Period)}
                    >
                        {periods.map((p) => (
                            <ToggleGroupItem
                                key={p.value}
                                value={p.value.toString()}
                                className="px-3 first:rounded-s-full! last:rounded-e-full!"
                            >
                                {p.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </CardToolbar>
            </CardHeader>
            <CardContent className="p-6">
                <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                        {/* Hour labels */}
                        <div className="mb-2 flex">
                            <div className="w-20" />
                            {hours.map((hour) => (
                                <div
                                    key={hour}
                                    className="flex-1 text-center text-xs text-muted-foreground"
                                >
                                    {hour % 4 === 0 ? `${hour}h` : ''}
                                </div>
                            ))}
                        </div>

                        {/* Heatmap grid */}
                        {dayNames.map((day, dayIndex) => (
                            <div key={day} className="mb-1 flex items-center">
                                <div className="w-20 pr-2 text-xs text-muted-foreground">{day.slice(0, 3)}</div>
                                <div className="flex flex-1 gap-0.5">
                                    {hours.map((hour) => {
                                        const index = dayIndex * 24 + hour;
                                        const cell = data.heatmap_data[index];
                                        return (
                                            <div
                                                key={`${day}-${hour}`}
                                                className={`flex-1 cursor-pointer rounded-sm transition-colors hover:ring-2 hover:ring-primary ${getColor(
                                                    cell?.intensity || 0
                                                )}`}
                                                style={{ aspectRatio: '1/1' }}
                                                title={`${day} ${hour}:00 - ${cell?.count || 0} activities`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Activity:</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Low</span>
                            <div className="flex gap-0.5">
                                <div className="h-3 w-3 rounded bg-muted" />
                                <div className="h-3 w-3 rounded bg-blue-100 dark:bg-blue-950" />
                                <div className="h-3 w-3 rounded bg-blue-200 dark:bg-blue-900" />
                                <div className="h-3 w-3 rounded bg-blue-300 dark:bg-blue-800" />
                                <div className="h-3 w-3 rounded bg-blue-400 dark:bg-blue-700" />
                                <div className="h-3 w-3 rounded bg-blue-500 dark:bg-blue-600" />
                            </div>
                            <span className="text-xs text-muted-foreground">High</span>
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Peak: <span className="font-medium">{data.max_count}</span> | Total: <span className="font-medium">{data.total_activities}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
