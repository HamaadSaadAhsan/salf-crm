import { DashboardOverview, useUserPerformance } from '@/hooks/useDashboard';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatMetricCard } from '@/components/dashboard/StatMetricCard';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { CHART_COLORS, CHART_PRESETS } from '@/lib/dashboard-colors';
import { Users, TrendingUp, DollarSign, Calendar, CheckCircle, Clock, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { router, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { ChartContainer, ChartConfig, ChartTooltip } from '@/components/ui/chart';
import { NightTooltip } from '@/components/dashboard/night-tooltip';
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface AdvisorDashboardProps {
    data?: DashboardOverview;
    isLoading?: boolean;
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

export function AdvisorDashboard({ data, isLoading }: AdvisorDashboardProps) {
    const myLeads = data?.my_leads || {};
    const myTasks = data?.my_tasks || {};
    const myPerformance = data?.my_performance || {};
    const upcomingMeetings = data?.upcoming_meetings || [];

    const { auth } = usePage<SharedData>().props;
    const userId = auth.user.id;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: performanceData, isLoading: performanceLoading } = useUserPerformance({
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        user_id: userId,
    });

    const conversionTrend = performanceData?.map((perf: any) => ({
        date: new Date(perf.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rate: Number(perf.conversion_rate) || 0,
    })) || [];

    const meetingActivity = performanceData?.map((perf: any) => ({
        date: new Date(perf.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        meetings: Number(perf.meetings_held) || 0,
        calls: Number(perf.calls_made) || 0,
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
    } satisfies ChartConfig;

    return (
        <div className="space-y-8 p-4 sm:p-6 lg:p-8">

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {getGreeting()}, {auth.user.name.split(' ')[0]}
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {format(new Date(), 'EEEE, MMMM d, yyyy')} · Your qualified leads and pipeline
                    </p>
                </div>
            </div>

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

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <Target className="size-4 text-muted-foreground" />
                            My Conversion Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {performanceLoading ? (
                            <Skeleton className="h-[200px] sm:h-[250px] lg:h-[280px] w-full" />
                        ) : conversionTrend.length > 0 ? (
                            <ChartContainer config={conversionChartConfig} className="h-[200px] sm:h-[250px] lg:h-[280px] w-full">
                                <LineChart data={conversionTrend} margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                                    <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                                    <ChartTooltip content={(props: any) => <NightTooltip {...props} />} />
                                    <Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                </LineChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[200px] sm:h-[250px] lg:h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                                No conversion data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <Calendar className="size-4 text-muted-foreground" />
                            My Activity Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {performanceLoading ? (
                            <Skeleton className="h-[200px] sm:h-[250px] lg:h-[280px] w-full" />
                        ) : meetingActivity.length > 0 ? (
                            <ChartContainer config={activityChartConfig} className="h-[200px] sm:h-[250px] lg:h-[280px] w-full">
                                <BarChart data={meetingActivity.slice(-14)} margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                                    <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                                    <ChartTooltip content={(props: any) => <NightTooltip {...props} />} />
                                    <Legend />
                                    <Bar dataKey="meetings" fill="var(--color-meetings)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="calls" fill="var(--color-calls)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[200px] sm:h-[250px] lg:h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                                No activity data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {upcomingMeetings.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <Calendar className="size-4 text-muted-foreground" />
                                Upcoming Meetings
                                <Badge variant="secondary" appearance="light" size="sm" className="ml-auto">
                                    {upcomingMeetings.length}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {upcomingMeetings.slice(0, 5).map((meeting: any) => (
                                    <button
                                        key={meeting.id}
                                        type="button"
                                        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
                                        onClick={() => router.visit(`/leads/${meeting.lead_id}`)}
                                    >
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                            {(meeting.lead?.name || 'U')[0].toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{meeting.lead?.name || 'Unknown'}</p>
                                            <p className="truncate text-xs text-muted-foreground">{meeting.lead?.email}</p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-xs font-medium tabular-nums">
                                                {meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleDateString() : ''}
                                            </p>
                                            <p className="text-xs text-muted-foreground tabular-nums">
                                                {meeting.scheduled_at
                                                    ? new Date(meeting.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : ''}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {myTasks.overdue && myTasks.overdue > 0 && (
                    <Card className="border-red-200 dark:border-red-900/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <Clock className="size-4 text-red-500" />
                                Overdue Tasks
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-3xl font-bold tabular-nums text-red-500">{myTasks.overdue}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Tasks past their due date</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.visit('/tasks?filter=overdue')}
                                className="shrink-0 text-sm font-medium text-primary hover:underline"
                            >
                                View all →
                            </button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
