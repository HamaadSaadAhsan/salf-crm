import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { NightTooltip } from '@/components/dashboard/night-tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLeadSourcePerformance } from '@/hooks/useDashboard';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';

type Period = 7 | 14 | 30 | 60 | 90;

const QUALITY_COLORS = {
    excellent: '#22c55e',
    good: '#3b82f6',
    fair: '#f59e0b',
    poor: '#ef4444',
};

function getQualityColor(score: number) {
    if (score >= 80) return QUALITY_COLORS.excellent;
    if (score >= 60) return QUALITY_COLORS.good;
    if (score >= 40) return QUALITY_COLORS.fair;
    return QUALITY_COLORS.poor;
}

function getQualityLabel(score: number) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Weak';
}

function formatTime(minutes: number) {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function LeadSourcePerformance() {
    const [period, setPeriod] = useState<Period>(30);
    const { data, isLoading, error } = useLeadSourcePerformance(period);

    const periods: { value: Period; label: string }[] = [
        { value: 7, label: '7D' },
        { value: 14, label: '14D' },
        { value: 30, label: '30D' },
        { value: 60, label: '60D' },
        { value: 90, label: '90D' },
    ];

    const chartConfig = {
        conversion_rate: { label: 'Conversion Rate', color: '#3b82f6' },
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                    <CardTitle className="text-sm font-semibold">Lead Source Performance</CardTitle>
                </CardHeader>
                <CardContent><Skeleton className="h-[360px] w-full" /></CardContent>
            </Card>
        );
    }

    if (error || !data || data.source_performance.length === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                    <CardTitle className="text-sm font-semibold">Lead Source Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
                        {error ? 'Error loading data' : 'No data available'}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const sortedData = [...data.source_performance].sort((a, b) => b.conversion_rate - a.conversion_rate);

    const chartData = sortedData.map((item) => ({
        source: item.source_name,
        conversion_rate: item.conversion_rate,
        quality_score: item.quality_score,
    }));

    return (
        <Card>
            <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                <div>
                    <CardTitle className="text-sm font-semibold">Lead Source Performance</CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                        {data.source_performance.length} sources · last {period} days
                    </CardDescription>
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
            <CardContent className="px-2 pt-0 sm:px-4">
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 0, left: 0, right: 16, bottom: 0 }}
                        onClick={(e: any) => {
                            const src = e?.activePayload?.[0]?.payload?.source;
                            if (src) router.visit(`/leads?source=${encodeURIComponent(src)}`);
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <CartesianGrid horizontal={false} vertical stroke="currentColor" strokeOpacity={0.07} />
                        <XAxis type="number" tick={{ fontSize: 11, opacity: 0.5 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                        <YAxis type="category" dataKey="source" tick={{ fontSize: 11, opacity: 0.7 }} axisLine={false} tickLine={false} width={90} />
                        <ChartTooltip content={(props: any) => <NightTooltip {...props} valueFormatter={(v) => `${Number(v).toFixed(1)}%`} />} />
                        <Bar dataKey="conversion_rate" radius={[0, 4, 4, 0]} name="Conversion Rate (%)">
                            {chartData.map((entry, index) => (
                                <Cell key={index} fill={getQualityColor(entry.quality_score)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>

                <div className="mt-3 overflow-x-auto border-t pt-3">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-muted-foreground">
                                <th className="pb-2 text-left font-medium">Source</th>
                                <th className="pb-2 text-right font-medium">Leads</th>
                                <th className="pb-2 text-right font-medium">Conv%</th>
                                <th className="pb-2 text-right font-medium">Response</th>
                                <th className="pb-2 text-right font-medium">Quality</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sortedData.map((s) => (
                                <tr key={s.source_id} className="hover:bg-muted/30 transition-colors">
                                    <td className="py-1.5 pr-3 font-medium">{s.source_name}</td>
                                    <td className="py-1.5 text-right tabular-nums">{s.total_leads}</td>
                                    <td className="py-1.5 text-right tabular-nums font-medium">{s.conversion_rate.toFixed(1)}%</td>
                                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{formatTime(s.avg_response_time_minutes)}</td>
                                    <td className="py-1.5 text-right">
                                        <span
                                            className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                                            style={{ backgroundColor: getQualityColor(s.quality_score) }}
                                        >
                                            {getQualityLabel(s.quality_score)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 border-t pt-3">
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Best</p>
                        <p className="text-sm font-semibold">{data.best_source?.source_name}</p>
                        <p className="text-xs text-muted-foreground">{data.best_source?.conversion_rate?.toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Worst</p>
                        <p className="text-sm font-semibold">{data.worst_source?.source_name}</p>
                        <p className="text-xs text-muted-foreground">{data.worst_source?.conversion_rate?.toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Overall</p>
                        <p className="text-sm font-semibold">{data.overall_conversion_rate.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">{data.total_converted}/{data.total_leads}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
