import { DashboardOverview, useUserPerformance } from '@/hooks/useDashboard';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatMetricCard } from '@/components/dashboard/StatMetricCard';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { CHART_COLORS, CHART_PRESETS } from '@/lib/dashboard-colors';
import {
    Users,
    TrendingUp,
    DollarSign,
    Calendar,
    CheckCircle,
    Clock,
    Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { router, usePage } from '@inertiajs/react';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface AdvisorDashboardProps {
    data?: DashboardOverview;
    isLoading?: boolean;
}

export function AdvisorDashboard({ data, isLoading }: AdvisorDashboardProps) {
    const myLeads = data?.my_leads || {};
    const myTasks = data?.my_tasks || {};
    const myPerformance = data?.my_performance || {};
    const upcomingMeetings = data?.upcoming_meetings || [];

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
    const conversionTrend = performanceData?.map((perf: any) => ({
        date: new Date(perf.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rate: Number(perf.conversion_rate) || 0,
        revenue: Number(perf.revenue_generated) || 0,
    })) || [];

    const meetingActivity = performanceData?.map((perf: any) => ({
        date: new Date(perf.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        meetings: Number(perf.meetings_held) || 0,
        calls: Number(perf.calls_made) || 0,
        emails: Number(perf.emails_sent) || 0,
    })) || [];

    const conversionChartConfig = {
        rate: {
            label: 'Conversion Rate (%)',
            color: CHART_PRESETS.success.primary,
        },
    } satisfies ChartConfig;

    const activityChartConfig = {
        meetings: {
            label: 'Meetings Held',
            color: CHART_COLORS.violet.DEFAULT,
        },
        calls: {
            label: 'Calls Made',
            color: CHART_COLORS.cyan.DEFAULT,
        },
        emails: {
            label: 'Emails Sent',
            color: CHART_COLORS.amber.DEFAULT,
        },
    } satisfies ChartConfig;

    return (
        <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:space-y-8 lg:p-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Advisor Dashboard</h1>
                <p className="text-muted-foreground">
                    Your qualified leads and conversion pipeline
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Qualified Leads"
                    value={formatNumber(myLeads.qualified_assigned)}
                    icon={Users}
                    color="blue"
                    onClick={() => router.visit('/leads?filter=my-qualified')}
                />
                <StatCard
                    label="In Proposal"
                    value={formatNumber(myLeads.in_proposal)}
                    icon={TrendingUp}
                    color="purple"
                    onClick={() => router.visit('/leads?filter=in-proposal')}
                />
                <StatCard
                    label="Converted Today"
                    value={formatNumber(myLeads.converted_today)}
                    icon={DollarSign}
                    color="green"
                />
                <StatCard
                    label="Today's Tasks"
                    value={formatNumber(myTasks.today)}
                    icon={CheckCircle}
                    color="yellow"
                    onClick={() => router.visit('/tasks?filter=today')}
                />
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <StatMetricCard
                    title="Conversion Rate"
                    value={formatPercent(myPerformance.conversion_rate)}
                    delta={myPerformance.conversion_delta}
                    lastValue={myPerformance.last_conversion_rate ? formatPercent(myPerformance.last_conversion_rate) : undefined}
                    positive={(myPerformance.conversion_delta || 0) >= 0}
                    isLoading={isLoading}
                    icon={TrendingUp}
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
                    icon={Calendar}
                />
            </div>

            {/* Performance Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Conversion Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            My Conversion Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {performanceLoading ? (
                            <Skeleton className="h-[200px] sm:h-[250px] lg:h-[300px] w-full" />
                        ) : conversionTrend.length > 0 ? (
                            <ChartContainer config={conversionChartConfig} className="h-[200px] sm:h-[250px] lg:h-[300px] w-full">
                                <LineChart
                                    data={conversionTrend}
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
                            <div className="h-[200px] sm:h-[250px] lg:h-[300px] flex items-center justify-center text-muted-foreground">
                                No conversion data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Meeting & Activity Performance */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            My Activity Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {performanceLoading ? (
                            <Skeleton className="h-[200px] sm:h-[250px] lg:h-[300px] w-full" />
                        ) : meetingActivity.length > 0 ? (
                            <ChartContainer config={activityChartConfig} className="h-[200px] sm:h-[250px] lg:h-[300px] w-full">
                                <BarChart
                                    data={meetingActivity.slice(-14)}
                                    margin={{ top: 10, left: 0, right: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey="date"
                                        className="text-xs"
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis
                                        className="text-xs"
                                        tick={{ fontSize: 12 }}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Bar
                                        dataKey="meetings"
                                        fill="var(--color-meetings)"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="calls"
                                        fill="var(--color-calls)"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[200px] sm:h-[250px] lg:h-[300px] flex items-center justify-center text-muted-foreground">
                                No activity data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Upcoming Meetings */}
                {upcomingMeetings.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Upcoming Meetings
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {upcomingMeetings.slice(0, 5).map((meeting: any) => (
                                    <div
                                        key={meeting.id}
                                        className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors sm:flex-row sm:items-start sm:justify-between sm:gap-0"
                                        onClick={() =>
                                            router.visit(`/leads/${meeting.lead_id}`)
                                        }
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">
                                                {meeting.lead?.name || 'Unknown'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {meeting.lead?.email}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">
                                                {meeting.scheduled_at
                                                    ? new Date(
                                                          meeting.scheduled_at
                                                      ).toLocaleDateString()
                                                    : ''}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {meeting.scheduled_at
                                                    ? new Date(
                                                          meeting.scheduled_at
                                                      ).toLocaleTimeString([], {
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                      })
                                                    : ''}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Overdue Tasks */}
                {myTasks.overdue && myTasks.overdue > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-red-500" />
                                Overdue Tasks
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <p className="text-2xl font-bold text-red-500 sm:text-3xl">
                                    {myTasks.overdue}
                                </p>
                                <button
                                    onClick={() => router.visit('/tasks?filter=overdue')}
                                    className="text-sm text-primary hover:underline"
                                >
                                    View overdue tasks →
                                </button>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Please review and complete these tasks
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
