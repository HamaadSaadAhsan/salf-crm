import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { NightTooltip } from '@/components/dashboard/night-tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useRevenuePipeline } from '@/hooks/useDashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

export function RevenuePipeline() {
    const { data, isLoading, error } = useRevenuePipeline();

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Revenue Pipeline</CardTitle>
                    <CardDescription className="mt-1">Pipeline value by stage</CardDescription>
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
                    <CardTitle className="text-xl font-semibold">Revenue Pipeline</CardTitle>
                    <CardDescription className="mt-1">Pipeline value by stage</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                        Error loading pipeline data
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.pipeline_data.length === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Revenue Pipeline</CardTitle>
                    <CardDescription className="mt-1">Pipeline value by stage</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                        No pipeline data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const formatValue = (value: number) => {
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        }
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(0)}K`;
        }
        return `$${value}`;
    };

    const chartConfig = {
        value: {
            label: 'Pipeline Value',
        },
    };

    return (
        <Card>
            <CardHeader className="min-h-auto py-6 border-0">
                <CardTitle className="text-xl font-semibold">Revenue Pipeline</CardTitle>
                <CardDescription className="mt-1">
                    Total Pipeline Value: <span className="font-bold">{formatValue(data.total_value)}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <ChartContainer config={chartConfig} className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.pipeline_data} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis
                                type="number"
                                tickFormatter={formatValue}
                            />
                            <YAxis
                                type="category"
                                dataKey="stage"
                                width={100}
                            />
                            <ChartTooltip
                                content={(props: any) => (
                                    <NightTooltip
                                        {...props}
                                        labelFormatter={(v) => `Stage: ${v}`}
                                        valueFormatter={(v) => formatValue(Number(v))}
                                    />
                                )}
                            />
                            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                {data.pipeline_data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    {data.pipeline_data.map((stage) => (
                        <div key={stage.stage} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-3 w-3 rounded-sm"
                                    style={{ backgroundColor: stage.color }}
                                />
                                <span className="text-muted-foreground">{stage.stage}</span>
                            </div>
                            <span className="font-medium">
                                {stage.count} ({formatValue(stage.value)})
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
