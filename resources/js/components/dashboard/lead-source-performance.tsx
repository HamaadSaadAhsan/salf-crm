import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLeadSourcePerformance } from '@/hooks/useDashboard';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';

type Period = 7 | 14 | 30 | 60 | 90;

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

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Lead Source Performance</CardTitle>
                    <CardDescription className="mt-1">Quality scoring and conversion rates by source</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[450px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Lead Source Performance</CardTitle>
                    <CardDescription className="mt-1">Quality scoring and conversion rates by source</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[450px] items-center justify-center text-muted-foreground">
                        Error loading source performance data
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.source_performance.length === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Lead Source Performance</CardTitle>
                    <CardDescription className="mt-1">Quality scoring and conversion rates by source</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[450px] items-center justify-center text-muted-foreground">
                        No source performance data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const chartConfig = {
        conversion_rate: {
            label: 'Conversion Rate',
            color: '#3b82f6',
        },
        quality_score: {
            label: 'Quality Score',
            color: '#10b981',
        },
    };

    // Sort by quality score descending
    const sortedData = [...data.source_performance].sort((a, b) => b.quality_score - a.quality_score);

    const chartData = sortedData.map((item) => ({
        source: item.source_name,
        conversion_rate: item.conversion_rate,
        quality_score: item.quality_score,
        total_leads: item.total_leads,
        converted_leads: item.converted_leads,
        avg_response_time: item.avg_response_time_minutes,
        estimated_roi: item.estimated_roi,
    }));

    const getQualityBadge = (score: number) => {
        if (score >= 80) return <Badge variant="default" className="bg-green-500">Excellent</Badge>;
        if (score >= 60) return <Badge variant="default" className="bg-blue-500">Good</Badge>;
        if (score >= 40) return <Badge variant="default" className="bg-orange-500">Fair</Badge>;
        return <Badge variant="destructive">Needs Attention</Badge>;
    };

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${Math.round(minutes)}m`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    return (
        <Card>
            <CardHeader className="min-h-auto py-6 border-0">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-xl font-semibold">Lead Source Performance</CardTitle>
                        <CardDescription className="mt-1">
                            Quality scoring & conversion across {data.source_performance.length} sources - Last {period} days
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
                {/* Chart */}
                <ChartContainer config={chartConfig} className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="source"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                                interval={0}
                            />
                            <YAxis
                                yAxisId="left"
                                domain={[0, 100]}
                                label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft' }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={[0, 100]}
                                label={{ value: 'Quality Score', angle: 90, position: 'insideRight' }}
                            />
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(value) => `Source: ${value}`}
                                        formatter={(value: number, name, props) => {
                                            if (name === 'conversion_rate') {
                                                return [
                                                    <>
                                                        {value.toFixed(1)}% ({props.payload.converted_leads}/{props.payload.total_leads} leads)
                                                    </>,
                                                    'Conversion Rate',
                                                ];
                                            }
                                            if (name === 'quality_score') {
                                                return [
                                                    <>
                                                        {value.toFixed(0)}/100
                                                    </>,
                                                    'Quality Score',
                                                ];
                                            }
                                            return [value, name];
                                        }}
                                    />
                                }
                            />
                            <Legend />
                            <Bar
                                yAxisId="left"
                                dataKey="conversion_rate"
                                fill={chartConfig.conversion_rate.color}
                                name="Conversion Rate (%)"
                                radius={[8, 8, 0, 0]}
                            />
                            <Bar
                                yAxisId="right"
                                dataKey="quality_score"
                                fill={chartConfig.quality_score.color}
                                name="Quality Score"
                                radius={[8, 8, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>

                {/* Source Details Table */}
                <div className="mt-6 border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3">Source Details</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {sortedData.map((source) => (
                            <div
                                key={source.source_id}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{source.source_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {source.total_leads} leads • {source.converted_leads} converted
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{source.conversion_rate.toFixed(1)}%</p>
                                        <p className="text-xs text-muted-foreground">conversion</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{formatTime(source.avg_response_time_minutes)}</p>
                                        <p className="text-xs text-muted-foreground">avg response</p>
                                    </div>
                                    <div className="text-right min-w-[80px]">
                                        {getQualityBadge(source.quality_score)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Best Source</p>
                        <p className="font-medium">
                            {data.best_source?.source_name} ({data.best_source?.conversion_rate?.toFixed(1)}%)
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Worst Source</p>
                        <p className="font-medium">
                            {data.worst_source?.source_name} ({data.worst_source?.conversion_rate?.toFixed(1)}%)
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Overall Conversion</p>
                        <p className="font-medium">
                            {data.overall_conversion_rate.toFixed(1)}% ({data.total_converted}/{data.total_leads})
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}