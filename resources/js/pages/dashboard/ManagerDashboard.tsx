import { DashboardOverview, useDailyMetrics, useUserPerformance } from '@/hooks/useDashboard';
import { StatMetricCard } from '@/components/dashboard/StatMetricCard';
import { formatNumber, formatPercent, formatTime } from '@/lib/dashboard-utils';
import { CHART_COLORS, CHART_PRESETS } from '@/lib/dashboard-colors';
import { Users, TrendingUp, CheckCircle, Target, Award, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip } from '@/components/ui/chart';
import { NightTooltip } from '@/components/dashboard/night-tooltip';
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { format } from 'date-fns';

interface ManagerDashboardProps {
    data?: DashboardOverview;
    isLoading?: boolean;
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

const roleAccentColors: Record<string, string> = {
    advisor: 'bg-blue-500',
    manager: 'bg-violet-500',
    cro: 'bg-emerald-500',
    processing: 'bg-amber-500',
};

export function ManagerDashboard({ data, isLoading }: ManagerDashboardProps) {
    const { auth } = usePage<SharedData>().props;
    const kpis = data?.kpis || {};
    const teamPerformance = data?.team_performance || {};
    const responseTimes = data?.response_times || {};

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyMetrics, isLoading: metricsLoading } = useDailyMetrics({
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
    });

    const { data: userPerformance, isLoading: performanceLoading } = useUserPerformance({
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
    });

    const teamPerformanceData = userPerformance?.slice(0, 10).map((perf: any) => ({
        name: perf.user?.name || 'Unknown',
        conversionRate: Number(perf.conversion_rate) || 0,
        taskAccuracy: Number(perf.task_completion_accuracy) || 0,
    })) || [];

    const conversionTrendData = dailyMetrics?.map((metric: any) => ({
        date: new Date(metric.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rate: Number(metric.overall_conversion_rate) || 0,
    })) || [];

    const teamChartConfig = {
        conversionRate: {
            label: 'Conversion Rate (%)',
            color: CHART_COLORS.violet.DEFAULT,
        },
        taskAccuracy: {
            label: 'Task Accuracy (%)',
            color: CHART_COLORS.emerald.DEFAULT,
        },
    } satisfies ChartConfig;

    const conversionChartConfig = {
        rate: {
            label: 'Conversion Rate (%)',
            color: CHART_PRESETS.success.primary,
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
                        {format(new Date(), 'EEEE, MMMM d, yyyy')} · Team performance and conversion metrics
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatMetricCard
                    title="Total Leads"
                    value={formatNumber(kpis.total_leads)}
                    delta={kpis.leads_delta}
                    lastValue={kpis.last_month_leads ? formatNumber(kpis.last_month_leads) : undefined}
                    positive={(kpis.leads_delta || 0) >= 0}
                    isLoading={isLoading}
                    icon={Users}
                />
                <StatMetricCard
                    title="Conversion Rate"
                    value={formatPercent(kpis.conversion_rate)}
                    delta={kpis.conversion_delta}
                    lastValue={kpis.last_month_conversion ? formatPercent(kpis.last_month_conversion) : undefined}
                    positive={(kpis.conversion_delta || 0) >= 0}
                    isLoading={isLoading}
                    icon={TrendingUp}
                />
                <StatMetricCard
                    title="Qualified Leads"
                    value={formatNumber(kpis.qualified_leads)}
                    delta={kpis.qualified_delta}
                    lastValue={kpis.last_month_qualified ? formatNumber(kpis.last_month_qualified) : undefined}
                    positive={(kpis.qualified_delta || 0) >= 0}
                    isLoading={isLoading}
                    icon={Target}
                />
                <StatMetricCard
                    title="Converted Leads"
                    value={formatNumber(kpis.converted_leads)}
                    delta={kpis.converted_delta}
                    lastValue={kpis.last_month_converted ? formatNumber(kpis.last_month_converted) : undefined}
                    positive={(kpis.converted_delta || 0) >= 0}
                    isLoading={isLoading}
                    icon={CheckCircle}
                />
            </div>

            {Object.keys(teamPerformance).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold">Team Performance by Role</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {Object.entries(teamPerformance).map(([role, stats]: [string, any]) => (
                                <div key={role} className="flex items-center gap-4 px-5 py-3.5">
                                    <div className={`h-8 w-1 shrink-0 rounded-full ${roleAccentColors[role] ?? 'bg-muted-foreground'}`} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium capitalize">{role}</p>
                                        <p className="text-xs text-muted-foreground">{stats.count} member{stats.count !== 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6 text-right">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Avg Conversion</p>
                                            <p className="text-sm font-semibold tabular-nums">{formatPercent(stats.avg_conversion_rate)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Total Converted</p>
                                            <p className="text-sm font-semibold tabular-nums">{formatNumber(stats.total_converted)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Clock className="size-4 text-muted-foreground" />
                        Average Response Times
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">First Response Time</p>
                            <p className="text-2xl font-bold tabular-nums">{formatTime(responseTimes.avg_first_response)}</p>
                            <p className="text-xs text-muted-foreground">Time to initial contact</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Qualification Time</p>
                            <p className="text-2xl font-bold tabular-nums">{formatTime(responseTimes.avg_qualification)}</p>
                            <p className="text-xs text-muted-foreground">Time to qualify lead</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <Award className="size-4 text-muted-foreground" />
                            Team Performance Leaderboard
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {performanceLoading ? (
                            <Skeleton className="h-[250px] sm:h-[300px] lg:h-[340px] w-full" />
                        ) : teamPerformanceData.length > 0 ? (
                            <ChartContainer config={teamChartConfig} className="h-[250px] sm:h-[300px] lg:h-[340px] w-full">
                                <BarChart data={teamPerformanceData} layout="vertical" margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis type="number" className="text-xs" tick={{ fontSize: 12 }} />
                                    <YAxis type="category" dataKey="name" className="text-xs" tick={{ fontSize: 11 }} width={100} />
                                    <ChartTooltip content={(props: any) => <NightTooltip {...props} />} />
                                    <Legend />
                                    <Bar dataKey="conversionRate" fill="var(--color-conversionRate)" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="taskAccuracy" fill="var(--color-taskAccuracy)" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[250px] sm:h-[300px] lg:h-[340px] flex items-center justify-center text-sm text-muted-foreground">
                                No team performance data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <TrendingUp className="size-4 text-muted-foreground" />
                            Team Conversion Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metricsLoading ? (
                            <Skeleton className="h-[250px] sm:h-[300px] lg:h-[340px] w-full" />
                        ) : conversionTrendData.length > 0 ? (
                            <ChartContainer config={conversionChartConfig} className="h-[250px] sm:h-[300px] lg:h-[340px] w-full">
                                <LineChart data={conversionTrendData} margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                                    <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                                    <ChartTooltip content={(props: any) => <NightTooltip {...props} />} />
                                    <Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                </LineChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[250px] sm:h-[300px] lg:h-[340px] flex items-center justify-center text-sm text-muted-foreground">
                                No conversion data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
