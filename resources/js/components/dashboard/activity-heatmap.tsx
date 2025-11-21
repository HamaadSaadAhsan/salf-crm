import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useActivityHeatmap } from '@/hooks/useDashboard';
import { useState } from 'react';

type Period = 7 | 14 | 30;

export function ActivityHeatmap() {
    const [period, setPeriod] = useState<Period>(30);
    const { data, isLoading, error } = useActivityHeatmap(period);

    const periods: { value: Period; label: string }[] = [
        { value: 7, label: '7D' },
        { value: 14, label: '14D' },
        { value: 30, label: '30D' },
    ];

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Activity Heatmap</CardTitle>
                    <CardDescription className="mt-1">Activity patterns by day and time</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Activity Heatmap</CardTitle>
                    <CardDescription className="mt-1">Activity patterns by day and time</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                        Error loading heatmap data
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.heatmap_data.length === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Activity Heatmap</CardTitle>
                    <CardDescription className="mt-1">Activity patterns by day and time</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                        No heatmap data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Get color based on intensity (0-1)
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
                        <CardTitle className="text-xl font-semibold">Activity Heatmap</CardTitle>
                        <CardDescription className="mt-1">Activity patterns by day and time</CardDescription>
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
                <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* Hour labels */}
                        <div className="mb-2 flex">
                            <div className="w-24" />
                            {hours.map((hour) => (
                                <div
                                    key={hour}
                                    className="flex-1 text-center text-xs text-muted-foreground"
                                >
                                    {hour % 3 === 0 ? `${hour}h` : ''}
                                </div>
                            ))}
                        </div>

                        {/* Heatmap grid */}
                        {dayNames.map((day, dayIndex) => (
                            <div key={day} className="mb-1 flex items-center">
                                <div className="w-24 pr-2 text-sm text-muted-foreground">{day}</div>
                                <div className="flex flex-1 gap-1">
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
                <div className="mt-6 flex items-center justify-between border-t pt-4 text-sm">
                    <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">Activity Level:</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Low</span>
                            <div className="flex gap-1">
                                <div className="h-4 w-4 rounded bg-muted" />
                                <div className="h-4 w-4 rounded bg-blue-100 dark:bg-blue-950" />
                                <div className="h-4 w-4 rounded bg-blue-200 dark:bg-blue-900" />
                                <div className="h-4 w-4 rounded bg-blue-300 dark:bg-blue-800" />
                                <div className="h-4 w-4 rounded bg-blue-400 dark:bg-blue-700" />
                                <div className="h-4 w-4 rounded bg-blue-500 dark:bg-blue-600" />
                            </div>
                            <span className="text-xs text-muted-foreground">High</span>
                        </div>
                    </div>
                    <div className="text-muted-foreground">
                        Peak Activity: <span className="font-medium">{data.max_count} activities</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
