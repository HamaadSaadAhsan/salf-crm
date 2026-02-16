import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useConversionByService } from '@/hooks/useDashboard';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

type Period = 7 | 14 | 30 | 60 | 90;

export function ConversionByService() {
    const [period, setPeriod] = useState<Period>(30);
    const { data, isLoading, error } = useConversionByService(period);

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
                    <CardTitle className="text-xl font-semibold">Conversion by Service</CardTitle>
                    <CardDescription className="mt-1">Conversion rates across different services</CardDescription>
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
                    <CardTitle className="text-xl font-semibold">Conversion by Service</CardTitle>
                    <CardDescription className="mt-1">Conversion rates across different services</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                        Error loading conversion data
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.conversion_data.length === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Conversion by Service</CardTitle>
                    <CardDescription className="mt-1">Conversion rates across different services</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                        No conversion data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const chartConfig = {
        conversion_rate: {
            label: 'Conversion Rate',
        },
    };

    // Color code based on conversion rate
    const getColor = (rate: number) => {
        if (rate >= 50) return '#10b981'; // Green for high conversion
        if (rate >= 30) return '#f59e0b'; // Orange for medium conversion
        if (rate >= 10) return '#3b82f6'; // Blue for low conversion
        return '#ef4444'; // Red for very low conversion
    };

    const chartData = data.conversion_data.map((item) => ({
        ...item,
        fill: getColor(item.conversion_rate),
    }));

    return (
        <Card>
            <CardHeader className="min-h-auto py-6 border-0">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-xl font-semibold">Conversion by Service</CardTitle>
                        <CardDescription className="mt-1">
                            Last {period} days - {data.conversion_data.length} services
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
                <ChartContainer config={chartConfig} className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis
                                type="number"
                                domain={[0, 100]}
                                tickFormatter={(value) => `${value}%`}
                            />
                            <YAxis
                                type="category"
                                dataKey="service"
                                width={150}
                            />
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        className="p-3"
                                        labelFormatter={(value) => `Service: ${value}`}
                                        formatter={(value: number, _name, props) => (
                                            <div className="flex w-full items-center justify-between gap-4">
                                                <span className="text-muted-foreground">Conversion Rate</span>
                                                <span className="font-mono font-medium tabular-nums">
                                                    {value.toFixed(1)}% ({props.payload.converted_leads}/{props.payload.total_leads} leads)
                                                </span>
                                            </div>
                                        )}
                                    />
                                }
                            />
                            <Bar dataKey="conversion_rate" radius={[0, 8, 8, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>

                <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Best Performing</p>
                        <p className="font-medium">
                            {chartData[0]?.service} ({chartData[0]?.conversion_rate.toFixed(1)}%)
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Needs Improvement</p>
                        <p className="font-medium">
                            {chartData[chartData.length - 1]?.service} ({chartData[chartData.length - 1]?.conversion_rate.toFixed(1)}%)
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-green-500" />
                        <span>≥50% Excellent</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-orange-500" />
                        <span>30-50% Good</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-blue-500" />
                        <span>10-30% Fair</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-red-500" />
                        <span>&lt;10% Needs Attention</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
