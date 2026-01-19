import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLeadLifecycleAnalysis } from '@/hooks/useDashboard';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Clock, Users } from 'lucide-react';

type Period = 7 | 14 | 30 | 60 | 90 | 180;

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

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Lead Lifecycle Analysis</CardTitle>
                    <CardDescription className="mt-1">Bottleneck identification and stage duration metrics</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[600px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Lead Lifecycle Analysis</CardTitle>
                    <CardDescription className="mt-1">Bottleneck identification and stage duration metrics</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[600px] items-center justify-center text-muted-foreground">
                        Error loading lifecycle analysis data
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.velocity_metrics.total_leads === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Lead Lifecycle Analysis</CardTitle>
                    <CardDescription className="mt-1">Bottleneck identification and stage duration metrics</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[600px] items-center justify-center text-muted-foreground">
                        No lifecycle analysis data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const chartConfig = {
        avg_days: {
            label: 'Average Days',
            color: '#3b82f6',
        },
    };

    const stageDurationData = data.stage_durations.map((item) => ({
        stage: item.stage,
        avg_days: item.avg_days,
    }));

    const getSeverityBadge = (severity: string) => {
        if (severity === 'critical') return <Badge variant="destructive">Critical</Badge>;
        if (severity === 'high') return <Badge variant="default" className="bg-orange-500">High</Badge>;
        if (severity === 'medium') return <Badge variant="default" className="bg-yellow-500">Medium</Badge>;
        return <Badge variant="secondary">Low</Badge>;
    };

    const getSeverityIcon = (severity: string) => {
        if (severity === 'critical' || severity === 'high') {
            return <AlertTriangle className="h-5 w-5 text-red-500" />;
        }
        if (severity === 'medium') {
            return <AlertTriangle className="h-5 w-5 text-orange-500" />;
        }
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    };

    const getBarColor = (stage: string) => {
        const stageMap: Record<string, string> = {
            'New → Contacted': '#3b82f6',
            'Contacted → Qualified': '#10b981',
            'Qualified → Converted': '#f59e0b',
        };
        return stageMap[stage] || '#6b7280';
    };

    return (
        <Card>
            <CardHeader className="min-h-auto py-6 border-0">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-xl font-semibold">Lead Lifecycle Analysis</CardTitle>
                        <CardDescription className="mt-1">
                            Stage durations and bottleneck identification - Last {period} days
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
                {/* Velocity Metrics */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                        <Users className="h-8 w-8 text-blue-500" />
                        <div>
                            <p className="text-2xl font-bold">{data.velocity_metrics.total_leads.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Total Leads</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                        <TrendingUp className="h-8 w-8 text-green-500" />
                        <div>
                            <p className="text-2xl font-bold">{data.velocity_metrics.converted_leads.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Converted</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                        <Clock className="h-8 w-8 text-orange-500" />
                        <div>
                            <p className="text-2xl font-bold">{data.velocity_metrics.avg_lifecycle_days.toFixed(1)}d</p>
                            <p className="text-xs text-muted-foreground">Avg Lifecycle</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                        <TrendingUp className="h-8 w-8 text-purple-500" />
                        <div>
                            <p className="text-2xl font-bold">{data.velocity_metrics.conversion_velocity.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Leads/Day</p>
                        </div>
                    </div>
                </div>

                {/* Stage Duration Chart */}
                <div className="mb-6">
                    <h4 className="text-sm font-semibold mb-3">Average Stage Duration</h4>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stageDurationData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="stage"
                                    angle={-15}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            labelFormatter={(value) => `Stage: ${value}`}
                                            formatter={(value: number) => [
                                                `${value.toFixed(1)} days`,
                                                'Average Duration',
                                            ]}
                                        />
                                    }
                                />
                                <Bar dataKey="avg_days" name="Average Days" radius={[8, 8, 0, 0]}>
                                    {stageDurationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getBarColor(entry.stage)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>

                {/* Bottleneck Identification */}
                {data.bottlenecks && data.bottlenecks.length > 0 && (
                    <div className="mb-6 border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            Identified Bottlenecks
                        </h4>
                        <div className="space-y-2">
                            {data.bottlenecks
                                .sort((a, b) => {
                                    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                                    return severityOrder[a.severity] - severityOrder[b.severity];
                                })
                                .map((bottleneck, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-muted"
                                    >
                                        <div className="mt-0.5">
                                            {getSeverityIcon(bottleneck.severity)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-medium text-sm">{bottleneck.stage}</p>
                                                {getSeverityBadge(bottleneck.severity)}
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                                <div>
                                                    <span className="font-medium">Expected:</span> {bottleneck.expected_days.toFixed(1)} days
                                                </div>
                                                <div>
                                                    <span className="font-medium">Actual:</span> {bottleneck.actual_avg_days.toFixed(1)} days
                                                </div>
                                                <div>
                                                    <span className="font-medium">Delay:</span>{' '}
                                                    <span className="text-red-600 dark:text-red-400 font-semibold">
                                                        +{bottleneck.delay_days.toFixed(1)} days
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium">Leads Stuck:</span>{' '}
                                                    <span className="font-semibold">{bottleneck.leads_stuck}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Stage Breakdown */}
                {data.stage_breakdown && data.stage_breakdown.length > 0 && (
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">Stage Breakdown Details</h4>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto">
                            {data.stage_breakdown.map((stage, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{stage.stage}</p>
                                        <p className="text-xs text-muted-foreground">{stage.total_leads} leads</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-right text-xs">
                                        <div>
                                            <p className="font-medium">{stage.avg_days_to_contact.toFixed(1)}d</p>
                                            <p className="text-muted-foreground">to contact</p>
                                        </div>
                                        <div>
                                            <p className="font-medium">{stage.avg_days_to_qualify.toFixed(1)}d</p>
                                            <p className="text-muted-foreground">to qualify</p>
                                        </div>
                                        <div>
                                            <p className="font-medium">{stage.avg_days_to_convert.toFixed(1)}d</p>
                                            <p className="text-muted-foreground">to convert</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
