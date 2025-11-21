import { DashboardOverview, useDailyMetrics, useSystemAdoption } from '@/hooks/useDashboard';
import { StatMetricCard } from '@/components/dashboard/StatMetricCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { TotalRevenue } from '@/components/dashboard/total-revenue';
import { TasksOverview } from '@/components/dashboard/tasks-overview';
import { LeadsOverview } from '@/components/dashboard/leads-overview';
import { LeadAnalytics } from '@/components/dashboard/lead-analytics';
import { RevenuePipeline } from '@/components/dashboard/revenue-pipeline';
import { LeadLifecycleFunnel } from '@/components/dashboard/lead-lifecycle-funnel';
import { LeadDistribution } from '@/components/dashboard/lead-distribution';
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap';
import { ConversionByService } from '@/components/dashboard/conversion-by-service';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import { ExportButton } from '@/components/dashboard/export-button';
import { LeadSourcePerformance } from '@/components/dashboard/lead-source-performance';
import { ProgramPerformance } from '@/components/dashboard/program-performance';
import { TaskCompletionAnalysis } from '@/components/dashboard/task-completion-analysis';
import { LeadLifecycleAnalysis } from '@/components/dashboard/lead-lifecycle-analysis';
import { formatNumber, formatPercent, formatTime } from '@/lib/dashboard-utils';
import { CHART_COLORS, CHART_PRESETS } from '@/lib/dashboard-colors';
import { format } from 'date-fns';
import {
    Users,
    TrendingUp,
    Target,
    CheckCircle,
    Clock,
    Activity,
    BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface SuperAdminDashboardProps {
    data?: DashboardOverview;
    isLoading?: boolean;
}

export function SuperAdminDashboard({ data, isLoading }: SuperAdminDashboardProps) {
    const kpis = data?.kpis || {};
    const responseTimes = data?.response_times || {};
    const lifecycle = data?.lifecycle || {};
    const revenue = data?.revenue || {};
    const tasks = data?.tasks_overview || {};

    // Fetch metrics data for charts
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyMetrics, isLoading: metricsLoading } = useDailyMetrics({
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
    });

    const { data: systemAdoption, isLoading: adoptionLoading } = useSystemAdoption({
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
    });

    // Transform daily metrics for charts
    const conversionChartData = dailyMetrics?.map((metric: any) => ({
        date: new Date(metric.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rate: Number(metric.overall_conversion_rate) || 0,
        qualified: metric.qualified_leads || 0,
        converted: metric.converted_leads || 0,
    })) || [];

    const leadVolumeData = dailyMetrics?.map((metric: any) => ({
        date: new Date(metric.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: metric.total_leads || 0,
        new: metric.new_leads_today || 0,
    })) || [];

    const systemAdoptionData = systemAdoption?.map((metric: any) => ({
        date: new Date(metric.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        activeUsers: metric.active_users || 0,
        adoptionRate: Number(metric.adoption_rate) || 0,
    })) || [];

    const conversionChartConfig = {
        rate: {
            label: 'Conversion Rate (%)',
            color: CHART_PRESETS.success.primary,
        },
    } satisfies ChartConfig;

    const leadVolumeConfig = {
        total: {
            label: 'Total Leads',
            color: CHART_COLORS.blue.DEFAULT,
        },
        new: {
            label: 'New Leads',
            color: CHART_PRESETS.growth.primary,
        },
    } satisfies ChartConfig;

    const adoptionConfig = {
        activeUsers: {
            label: 'Active Users',
            color: CHART_PRESETS.team.primary,
        },
        adoptionRate: {
            label: 'Adoption Rate (%)',
            color: CHART_COLORS.violet.DEFAULT,
        },
    } satisfies ChartConfig;

    return (
        <div className="p-8 space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    System-wide overview and key performance indicators
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
                    title="Lead Score"
                    value={formatPercent(kpis.lead_conversion_score)}
                    delta={kpis.score_delta}
                    lastValue={kpis.last_month_score ? formatPercent(kpis.last_month_score) : undefined}
                    positive={(kpis.score_delta || 0) >= 0}
                    isLoading={isLoading}
                    icon={Target}
                />
                <StatMetricCard
                    title="Task Completion"
                    value={formatPercent(kpis.task_completion_rate)}
                    delta={kpis.task_delta}
                    lastValue={kpis.last_month_task_completion ? formatPercent(kpis.last_month_task_completion) : undefined}
                    positive={(kpis.task_delta || 0) >= 0}
                    isLoading={isLoading}
                    icon={CheckCircle}
                />
            </div>

            {/* System Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    label="Active Users"
                    value={formatNumber(kpis.active_users)}
                    icon={Users}
                    color="green"
                />
                <StatCard
                    label="System Adoption"
                    value={formatPercent(kpis.system_adoption_rate)}
                    icon={Activity}
                    color="blue"
                />
                <StatCard
                    label="Avg Lifecycle"
                    value={`${lifecycle.average_days || 0} days`}
                    icon={Clock}
                    color="purple"
                />
            </div>

            {/* Leads Overview and Lead Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-2">
                    <LeadsOverview />
                </div>
                <div className="col-span-1">
                    <LeadAnalytics />
                </div>
            </div>

            {/* Revenue and Tasks Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TotalRevenue
                    revenue={revenue.total || 0}
                    delta={revenue.delta || 0}
                    avgDealValue={revenue.avg_deal_value || 0}
                    activeDeals={revenue.active_deals || 0}
                    isLoading={isLoading}
                />
                <TasksOverview
                    data={{
                        completed: tasks.completed || 0,
                        followUps: tasks.follow_ups || 0,
                        inProgress: tasks.in_progress || 0,
                        pending: tasks.pending || 0,
                        total: tasks.total || 0,
                        completionRate: tasks.completion_rate || 0,
                    }}
                    isLoading={isLoading}
                />
            </div>

            {/* Response Times */}
            <Card>
                <CardHeader className="min-h-auto py-6 border-0">
                    <CardTitle className="text-xl font-semibold">Response Times</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                First Response
                            </p>
                            <p className="text-2xl font-bold">
                                {formatTime(responseTimes.avg_first_response)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Marketing → CRO
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Qualification Time
                            </p>
                            <p className="text-2xl font-bold">
                                {formatTime(responseTimes.avg_qualification)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                CRO → Qualified
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Conversion Time
                            </p>
                            <p className="text-2xl font-bold">
                                {formatTime(responseTimes.avg_conversion)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Lead → Conversion
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Conversion Rate Trend */}
                <Card id="conversion-rate-trend-chart">
                    <CardHeader className="min-h-auto py-6 border-0">
                        <div className="flex items-start justify-between flex-wrap gap-4">
                            <CardTitle className="text-xl font-semibold">Conversion Rate Trend</CardTitle>
                        </div>
                        <CardToolbar className="flex items-center gap-2 flex-wrap">
                            <ExportButton
                                data={conversionChartData}
                                elementId="conversion-rate-trend-chart"
                                filename={`conversion-rate-trend-${format(new Date(), 'yyyy-MM-dd')}`}
                                title="Conversion Rate Trend"
                                formats={['csv', 'png', 'pdf']}
                                variant="outline"
                                size="sm"
                            />
                        </CardToolbar>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {metricsLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : conversionChartData.length > 0 ? (
                            <ChartContainer config={conversionChartConfig} className="h-[300px] w-full">
                                <LineChart
                                    data={conversionChartData}
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
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Lead Volume */}
                <Card id="lead-volume-chart">
                    <CardHeader className="min-h-auto py-6 border-0">
                        <div className="flex items-start justify-between flex-wrap gap-4">
                            <CardTitle className="text-xl font-semibold">Lead Volume</CardTitle>
                        </div>
                        <CardToolbar className="flex items-center gap-2 flex-wrap">
                            <ExportButton
                                data={leadVolumeData}
                                elementId="lead-volume-chart"
                                filename={`lead-volume-${format(new Date(), 'yyyy-MM-dd')}`}
                                title="Lead Volume"
                                formats={['csv', 'png', 'pdf']}
                                variant="outline"
                                size="sm"
                            />
                        </CardToolbar>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {metricsLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : leadVolumeData.length > 0 ? (
                            <ChartContainer config={leadVolumeConfig} className="h-[300px] w-full">
                                <AreaChart
                                    data={leadVolumeData}
                                    margin={{ top: 10, left: 0, right: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.1} />
                                        </linearGradient>
                                        <linearGradient id="newGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-new)" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="var(--color-new)" stopOpacity={0.1} />
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
                                        dataKey="new"
                                        stroke="var(--color-new)"
                                        fill="url(#newGradient)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* System Adoption */}
                <Card id="system-adoption-chart">
                    <CardHeader className="min-h-auto py-6 border-0">
                        <div className="flex items-start justify-between flex-wrap gap-4">
                            <CardTitle className="text-xl font-semibold">System Adoption</CardTitle>
                        </div>
                        <CardToolbar className="flex items-center gap-2 flex-wrap">
                            <ExportButton
                                data={systemAdoptionData}
                                elementId="system-adoption-chart"
                                filename={`system-adoption-${format(new Date(), 'yyyy-MM-dd')}`}
                                title="System Adoption"
                                formats={['csv', 'png', 'pdf']}
                                variant="outline"
                                size="sm"
                            />
                        </CardToolbar>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {adoptionLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : systemAdoptionData.length > 0 ? (
                            <ChartContainer config={adoptionConfig} className="h-[300px] w-full">
                                <BarChart
                                    data={systemAdoptionData}
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
                                    <Bar
                                        dataKey="activeUsers"
                                        fill="var(--color-activeUsers)"
                                        radius={[8, 8, 0, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Response Times Comparison */}
                <Card id="response-times-chart">
                    <CardHeader className="min-h-auto py-6 border-0">
                        <div className="flex items-start justify-between flex-wrap gap-4">
                            <CardTitle className="text-xl font-semibold">Response Times Breakdown</CardTitle>
                        </div>
                        <CardToolbar className="flex items-center gap-2 flex-wrap">
                            <ExportButton
                                data={dailyMetrics?.slice(-7).map((metric: any) => ({
                                    date: new Date(metric.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                    firstResponse: Number(metric.avg_first_response_time) || 0,
                                    qualification: Number(metric.avg_qualification_time) || 0,
                                    conversion: Number(metric.avg_conversion_time) / 60 || 0,
                                })) || []}
                                elementId="response-times-chart"
                                filename={`response-times-${format(new Date(), 'yyyy-MM-dd')}`}
                                title="Response Times Breakdown"
                                formats={['csv', 'png', 'pdf']}
                                variant="outline"
                                size="sm"
                            />
                        </CardToolbar>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {metricsLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : dailyMetrics && dailyMetrics.length > 0 ? (
                            <ChartContainer
                                config={{
                                    firstResponse: { label: 'First Response (min)', color: CHART_COLORS.indigo.DEFAULT },
                                    qualification: { label: 'Qualification (min)', color: CHART_COLORS.amber.DEFAULT },
                                    conversion: { label: 'Conversion (min)', color: CHART_COLORS.emerald.DEFAULT },
                                } satisfies ChartConfig}
                                className="h-[300px] w-full"
                            >
                                <BarChart
                                    data={dailyMetrics.slice(-7).map((metric: Record<string, number>) => ({
                                        date: new Date(metric.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                        firstResponse: Number(metric.avg_first_response_time) || 0,
                                        qualification: Number(metric.avg_qualification_time) || 0,
                                        conversion: Number(metric.avg_conversion_time) / 60 || 0, // Convert to hours
                                    }))}
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
                                    <Legend />
                                    <Bar dataKey="firstResponse" fill="var(--color-firstResponse)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="qualification" fill="var(--color-qualification)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Business Performance Visualization */}
            <div className="grid gap-4 md:grid-cols-2">
                <RevenuePipeline />
                <LeadLifecycleFunnel />
            </div>

            {/* Additional Enhancement Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                <ConversionByService />
                <ActivityTimeline />
            </div>

            {/* Activity Heatmap */}
            <div className="grid gap-4 md:grid-cols-1">
                <ActivityHeatmap />
            </div>

            {/* Lead Distribution - Full Width */}
            <div className="grid gap-4">
                <LeadDistribution />
            </div>

            {/* Advanced Analytics - New Section */}
            <div className="mt-8">
                <h2 className="text-2xl font-bold tracking-tight mb-6">Advanced Analytics</h2>

                {/* Lead Source Performance & Program Performance */}
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <LeadSourcePerformance />
                    <ProgramPerformance />
                </div>

                {/* Task Completion Analysis & Lead Lifecycle Analysis */}
                <div className="grid gap-4 md:grid-cols-2">
                    <TaskCompletionAnalysis />
                    <LeadLifecycleAnalysis />
                </div>
            </div>

            {/* Recent Activity */}
            {data?.recent_activity && data.recent_activity.length > 0 && (
                <Card>
                    <CardHeader className="min-h-auto py-6 border-0">
                        <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.recent_activity.slice(0, 5).map((activity: any, index: number) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between border-b pb-2 last:border-0"
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">
                                            {activity.type || 'Activity'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {activity.lead?.name || 'Unknown'}
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {activity.created_at
                                            ? new Date(activity.created_at).toLocaleDateString()
                                            : ''}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
