import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLeadDistribution } from '@/hooks/useDashboard';
import { MULTI_SERIES_COLORS } from '@/lib/dashboard-colors';
import { useState } from 'react';

type Period = 7 | 14 | 30 | 60 | 90;

const PERIODS: { value: Period; label: string }[] = [
    { value: 7, label: '7D' },
    { value: 14, label: '14D' },
    { value: 30, label: '30D' },
    { value: 60, label: '60D' },
    { value: 90, label: '90D' },
];

export function AdSourcesChart() {
    const [period, setPeriod] = useState<Period>(30);
    const { data, isLoading, error } = useLeadDistribution('source', period);

    const chartData =
        data?.distribution_data
            .map((item, index) => ({
                ...item,
                fill: MULTI_SERIES_COLORS[index % MULTI_SERIES_COLORS.length],
            }))
            .sort((a, b) => b.count - a.count) || [];

    const totalLeads = data?.total_leads ?? 0;
    const maxCount = chartData[0]?.count ?? 1;

    return (
        <Card className="min-w-0">
            <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                <CardTitle className="text-sm font-semibold">Ad Sources</CardTitle>
                <CardToolbar className="flex items-center gap-2">
                    <ToggleGroup
                        type="single"
                        value={String(period)}
                        variant="outline"
                        onValueChange={(v) => v && setPeriod(Number(v) as Period)}
                    >
                        {PERIODS.map((p) => (
                            <ToggleGroupItem
                                key={p.value}
                                value={String(p.value)}
                                className="px-2.5 text-xs first:rounded-s-full! last:rounded-e-full!"
                            >
                                {p.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </CardToolbar>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-8 w-full" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                        Error loading source data
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                        No data available
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tabular-nums">{totalLeads.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">total leads</span>
                        </div>
                        <div className="space-y-2.5">
                            {chartData.map((item) => (
                                <div key={item.name} className="group">
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className="h-2 w-2 shrink-0 rounded-full"
                                                style={{ backgroundColor: item.fill }}
                                            />
                                            <span className="truncate text-sm text-foreground">{item.name}</span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <span className="text-sm font-semibold tabular-nums">{item.count}</span>
                                            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                                                {item.percentage.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${(item.count / maxCount) * 100}%`,
                                                backgroundColor: item.fill,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
