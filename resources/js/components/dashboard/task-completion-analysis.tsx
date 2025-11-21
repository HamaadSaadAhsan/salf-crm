import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTaskCompletionAnalysis } from '@/hooks/useDashboard';
import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

type Period = 7 | 14 | 30 | 60 | 90;

interface TaskCompletionAnalysisProps {
    userId?: number;
}

export function TaskCompletionAnalysis({ userId }: TaskCompletionAnalysisProps) {
    const [period, setPeriod] = useState<Period>(30);
    const { data, isLoading, error } = useTaskCompletionAnalysis(period, userId);

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
                    <CardTitle className="text-xl font-semibold">Task Completion Analysis</CardTitle>
                    <CardDescription className="mt-1">Accuracy trends and task type breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[550px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Task Completion Analysis</CardTitle>
                    <CardDescription className="mt-1">Accuracy trends and task type breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[550px] items-center justify-center text-muted-foreground">
                        Error loading task completion data
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.overall_metrics.total_tasks === 0) {
        return (
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Task Completion Analysis</CardTitle>
                    <CardDescription className="mt-1">Accuracy trends and task type breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[550px] items-center justify-center text-muted-foreground">
                        No task completion data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    const chartConfig = {
        accuracy_rate: {
            label: 'Accuracy Rate',
            color: '#3b82f6',
        },
        completion_rate: {
            label: 'Completion Rate',
            color: '#10b981',
        },
        overdue_rate: {
            label: 'Overdue Rate',
            color: '#ef4444',
        },
    };

    const trendChartData = data.accuracy_trend.map((item) => ({
        period: item.period,
        accuracy_rate: item.accuracy_rate,
        total_tasks: item.total_tasks,
        completed_tasks: item.completed_tasks,
    }));

    const typeBreakdownData = data.task_type_breakdown.map((item) => ({
        type: item.type,
        completion_rate: item.completion_rate,
        overdue_rate: item.overdue_rate,
        total_tasks: item.total_tasks,
        completed_tasks: item.completed_tasks,
        overdue_tasks: item.overdue_tasks,
    }));

    const getPriorityBadge = (priority: string) => {
        const priorityLower = priority.toLowerCase();
        if (priorityLower === 'urgent') return <Badge variant="destructive">Urgent</Badge>;
        if (priorityLower === 'high') return <Badge variant="default" className="bg-orange-500">High</Badge>;
        if (priorityLower === 'normal') return <Badge variant="default" className="bg-blue-500">Normal</Badge>;
        return <Badge variant="secondary">Low</Badge>;
    };

    return (
        <Card>
            <CardHeader className="min-h-auto py-6 border-0">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-xl font-semibold">Task Completion Analysis</CardTitle>
                        <CardDescription className="mt-1">
                            {data.user_filtered ? 'Personal' : 'Team-wide'} task performance - Last {period} days
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
                {/* Overall Metrics */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                        <CheckCircle2 className="h-8 w-8 text-blue-500" />
                        <div>
                            <p className="text-2xl font-bold">{data.overall_metrics.accuracy_rate.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">Accuracy Rate</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                        <div>
                            <p className="text-2xl font-bold">{data.overall_metrics.on_time_rate.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">On-Time Rate</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                        <Clock className="h-8 w-8 text-orange-500" />
                        <div>
                            <p className="text-2xl font-bold">{data.overall_metrics.completed_tasks}</p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                        <div>
                            <p className="text-2xl font-bold">{data.overall_metrics.overdue_tasks}</p>
                            <p className="text-xs text-muted-foreground">Overdue</p>
                        </div>
                    </div>
                </div>

                {/* Accuracy Trend Chart */}
                <div className="mb-6">
                    <h4 className="text-sm font-semibold mb-3">Accuracy Trend (Weekly)</h4>
                    <ChartContainer config={chartConfig} className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" />
                                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            labelFormatter={(value) => `Week: ${value}`}
                                            formatter={(value: number, name, props) => {
                                                if (name === 'accuracy_rate') {
                                                    return [
                                                        <>
                                                            {value.toFixed(1)}% ({props.payload.completed_tasks}/{props.payload.total_tasks} tasks)
                                                        </>,
                                                        'Accuracy Rate',
                                                    ];
                                                }
                                                return [value, name];
                                            }}
                                        />
                                    }
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="accuracy_rate"
                                    stroke={chartConfig.accuracy_rate.color}
                                    strokeWidth={2}
                                    name="Accuracy Rate (%)"
                                    dot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>

                {/* Task Type Breakdown */}
                <div className="mb-6">
                    <h4 className="text-sm font-semibold mb-3">Task Type Breakdown</h4>
                    <ChartContainer config={chartConfig} className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typeBreakdownData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="type" />
                                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            labelFormatter={(value) => `Type: ${value}`}
                                            formatter={(value: number, name, props) => {
                                                if (name === 'completion_rate') {
                                                    return [
                                                        <>
                                                            {value.toFixed(1)}% ({props.payload.completed_tasks}/{props.payload.total_tasks} tasks)
                                                        </>,
                                                        'Completion Rate',
                                                    ];
                                                }
                                                if (name === 'overdue_rate') {
                                                    return [
                                                        <>
                                                            {value.toFixed(1)}% ({props.payload.overdue_tasks} tasks)
                                                        </>,
                                                        'Overdue Rate',
                                                    ];
                                                }
                                                return [value, name];
                                            }}
                                        />
                                    }
                                />
                                <Legend />
                                <Bar
                                    dataKey="completion_rate"
                                    fill={chartConfig.completion_rate.color}
                                    name="Completion Rate (%)"
                                    radius={[8, 8, 0, 0]}
                                />
                                <Bar
                                    dataKey="overdue_rate"
                                    fill={chartConfig.overdue_rate.color}
                                    name="Overdue Rate (%)"
                                    radius={[8, 8, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>

                {/* Overdue Analysis by Priority */}
                {data.overdue_analysis && data.overdue_analysis.length > 0 && (
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">Overdue Tasks by Priority</h4>
                        <div className="space-y-2">
                            {data.overdue_analysis.map((item) => (
                                <div
                                    key={item.priority}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {getPriorityBadge(item.priority)}
                                        <div>
                                            <p className="text-sm font-medium">{item.overdue_count} overdue tasks</p>
                                            <p className="text-xs text-muted-foreground">
                                                Avg {item.avg_days_overdue.toFixed(1)} days overdue
                                            </p>
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