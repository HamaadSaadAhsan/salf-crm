import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useProgramPerformance } from '@/hooks/useDashboard';
import { MULTI_SERIES_COLORS } from '@/lib/dashboard-colors';
import { useState } from 'react';
import { PieChart, Pie, Cell, Label } from 'recharts';

type Period = 7 | 14 | 30 | 60 | 90 | 180 | 365;

const PERIODS: { value: Period; label: string }[] = [
    { value: 30, label: '1M' },
    { value: 60, label: '2M' },
    { value: 90, label: '3M' },
    { value: 180, label: '6M' },
    { value: 365, label: '1Y' },
];

export function ProgramWonDistribution() {
    const [period, setPeriod] = useState<Period>(90);
    const { data, isLoading, error } = useProgramPerformance(period);

    const chartConfig = { count: { label: 'Won Leads' } };

    const chartData =
        data?.program_performance
            .filter((p) => p.converted_leads > 0)
            .map((p, i) => ({
                name: p.program_name,
                count: p.converted_leads,
                total: p.total_leads,
                rate: p.conversion_rate,
                fill: MULTI_SERIES_COLORS[i % MULTI_SERIES_COLORS.length],
            }))
            .sort((a, b) => b.count - a.count) || [];

    const totalWon = data?.total_converted ?? 0;

    return (
        <Card className="min-w-0">
            <CardHeader className="min-h-auto border-0 py-4 sm:py-6">
                <CardTitle className="text-base font-semibold sm:text-xl">
                    Program Distribution: LTS (Won)
                </CardTitle>
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
            <CardContent className="px-2 sm:px-6">
                {isLoading ? (
                    <Skeleton className="mx-auto h-[250px] w-[250px] rounded-full" />
                ) : error ? (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                        Error loading data
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                        No won leads in this period
                    </div>
                ) : (
                    <>
                        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[280px] w-full">
                            <PieChart>
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            className="p-3"
                                            formatter={(value, _name, props) => (
                                                <div className="flex w-full items-center justify-between gap-4">
                                                    <span className="text-muted-foreground">
                                                        {(props.payload as any).name}
                                                    </span>
                                                    <span className="font-mono font-medium tabular-nums">
                                                        {value} won / {(props.payload as any).total} total ({(props.payload as any).rate.toFixed(1)}%)
                                                    </span>
                                                </div>
                                            )}
                                        />
                                    }
                                />
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={110}
                                    paddingAngle={2}
                                    dataKey="count"
                                    nameKey="name"
                                    strokeWidth={2}
                                    stroke="hsl(var(--background))"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                    <Label
                                        content={({ viewBox }) => {
                                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                                return (
                                                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                        <tspan
                                                            x={viewBox.cx}
                                                            y={viewBox.cy}
                                                            className="fill-foreground text-2xl font-bold"
                                                        >
                                                            {totalWon.toLocaleString()}
                                                        </tspan>
                                                        <tspan
                                                            x={viewBox.cx}
                                                            y={(viewBox.cy || 0) + 20}
                                                            className="fill-muted-foreground text-xs"
                                                        >
                                                            Won Leads
                                                        </tspan>
                                                    </text>
                                                );
                                            }
                                        }}
                                    />
                                </Pie>
                            </PieChart>
                        </ChartContainer>

                        {/* Legend grid */}
                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                            {chartData.map((item) => (
                                <div
                                    key={item.name}
                                    className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{ backgroundColor: item.fill }}
                                        />
                                        <span className="truncate text-muted-foreground">{item.name}</span>
                                    </div>
                                    <span className="ml-2 shrink-0 font-medium">
                                        {item.count}
                                        <span className="ml-1 text-xs text-muted-foreground">
                                            ({item.rate.toFixed(0)}%)
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
