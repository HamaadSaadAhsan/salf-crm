import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { NightTooltip } from '@/components/dashboard/night-tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLeadLifecycleAnalysis } from '@/hooks/useDashboard';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { AlertTriangle } from 'lucide-react';

type Period = 7 | 14 | 30 | 60 | 90 | 180;

const STAGE_COLORS: Record<string, string> = {
    'New → Contacted': '#3b82f6',
    'Contacted → Qualified': '#10b981',
    'Qualified → Won': '#f59e0b',
};

const SEVERITY_COLOR: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#6b7280',
};

export function LeadLifecycleAnalysis() {
    const [period, setPeriod] = useState<Period>(90);
    const { data, isLoading, error } = useLeadLifecycleAnalysis(period);

    const periods: { value: Period; label: string }[] = [
        { value: 7, label: '7D' },
        { value: 14, label: '14D' },
        { value: 30, label: '1M' },
        { value: 60, label: '2M' },
        { value: 90, label: '3M' },
        { value: 180, label: '6M' },
    ];

    const chartConfig = {
        avg_days: { label: 'Average Days', color: '#3b82f6' },
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                    <CardTitle className="text-sm font-semibold">Lead Lifecycle Analysis</CardTitle>
                </CardHeader>
                <CardContent><Skeleton className="h-[440px] w-full" /></CardContent>
            </Card>
        );
    }

    if (error || !data || data.velocity_metrics.total_leads === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                    <CardTitle className="text-sm font-semibold">Lead Lifecycle Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[440px] items-center justify-center text-sm text-muted-foreground">
                        {error ? 'Error loading data' : 'No lifecycle data available'}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const vm = data.velocity_metrics;
    const stageDurationData = data.stage_durations.map((item) => ({
        stage: item.stage,
        avg_days: item.avg_days,
    }));

    const sortedBottlenecks = [...(data.bottlenecks ?? [])].sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });

    return (
        <Card>
            <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                <div>
                    <CardTitle className="text-sm font-semibold">Lead Lifecycle Analysis</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">Stage durations and bottleneck identification · last {period} days</p>
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
            <CardContent className="px-5 pb-5 pt-0 space-y-6">

                {/* Velocity metrics strip */}
                <div className="grid grid-cols-4 gap-4 border-b pb-5">
                    {[
                        { label: 'Total Leads', value: vm.total_leads.toLocaleString() },
                        { label: 'Converted', value: vm.converted_leads.toLocaleString(), accent: 'text-emerald-500' },
                        { label: 'Avg Lifecycle', value: `${vm.avg_lifecycle_days.toFixed(1)}d`, accent: 'text-amber-500' },
                        { label: 'Leads/Day', value: vm.conversion_velocity.toFixed(2), accent: 'text-violet-500' },
                    ].map(({ label, value, accent }) => (
                        <div key={label}>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                            <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ?? ''}`}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Stage Duration Chart */}
                <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Average Stage Duration</p>
                    <ChartContainer config={chartConfig} className="h-[200px] w-full">
                        <BarChart data={stageDurationData} margin={{ top: 4, left: -10, right: 8, bottom: 40 }}>
                            <CartesianGrid horizontal vertical={false} stroke="currentColor" strokeOpacity={0.07} />
                            <XAxis
                                dataKey="stage"
                                tick={{ fontSize: 11, opacity: 0.6 }}
                                axisLine={false}
                                tickLine={false}
                                angle={-12}
                                textAnchor="end"
                                height={50}
                            />
                            <YAxis
                                tick={{ fontSize: 11, opacity: 0.5 }}
                                axisLine={false}
                                tickLine={false}
                                width={36}
                                tickFormatter={(v) => `${v}d`}
                            />
                            <ChartTooltip
                                content={(props: any) => (
                                    <NightTooltip {...props} valueFormatter={(v) => `${Number(v).toFixed(1)} days`} />
                                )}
                            />
                            <Bar dataKey="avg_days" radius={[4, 4, 0, 0]}>
                                {stageDurationData.map((entry, i) => (
                                    <Cell key={i} fill={STAGE_COLORS[entry.stage] ?? '#6b7280'} fillOpacity={0.85} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </div>

                {/* Bottlenecks */}
                {sortedBottlenecks.length > 0 && (
                    <div>
                        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <AlertTriangle className="size-3.5 text-amber-500" />
                            Identified Bottlenecks
                        </p>
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-muted-foreground">
                                    <th className="pb-2 text-left font-medium">Stage</th>
                                    <th className="pb-2 text-left font-medium">Severity</th>
                                    <th className="pb-2 text-right font-medium">Expected</th>
                                    <th className="pb-2 text-right font-medium">Actual</th>
                                    <th className="pb-2 text-right font-medium">Delay</th>
                                    <th className="pb-2 text-right font-medium">Stuck</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sortedBottlenecks.map((b, i) => (
                                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                                        <td className="py-2 pr-3 font-medium">{b.stage}</td>
                                        <td className="py-2 pr-3">
                                            <span
                                                className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white"
                                                style={{ backgroundColor: SEVERITY_COLOR[b.severity] ?? '#6b7280' }}
                                            >
                                                {b.severity}
                                            </span>
                                        </td>
                                        <td className="py-2 text-right tabular-nums text-muted-foreground">{b.expected_days.toFixed(1)}d</td>
                                        <td className="py-2 text-right tabular-nums">{b.actual_avg_days.toFixed(1)}d</td>
                                        <td className="py-2 text-right tabular-nums font-semibold text-red-500">+{b.delay_days.toFixed(1)}d</td>
                                        <td className="py-2 text-right tabular-nums font-semibold">{b.leads_stuck}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Stage Breakdown */}
                {data.stage_breakdown && data.stage_breakdown.length > 0 && (
                    <div className="border-t pt-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stage Breakdown</p>
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-muted-foreground">
                                    <th className="pb-2 text-left font-medium">Stage</th>
                                    <th className="pb-2 text-right font-medium">Leads</th>
                                    <th className="pb-2 text-right font-medium">→ Contact</th>
                                    <th className="pb-2 text-right font-medium">→ Qualify</th>
                                    <th className="pb-2 text-right font-medium">→ Convert</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {data.stage_breakdown.map((s, i) => (
                                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                                        <td className="py-1.5 pr-3 font-medium">{s.stage}</td>
                                        <td className="py-1.5 text-right tabular-nums">{s.total_leads}</td>
                                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">{s.avg_days_to_contact.toFixed(1)}d</td>
                                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">{s.avg_days_to_qualify.toFixed(1)}d</td>
                                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">{s.avg_days_to_convert.toFixed(1)}d</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
