import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { NightTooltip } from '@/components/dashboard/night-tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useProgramPerformance } from '@/hooks/useDashboard';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Period = 7 | 14 | 30 | 60 | 90 | 180 | 365;

export function ProgramPerformance() {
    const [period, setPeriod] = useState<Period>(90);
    const { data, isLoading, error } = useProgramPerformance(period);

    const periods: { value: Period; label: string }[] = [
        { value: 30, label: '1M' },
        { value: 60, label: '2M' },
        { value: 90, label: '3M' },
        { value: 180, label: '6M' },
        { value: 365, label: '1Y' },
    ];

    const chartConfig = {
        conversion_rate: { label: 'Conversion Rate', color: '#3b82f6' },
        qualification_rate: { label: 'Qualification Rate', color: '#10b981' },
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                    <CardTitle className="text-sm font-semibold">Program Performance</CardTitle>
                </CardHeader>
                <CardContent><Skeleton className="h-[360px] w-full" /></CardContent>
            </Card>
        );
    }

    if (error || !data || data.program_performance.length === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                    <CardTitle className="text-sm font-semibold">Program Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
                        {error ? 'Error loading data' : 'No data available'}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const sortedData = [...data.program_performance].sort((a, b) => b.conversion_rate - a.conversion_rate);

    const chartData = sortedData.map((item) => ({
        program: item.program_code,
        conversion_rate: item.conversion_rate,
        qualification_rate: item.qualification_rate,
        total_leads: item.total_leads,
        converted_leads: item.converted_leads,
    }));

    const chartHeight = Math.max(200, chartData.length * 38);

    const getTrend = (code: string) => {
        const trend = data.program_trends[code];
        if (!trend || trend === 0) return <Minus className="size-3 text-muted-foreground" />;
        if (trend > 0) return <TrendingUp className="size-3 text-emerald-500" />;
        return <TrendingDown className="size-3 text-red-500" />;
    };

    const getTrendText = (code: string) => {
        const trend = data.program_trends[code];
        if (!trend || trend === 0) return null;
        return (
            <span className={trend > 0 ? 'text-emerald-500' : 'text-red-500'}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </span>
        );
    };

    return (
        <Card>
            <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                <div>
                    <CardTitle className="text-sm font-semibold">Program Performance</CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                        {data.programs_count} programs · last {period} days
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
                <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 0, left: 0, right: 16, bottom: 0 }}
                        onClick={(e: any) => {
                            const prog = e?.activePayload?.[0]?.payload?.program;
                            if (prog) router.visit(`/leads?service_id=${encodeURIComponent(prog)}`);
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <CartesianGrid horizontal={false} vertical stroke="currentColor" strokeOpacity={0.07} />
                        <XAxis type="number" tick={{ fontSize: 11, opacity: 0.5 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                        <YAxis type="category" dataKey="program" tick={{ fontSize: 11, opacity: 0.7 }} axisLine={false} tickLine={false} width={110} interval={0} />
                        <ChartTooltip
                            content={(props: any) => (
                                <NightTooltip
                                    {...props}
                                    payload={props.payload?.map((p: any) => ({
                                        ...p,
                                        name: p.dataKey === 'conversion_rate' ? 'Conversion' : 'Qualification',
                                        value: `${Number(p.value).toFixed(1)}% (${p.payload?.converted_leads}/${p.payload?.total_leads})`,
                                    }))}
                                />
                            )}
                        />
                        <Bar dataKey="conversion_rate" fill="var(--color-conversion_rate)" radius={[0, 3, 3, 0]} name="conversion_rate" />
                        <Bar dataKey="qualification_rate" fill="var(--color-qualification_rate)" radius={[0, 3, 3, 0]} name="qualification_rate" />
                    </BarChart>
                </ChartContainer>

                <div className="mt-3 overflow-x-auto border-t pt-3">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-muted-foreground">
                                <th className="pb-2 text-left font-medium">Program</th>
                                <th className="pb-2 text-right font-medium">Leads</th>
                                <th className="pb-2 text-right font-medium">Won</th>
                                <th className="pb-2 text-right font-medium">Rate</th>
                                <th className="pb-2 text-right font-medium">WoW</th>
                                <th className="pb-2 text-right font-medium">Cycle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sortedData.map((p) => (
                                <tr key={p.program_code} className="hover:bg-muted/30 transition-colors">
                                    <td className="py-1.5 pr-2">
                                        <span className="font-medium">{p.program_code}</span>
                                        <span className="ml-1.5 text-muted-foreground">{p.program_name}</span>
                                    </td>
                                    <td className="py-1.5 text-right tabular-nums">{p.total_leads}</td>
                                    <td className="py-1.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">{p.converted_leads}</td>
                                    <td className="py-1.5 text-right tabular-nums font-medium">{p.conversion_rate.toFixed(1)}%</td>
                                    <td className="py-1.5 text-right tabular-nums">
                                        <span className="flex items-center justify-end gap-0.5">
                                            {getTrend(p.program_code)}
                                            {getTrendText(p.program_code)}
                                        </span>
                                    </td>
                                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{Math.round(p.avg_conversion_days)}d</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 border-t pt-3">
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Best</p>
                        <p className="text-sm font-semibold">{data.best_program?.program_code}</p>
                        <p className="text-xs text-muted-foreground">{data.best_program?.conversion_rate?.toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Leads</p>
                        <p className="text-sm font-semibold tabular-nums">{data.total_leads.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{data.total_converted} converted</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Overall</p>
                        <p className="text-sm font-semibold">{data.overall_conversion_rate.toFixed(1)}%</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
