import { DashboardOverview, useDailyMetrics, useSystemAdoption } from '@/hooks/useDashboard';
import { StatMetricCard } from '@/components/dashboard/StatMetricCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenuePipeline } from '@/components/dashboard/revenue-pipeline';
import { LeadLifecycleFunnel } from '@/components/dashboard/lead-lifecycle-funnel';
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap';
import { ExportButton } from '@/components/dashboard/export-button';
import { LeadSourcePerformance } from '@/components/dashboard/lead-source-performance';
import { ProgramPerformance } from '@/components/dashboard/program-performance';
import { TaskCompletionAnalysis } from '@/components/dashboard/task-completion-analysis';
import { LeadLifecycleAnalysis } from '@/components/dashboard/lead-lifecycle-analysis';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { CHART_COLORS, CHART_PRESETS } from '@/lib/dashboard-colors';
import { format } from 'date-fns';
import {
    Users,
    TrendingUp,
    Target,
    Clock,
    Activity,
    Award,
    BarChart3,
    Percent,
    UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface SuperAdminDashboardProps {
    data?: DashboardOverview;
    isLoading?: boolean;
}

export function SuperAdminDashboard({ data, isLoading }: SuperAdminDashboardProps) {
    const kpis = data?.kpis || {};

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

    const conversionChartData = dailyMetrics?.map((metric: any) => ({
        date: new Date(metric.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rate: Number(metric.overall_conversion_rate) || 0,
    })) || [];

    const leadVolumeData = dailyMetrics?.map((metric: any) => ({
        date: new Date(metric.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: metric.total_leads || 0,
        new: metric.new_leads_today || 0,
    })) || [];

    const conversionChartConfig = {
        rate: {
            label: 'Conversion Rate (%)',
            color: CHART_PRESETS.success.primary,
        },
    } satisfies ChartConfig;

    const leadVolumeConfig = {
        new: {
            label: 'New Leads',
            color: CHART_PRESETS.growth.primary,
        },
    } satisfies ChartConfig;

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                    System-wide overview and key performance indicators
                </p>
            </div>

            {/* ===== Section 1: High-Level KPIs ===== */}

            {/* Row 1: Core Sales KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                    title="Sales - CBI"
                    value={formatNumber(kpis.sales_cbi)}
                    isLoading={isLoading}
                    icon={TrendingUp}
                />
                <StatMetricCard
                    title="Sales - RBI"
                    value={formatNumber(kpis.sales_rbi)}
                    lastLabel="Excl. D Category"
                    isLoading={isLoading}
                    icon={Target}
                />
                <StatMetricCard
                    title="Sales - Skilled"
                    value={formatNumber(kpis.sales_skilled)}
                    isLoading={isLoading}
                    icon={UserCheck}
                />
            </div>

            {/* Row 2: Performance KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Best Lead Source"
                    value={kpis.best_lead_source
                        ? `${kpis.best_lead_source.name} (${kpis.best_lead_source.conversion_rate}%)`
                        : 'N/A'
                    }
                    icon={Award}
                    color="green"
                />
                <StatCard
                    label="LTQ Rate"
                    value={formatPercent(kpis.ltq_rate)}
                    icon={Percent}
                    color="blue"
                />
                <StatCard
                    label="QTS Rate"
                    value={formatPercent(kpis.qts_rate)}
                    icon={Percent}
                    color="purple"
                />
                <StatCard
                    label="Avg Lead Lifecycle"
                    value={`${kpis.avg_lifecycle_days ?? 0} days`}
                    icon={Clock}
                    color="yellow"
                />
            </div>

            {/* Row 3: System KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    label="System Adoption"
                    value={formatPercent(kpis.system_adoption_rate)}
                    icon={Activity}
                    color="blue"
                />
                <StatCard
                    label="Avg Leads per Advisor/Day"
                    value={String(kpis.avg_leads_per_advisor_per_day ?? 0)}
                    icon={BarChart3}
                    color="green"
                />
            </div>

            {/* ===== Section 2: Charts & Analytics ===== */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Charts & Analytics</h2>

                {/* Lead Volume + Conversion Rate Trend */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Lead Volume */}
                    <Card id="lead-volume-chart" className="min-w-0">
                        <CardHeader className="min-h-auto border-0 py-4 sm:py-6">
                            <CardTitle className="text-base font-semibold sm:text-xl">Lead Volume</CardTitle>
                            <CardToolbar className="flex items-center gap-2">
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
                        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                            {metricsLoading ? (
                                <Skeleton className="h-[200px] w-full sm:h-[250px] lg:h-[300px]" />
                            ) : leadVolumeData.length > 0 ? (
                                <ChartContainer config={leadVolumeConfig} className="aspect-video w-full max-h-[300px]">
                                    <AreaChart
                                        data={leadVolumeData}
                                        margin={{ top: 10, left: -10, right: 10, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="newGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-new)" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="var(--color-new)" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                        <YAxis className="text-xs" tick={{ fontSize: 11 }} width={40} />
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
                                <div className="flex h-[200px] items-center justify-center text-muted-foreground sm:h-[250px] lg:h-[300px]">
                                    No data available
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Conversion Rate Trend */}
                    <Card id="conversion-rate-trend-chart" className="min-w-0">
                        <CardHeader className="min-h-auto border-0 py-4 sm:py-6">
                            <CardTitle className="text-base font-semibold sm:text-xl">Conversion Rate Trend</CardTitle>
                            <CardToolbar className="flex items-center gap-2">
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
                        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                            {metricsLoading ? (
                                <Skeleton className="h-[200px] w-full sm:h-[250px] lg:h-[300px]" />
                            ) : conversionChartData.length > 0 ? (
                                <ChartContainer config={conversionChartConfig} className="aspect-video w-full max-h-[300px]">
                                    <LineChart
                                        data={conversionChartData}
                                        margin={{ top: 10, left: -10, right: 10, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                        <YAxis className="text-xs" tick={{ fontSize: 11 }} width={40} />
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
                                <div className="flex h-[200px] items-center justify-center text-muted-foreground sm:h-[250px] lg:h-[300px]">
                                    No data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Revenue Pipeline + Lifecycle Funnel */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <RevenuePipeline />
                    <LeadLifecycleFunnel />
                </div>

                {/* Lead Source Performance + Program Performance */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <LeadSourcePerformance />
                    <ProgramPerformance />
                </div>
            </div>

            {/* ===== Section 3: Activity & Tasks ===== */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Activity & Tasks</h2>

                <ActivityHeatmap />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <TaskCompletionAnalysis />
                    <LeadLifecycleAnalysis />
                </div>
            </div>
        </div>
    );
}
