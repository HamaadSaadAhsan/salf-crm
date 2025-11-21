import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLeadLifecycleFunnel } from '@/hooks/useDashboard';
import { useState } from 'react';

type Period = 7 | 14 | 30 | 60 | 90;

export function LeadLifecycleFunnel() {
    const [period, setPeriod] = useState<Period>(30);
    const { data, isLoading, error } = useLeadLifecycleFunnel(period);

    const periods: { value: Period; label: string }[] = [
        { value: 7, label: '7D' },
        { value: 14, label: '14D' },
        { value: 30, label: '30D' },
        { value: 60, label: '60D' },
        { value: 90, label: '90D' },
    ];

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Lead Lifecycle Funnel</CardTitle>
                    <CardDescription className="mt-1">Conversion through pipeline stages</CardDescription>
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
                    <CardTitle className="text-xl font-semibold">Lead Lifecycle Funnel</CardTitle>
                    <CardDescription className="mt-1">Conversion through pipeline stages</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                        Error loading funnel data
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.funnel_data.length === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Lead Lifecycle Funnel</CardTitle>
                    <CardDescription className="mt-1">Conversion through pipeline stages</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                        No funnel data available
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
                        <CardTitle className="text-xl font-semibold">Lead Lifecycle Funnel</CardTitle>
                        <CardDescription className="mt-1">
                            Overall Conversion Rate:{' '}
                            <span className="font-bold">{data.overall_conversion_rate.toFixed(1)}%</span>
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
                <div className="space-y-4">
                    {data.funnel_data.map((stage, index) => {
                        // Calculate width percentage for funnel visualization
                        const widthPercent = stage.percentage;
                        const isFirst = index === 0;

                        return (
                            <div key={stage.stage} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{stage.stage}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{stage.count.toLocaleString()}</span>
                                        <span className="text-muted-foreground">
                                            ({stage.percentage.toFixed(1)}%)
                                        </span>
                                        {stage.conversion_rate !== null && !isFirst && (
                                            <span className="text-xs text-green-600 dark:text-green-400">
                                                ↓ {stage.conversion_rate.toFixed(1)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="relative h-12 rounded-lg bg-muted">
                                    <div
                                        className="h-full rounded-lg transition-all"
                                        style={{
                                            width: `${widthPercent}%`,
                                            backgroundColor: stage.color,
                                        }}
                                    >
                                        <div className="flex h-full items-center justify-center text-sm font-medium text-white">
                                            {stage.count > 0 && stage.stage}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Time Period</p>
                        <p className="font-medium">{data.period_days} days</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Total Leads</p>
                        <p className="font-medium">
                            {data.funnel_data[0]?.count.toLocaleString() || 0}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
