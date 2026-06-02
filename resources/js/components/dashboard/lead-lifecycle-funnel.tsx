import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLeadLifecycleFunnel } from '@/hooks/useDashboard';
import { useState } from 'react';

type Period = 7 | 14 | 30 | 60 | 90;

const STAGE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

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
                <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                    <CardTitle className="text-sm font-semibold">Lead Lifecycle Funnel</CardTitle>
                </CardHeader>
                <CardContent><Skeleton className="h-[280px] w-full" /></CardContent>
            </Card>
        );
    }

    if (error || !data || data.funnel_data.length === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                    <CardTitle className="text-sm font-semibold">Lead Lifecycle Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                        {error ? 'Error loading data' : 'No funnel data available'}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const totalLeads = data.funnel_data[0]?.count ?? 1;

    return (
        <Card>
            <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                <div>
                    <CardTitle className="text-sm font-semibold">Lead Lifecycle Funnel</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Overall conversion rate: <span className="font-semibold text-foreground">{data.overall_conversion_rate.toFixed(1)}%</span>
                    </p>
                </div>
                <CardToolbar>
                    <ToggleGroup
                        type="single"
                        value={period.toString()}
                        variant="outline"
                        onValueChange={(v) => v && setPeriod(parseInt(v) as Period)}
                    >
                        {periods.map((p) => (
                            <ToggleGroupItem key={p.value} value={p.value.toString()} className="px-2.5 text-xs first:rounded-s-full! last:rounded-e-full!">
                                {p.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </CardToolbar>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
                <div className="space-y-3">
                    {data.funnel_data.map((stage, index) => {
                        const barWidth = Math.max((stage.count / totalLeads) * 100, stage.count > 0 ? 1 : 0);
                        const color = STAGE_COLORS[index % STAGE_COLORS.length];

                        return (
                            <div key={stage.stage}>
                                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                                    <span className="font-medium text-sm">{stage.stage}</span>
                                    <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                                        <span className="font-semibold text-foreground tabular-nums">{stage.count.toLocaleString()}</span>
                                        <span>({stage.percentage.toFixed(1)}%)</span>
                                        {stage.conversion_rate !== null && index > 0 && (
                                            <span className="text-emerald-500">↓ {stage.conversion_rate.toFixed(1)}%</span>
                                        )}
                                    </div>
                                </div>
                                <div className="h-7 w-full overflow-hidden rounded bg-muted/40">
                                    <div
                                        className="h-full rounded transition-all duration-500"
                                        style={{ width: `${barWidth}%`, backgroundColor: color, opacity: 0.85 }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 text-xs">
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Time Period</p>
                        <p className="mt-0.5 font-semibold">{data.period_days} days</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Leads</p>
                        <p className="mt-0.5 font-semibold tabular-nums">{totalLeads.toLocaleString()}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
