import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useProgramPerformance } from '@/hooks/useDashboard';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Period = 7 | 14 | 30 | 60 | 90 | 180 | 365;

export function ProgramPerformance() {
    const [period, setPeriod] = useState<Period>(90);
    const { data, isLoading, error } = useProgramPerformance(period);

    const periods: { value: Period; label: string }[] = [
        { value: 7, label: '7D' },
        { value: 14, label: '14D' },
        { value: 30, label: '1M' },
        { value: 60, label: '2M' },
        { value: 90, label: '3M' },
        { value: 180, label: '6M' },
        { value: 365, label: '1Y' },
    ];

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Program Performance</CardTitle>
                    <CardDescription className="mt-1">Multi-country program tracking and conversion rates</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[500px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Program Performance</CardTitle>
                    <CardDescription className="mt-1">Multi-country program tracking and conversion rates</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[500px] items-center justify-center text-muted-foreground">
                        Error loading program performance data
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.program_performance.length === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Program Performance</CardTitle>
                    <CardDescription className="mt-1">Multi-country program tracking and conversion rates</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[500px] items-center justify-center text-muted-foreground">
                        No program performance data available
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
        qualification_rate: {
            label: 'Qualification Rate',
            color: '#10b981',
        },
        loss_rate: {
            label: 'Loss Rate',
            color: '#ef4444',
        },
    };

    // Sort by conversion rate descending
    const sortedData = [...data.program_performance].sort((a, b) => b.conversion_rate - a.conversion_rate);

    const chartData = sortedData.map((item) => ({
        program: `${item.program_name}`,
        conversion_rate: item.conversion_rate,
        qualification_rate: item.qualification_rate,
        loss_rate: item.loss_rate,
        total_leads: item.total_leads,
        converted_leads: item.converted_leads,
        avg_conversion_days: item.avg_conversion_days,
    }));

    const getPerformanceBadge = (rate: number) => {
        if (rate >= 40) return <Badge variant="default" className="bg-green-500">Excellent</Badge>;
        if (rate >= 25) return <Badge variant="default" className="bg-blue-500">Good</Badge>;
        if (rate >= 15) return <Badge variant="default" className="bg-orange-500">Fair</Badge>;
        return <Badge variant="destructive">Needs Improvement</Badge>;
    };

    const getTrendIcon = (programCode: string) => {
        const trend = data.program_trends[programCode];
        if (!trend || trend === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
        if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
        return <TrendingDown className="h-4 w-4 text-red-500" />;
    };

    const getTrendText = (programCode: string) => {
        const trend = data.program_trends[programCode];
        if (!trend || trend === 0) return 'No change';
        if (trend > 0) return `+${trend.toFixed(1)}%`;
        return `${trend.toFixed(1)}%`;
    };

    return (
        <Card>
            <CardHeader className="min-h-auto py-6 border-0">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-xl font-semibold">Program Performance</CardTitle>
                        <CardDescription className="mt-1">
                            Tracking {data.programs_count} programs - Last {period} days
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
                {/* Conversion Rate Comparison Chart */}
                <div className="mb-6">
                    <h4 className="text-sm font-semibold mb-3">Conversion Rate Comparison</h4>
                    <ChartContainer config={chartConfig} className="h-[300px]">
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
                                    dataKey="program"
                                    width={120}
                                />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            labelFormatter={(value) => `Program: ${value}`}
                                            formatter={(value: number, name, props) => {
                                                if (name === 'conversion_rate') {
                                                    return [
                                                        <>
                                                            {value.toFixed(1)}% ({props.payload.converted_leads}/{props.payload.total_leads} leads)
                                                        </>,
                                                        'Conversion Rate',
                                                    ];
                                                }
                                                return [value, name];
                                            }}
                                        />
                                    }
                                />
                                <Legend />
                                <Bar
                                    dataKey="conversion_rate"
                                    fill={chartConfig.conversion_rate.color}
                                    name="Conversion Rate (%)"
                                    radius={[0, 8, 8, 0]}
                                />
                                <Bar
                                    dataKey="qualification_rate"
                                    fill={chartConfig.qualification_rate.color}
                                    name="Qualification Rate (%)"
                                    radius={[0, 8, 8, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>

                {/* Program Details */}
                <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3">Program Details</h4>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {sortedData.map((program) => (
                            <div
                                key={program.program_code}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm">{program.program_name}</p>
                                            <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
                                                {program.program_code}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {program.total_leads} leads • {program.converted_leads} converted • {program.active_leads} active
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1">
                                            {getTrendIcon(program.program_code)}
                                            <p className="text-sm font-medium">{program.conversion_rate.toFixed(1)}%</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {getTrendText(program.program_code)} WoW
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{Math.round(program.avg_conversion_days)}d</p>
                                        <p className="text-xs text-muted-foreground">avg cycle</p>
                                    </div>
                                    <div className="text-right min-w-[120px]">
                                        {getPerformanceBadge(program.conversion_rate)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Best Program</p>
                        <p className="font-medium">
                            {data.best_program?.program_name} ({data.best_program?.conversion_rate?.toFixed(1)}%)
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Total Leads</p>
                        <p className="font-medium">
                            {data.total_leads.toLocaleString()} ({data.total_converted} converted)
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Overall Conversion</p>
                        <p className="font-medium">
                            {data.overall_conversion_rate.toFixed(1)}%
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}