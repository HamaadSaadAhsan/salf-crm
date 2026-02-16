import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLeadDistribution } from '@/hooks/useDashboard';
import { useState } from 'react';
import { PieChart, Pie, Cell, Legend } from 'recharts';

type Dimension = 'source' | 'service' | 'status';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];

export function LeadDistribution() {
    const [dimension, setDimension] = useState<Dimension>('source');
    const { data, isLoading, error } = useLeadDistribution(dimension);

    const dimensions: { value: Dimension; label: string }[] = [
        { value: 'source', label: 'Source' },
        { value: 'service', label: 'Service' },
        { value: 'status', label: 'Status' },
    ];

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Lead Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[350px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Lead Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                        Error loading distribution data
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.distribution_data.length === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Lead Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                        No distribution data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const chartConfig = {
        leads: {
            label: 'Leads',
        },
    };

    const chartData = data.distribution_data.map((item, index) => ({
        ...item,
        fill: COLORS[index % COLORS.length],
    }));

    return (
        <Card>
            <CardHeader className="min-h-auto py-6 border-0">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-xl font-semibold">Lead Distribution</CardTitle>
                        <CardDescription className="mt-1">
                            Total Leads: <span className="font-bold">{data.total_leads.toLocaleString()}</span>
                        </CardDescription>
                    </div>
                </div>
                <CardToolbar className="flex items-center gap-2 flex-wrap">
                    <ToggleGroup
                        type="single"
                        value={dimension}
                        variant="outline"
                        onValueChange={(value) => value && setDimension(value as Dimension)}
                        className=""
                    >
                        {dimensions.map((d) => (
                            <ToggleGroupItem
                                key={d.value}
                                value={d.value}
                                className="px-3.5 first:rounded-s-full! last:rounded-e-full!"
                            >
                                {d.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </CardToolbar>
            </CardHeader>
            <CardContent className="px-6">
                <div className="min-h-[350px]">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="count"
                                label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                                labelLine={false}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        className="p-3"
                                        formatter={(value: number, _name, props) => (
                                            <div className="flex w-full items-center justify-between gap-4">
                                                <span className="text-muted-foreground">{props.payload.name}</span>
                                                <span className="font-mono font-medium tabular-nums">
                                                    {value} ({props.payload.percentage.toFixed(1)}%)
                                                </span>
                                            </div>
                                        )}
                                    />
                                }
                            />
                            <Legend />
                        </PieChart>
                    </ChartContainer>
                </div>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                    {chartData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-3 w-3 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: item.fill }}
                                />
                                <span className="text-muted-foreground truncate">{item.name}</span>
                            </div>
                            <span className="font-medium ml-2 whitespace-nowrap">
                                {item.count} <span className="text-xs text-muted-foreground">({item.percentage.toFixed(1)}%)</span>
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
