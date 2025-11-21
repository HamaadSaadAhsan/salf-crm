import { DashboardOverview, useDailyMetrics, useUserPerformance } from '@/hooks/useDashboard';
import { StatMetricCard } from '@/components/dashboard/StatMetricCard';
import { formatNumber, formatPercent, formatTime } from '@/lib/dashboard-utils';
import { CHART_COLORS, CHART_PRESETS, getSeriesColor } from '@/lib/dashboard-colors';
import { Users, TrendingUp, CheckCircle, Target, Award, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface ManagerDashboardProps {
    data?: DashboardOverview;
    isLoading?: boolean;
}

export function ManagerDashboard({ data, isLoading }: ManagerDashboardProps) {
    const kpis = data?.kpis || {};
    const teamPerformance = data?.team_performance || {};
    const responseTimes = data?.response_times || {};

    // Fetch metrics for charts
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

    // Transform data for team performance chart
    const teamPerformanceData = userPerformance?.slice(0, 10).map((perf: any) => ({
        name: perf.user?.name || 'Unknown',
        conversionRate: Number(perf.conversion_rate) || 0,
        qualificationRate: Number(perf.qualification_rate) || 0,
        taskAccuracy: Number(perf.task_completion_accuracy) || 0,
    })) || [];

    // Transform daily conversion rate
    const conversionTrendData = dailyMetrics?.map((metric: any) => ({
        date: new Date(metric.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rate: Number(metric.overall_conversion_rate) || 0,
    })) || [];

    const teamChartConfig = {
        conversionRate: {
            label: 'Conversion Rate (%)',
            color: CHART_COLORS.violet.DEFAULT,
        },
        qualificationRate: {
            label: 'Qualification Rate (%)',
            color: CHART_COLORS.cyan.DEFAULT,
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
        <div className="p-8 space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Manager Dashboard</h1>
                <p className="text-muted-foreground">
                    Team performance and conversion metrics
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

            {/* Team Performance by Role */}
            {Object.keys(teamPerformance).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Team Performance by Role</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(teamPerformance).map(([role, stats]: [string, any]) => (
                                <div
                                    key={role}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium capitalize">{role}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {stats.count} team members
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-right">
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Avg Conversion
                                            </p>
                                            <p className="text-lg font-bold">
                                                {formatPercent(stats.avg_conversion_rate)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Total Converted
                                            </p>
                                            <p className="text-lg font-bold">
                                                {formatNumber(stats.total_converted)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Response Times */}
            <Card>
                <CardHeader>
                    <CardTitle>Average Response Times</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                First Response Time
                            </p>
                            <p className="text-3xl font-bold">
                                {formatTime(responseTimes.avg_first_response)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Time to initial contact
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Qualification Time
                            </p>
                            <p className="text-3xl font-bold">
                                {formatTime(responseTimes.avg_qualification)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Time to qualify lead
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Team Performance Comparison */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5" />
                            Team Performance Leaderboard
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {performanceLoading ? (
                            <Skeleton className="h-[350px] w-full" />
                        ) : teamPerformanceData.length > 0 ? (
                            <ChartContainer config={teamChartConfig} className="h-[350px] w-full">
                                <BarChart
                                    data={teamPerformanceData}
                                    layout="vertical"
                                    margin={{ top: 10, left: 0, right: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis type="number" className="text-xs" tick={{ fontSize: 12 }} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        className="text-xs"
                                        tick={{ fontSize: 11 }}
                                        width={100}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Bar
                                        dataKey="conversionRate"
                                        fill="var(--color-conversionRate)"
                                        radius={[0, 4, 4, 0]}
                                    />
                                    <Bar
                                        dataKey="taskAccuracy"
                                        fill="var(--color-taskAccuracy)"
                                        radius={[0, 4, 4, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                                No team performance data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Conversion Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Team Conversion Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {metricsLoading ? (
                            <Skeleton className="h-[350px] w-full" />
                        ) : conversionTrendData.length > 0 ? (
                            <ChartContainer config={conversionChartConfig} className="h-[350px] w-full">
                                <LineChart
                                    data={conversionTrendData}
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
                            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                                No conversion data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
