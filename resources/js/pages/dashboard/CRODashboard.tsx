import { DashboardOverview, useUserPerformance } from '@/hooks/useDashboard';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatMetricCard } from '@/components/dashboard/StatMetricCard';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { CHART_COLORS, CHART_PRESETS } from '@/lib/dashboard-colors';
import {
    Users,
    CheckCircle,
    Clock,
    AlertCircle,
    TrendingUp,
    Target,
    Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { router, usePage } from '@inertiajs/react';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface CRODashboardProps {
    data?: DashboardOverview;
    isLoading?: boolean;
}

export function CRODashboard({ data, isLoading }: CRODashboardProps) {
    const myLeads = data?.my_leads || {};
    const myTasks = data?.my_tasks || {};
    const myPerformance = data?.my_performance || {};
    const hotLeads = data?.hot_leads || [];

    const { props } = usePage();
    const userId = (props.auth as any)?.user?.id;

    // Fetch personal performance data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: performanceData, isLoading: performanceLoading } = useUserPerformance({
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        user_id: userId,
    });

    // Transform data for charts
    const qualificationTrend = performanceData?.map((perf: any) => ({
        date: new Date(perf.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rate: Number(perf.qualification_rate) || 0,
    })) || [];

    const activityTrend = performanceData?.map((perf: any) => ({
        date: new Date(perf.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        activities: Number(perf.total_activities) || 0,
        calls: Number(perf.calls_made) || 0,
        emails: Number(perf.emails_sent) || 0,
    })) || [];

    const qualificationChartConfig = {
        rate: {
            label: 'Qualification Rate (%)',
            color: CHART_COLORS.indigo.DEFAULT,
        },
    } satisfies ChartConfig;

    const activityChartConfig = {
        activities: {
            label: 'Total Activities',
            color: CHART_PRESETS.activity.primary,
        },
    } satisfies ChartConfig;

    return (
        <div className="p-8 space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">CRO Dashboard</h1>
                <p className="text-muted-foreground">
                    Your leads, tasks, and performance metrics
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Assigned Leads"
                    value={formatNumber(myLeads.assigned)}
                    icon={Users}
                    color="blue"
                    onClick={() => router.visit('/leads?filter=my-assigned')}
                />
                <StatCard
                    label="Pending Qualification"
                    value={formatNumber(myLeads.pending_qualification)}
                    icon={Clock}
                    color="yellow"
                    onClick={() => router.visit('/leads?filter=pending-qualification')}
                />
                <StatCard
                    label="Qualified Today"
                    value={formatNumber(myLeads.qualified_today)}
                    icon={CheckCircle}
                    color="green"
                />
                <StatCard
                    label="Overdue Tasks"
                    value={formatNumber(myTasks.overdue)}
                    icon={AlertCircle}
                    color="red"
                    onClick={() => router.visit('/tasks?filter=overdue')}
                />
            </div>

            {/* Performance Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
                <StatMetricCard
                    title="Qualification Rate"
                    value={formatPercent(myPerformance.qualification_rate)}
                    delta={myPerformance.qualification_delta}
                    lastValue={myPerformance.last_qualification_rate ? formatPercent(myPerformance.last_qualification_rate) : undefined}
                    positive={(myPerformance.qualification_delta || 0) >= 0}
                    isLoading={isLoading}
                    icon={Target}
                />
                <StatMetricCard
                    title="Task Completion"
                    value={formatPercent(myPerformance.task_completion_accuracy)}
                    delta={myPerformance.task_delta}
                    lastValue={myPerformance.last_task_completion ? formatPercent(myPerformance.last_task_completion) : undefined}
                    positive={(myPerformance.task_delta || 0) >= 0}
                    isLoading={isLoading}
                    icon={CheckCircle}
                />
                <StatMetricCard
                    title="Total Activities"
                    value={formatNumber(myPerformance.total_activities)}
                    delta={myPerformance.activities_delta}
                    lastValue={myPerformance.last_activities ? formatNumber(myPerformance.last_activities) : undefined}
                    positive={(myPerformance.activities_delta || 0) >= 0}
                    isLoading={isLoading}
                    icon={TrendingUp}
                />
            </div>

            {/* Performance Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Qualification Rate Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            My Qualification Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {performanceLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : qualificationTrend.length > 0 ? (
                            <ChartContainer config={qualificationChartConfig} className="h-[300px] w-full">
                                <LineChart
                                    data={qualificationTrend}
                                    margin={{ top: 10, left: 0, right: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey="date"
                                        className="text-xs"
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis
                                        className="text-xs"
                                        tick={{ fontSize: 12 }}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Line
                                        type="monotone"
                                        dataKey="rate"
                                        stroke="var(--color-rate)"
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 5 }}
                                    />
                                </LineChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No performance data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Activity Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            My Daily Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {performanceLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : activityTrend.length > 0 ? (
                            <ChartContainer config={activityChartConfig} className="h-[300px] w-full">
                                <AreaChart
                                    data={activityTrend}
                                    margin={{ top: 10, left: 0, right: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-activities)" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="var(--color-activities)" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey="date"
                                        className="text-xs"
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis
                                        className="text-xs"
                                        tick={{ fontSize: 12 }}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area
                                        type="monotone"
                                        dataKey="activities"
                                        stroke="var(--color-activities)"
                                        fill="url(#activityGradient)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No activity data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Hot Leads */}
            {hotLeads.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            Hot Leads Requiring Attention
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {hotLeads.map((lead: any) => (
                                <div
                                    key={lead.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                                    onClick={() => router.visit(`/leads/${lead.id}`)}
                                >
                                    <div className="flex-1">
                                        <p className="font-medium">{lead.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {lead.email}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                lead.priority === 'high'
                                                    ? 'destructive'
                                                    : 'secondary'
                                            }
                                        >
                                            {lead.priority}
                                        </Badge>
                                        <Badge variant="outline">
                                            Score: {lead.lead_score}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Today's Tasks */}
            {myTasks.today && myTasks.today > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Today's Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold">{myTasks.today}</p>
                            <button
                                onClick={() => router.visit('/tasks?filter=today')}
                                className="text-sm text-primary hover:underline"
                            >
                                View all tasks →
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}