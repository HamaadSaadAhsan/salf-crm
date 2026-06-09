import { DashboardOverview, useDailyMetrics, useSystemAdoption } from '@/hooks/useDashboard';
import { StatMetricCard } from '@/components/dashboard/StatMetricCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { ProgramSalesCard } from '@/components/dashboard/ProgramSalesCard';
import { AdSourcesChart } from '@/components/dashboard/ad-sources-chart';
import { LeadLifecycleFunnel } from '@/components/dashboard/lead-lifecycle-funnel';
import { CalendarHeatmap } from '@/components/dashboard/calendar-heatmap';
import { SankeyPipeline } from '@/components/dashboard/sankey-pipeline';
import { ExportButton } from '@/components/dashboard/export-button';
import { AdSourceConversions } from '@/components/dashboard/ad-source-conversions';
import { ProgramWonDistribution } from '@/components/dashboard/program-won-distribution';
import { QuarterlyPerformanceTrends } from '@/components/dashboard/quarterly-performance-trends';
import { LeadSourcePerformance } from '@/components/dashboard/lead-source-performance';
import { ProgramPerformance } from '@/components/dashboard/program-performance';
import { LeadLifecycleAnalysis } from '@/components/dashboard/lead-lifecycle-analysis';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { CHART_PRESETS } from '@/lib/dashboard-colors';
import { format } from 'date-fns';
import { Users, Target, Clock, Activity, Award, BarChart3, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip } from '@/components/ui/chart';
import { NightTooltip } from '@/components/dashboard/night-tooltip';
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { router, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

interface SuperAdminDashboardProps {
    data?: DashboardOverview;
    isLoading?: boolean;
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {label}
            </span>
            <span className="h-px flex-1 bg-border" />
        </div>
    );
}

export function SuperAdminDashboard({ data, isLoading }: SuperAdminDashboardProps) {
    const { auth } = usePage<SharedData>().props;
    const kpis = data?.kpis || {};

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyMetrics, isLoading: metricsLoading } = useDailyMetrics({
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
    });

    const { data: systemAdoption } = useSystemAdoption({
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
    });

    const conversionChartData = dailyMetrics?.map((metric) => ({
        date: new Date(metric.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rawDate: metric.metric_date,
        rate: Number(metric.overall_conversion_rate) || 0,
    })) || [];

    const leadVolumeData = dailyMetrics?.map((metric) => ({
        date: new Date(metric.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: metric.total_leads || 0,
        new: metric.new_leads_today || 0,
    })) || [];

    const totalLeadsSparkData = dailyMetrics?.map((metric) => ({
        value: metric.total_leads || 0,
    })) || [];

    const avgLeadScoreSparkData = dailyMetrics?.map((metric) => ({
        value: Number(metric.lead_conversion_score) || 0,
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
        <div className="space-y-8 p-4 sm:p-6 lg:p-8">

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {getGreeting()}, {auth.user.name.split(' ')[0]}
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {format(new Date(), 'EEEE, MMMM d, yyyy')} · System overview
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatMetricCard
                    title="Total Leads"
                    value={formatNumber(kpis.total_leads)}
                    delta={kpis.leads_delta}
                    lastValue={kpis.last_month_leads ? formatNumber(kpis.last_month_leads) : undefined}
                    positive={(kpis.leads_delta || 0) >= 0}
                    isLoading={isLoading}
                    icon={Users}
                    iconColor="text-blue-600 dark:text-blue-400"
                    sparkData={totalLeadsSparkData.length > 1 ? totalLeadsSparkData : undefined}
                    sparkColor="hsl(217, 91%, 60%)"
                />
                <StatMetricCard
                    title="Avg Lead Score"
                    value={kpis.avg_lead_score ?? 0}
                    isLoading={isLoading}
                    icon={Target}
                    iconColor="text-emerald-600 dark:text-emerald-400"
                    sparkData={avgLeadScoreSparkData.length >= 1 ? avgLeadScoreSparkData : undefined}
                    sparkColor="hsl(142, 71%, 45%)"
                />
                <ProgramSalesCard
                    programSales={kpis.program_sales}
                    isLoading={isLoading}
                />
            </div>

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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard
                    label="System Adoption"
                    value={formatPercent(kpis.system_adoption_rate)}
                    icon={Activity}
                    color="blue"
                />
                <StatCard
                    label="Avg Leads per Advisor / Day"
                    value={String(kpis.avg_leads_per_advisor_per_day ?? 0)}
                    icon={BarChart3}
                    color="green"
                />
            </div>

            <SectionDivider label="Charts & Analytics" />

            {/* Calendar heatmap — full width */}
            <CalendarHeatmap year={new Date().getFullYear()} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Conversion Rate Trend — drill down by clicking a data point */}
                <Card id="conversion-rate-trend-chart" className="flex min-w-0 flex-col">
                    <CardHeader className="min-h-auto border-0 py-4 sm:py-5">
                        <CardTitle className="text-sm font-semibold">Conversion Rate Trend</CardTitle>
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
                    <CardContent className="flex min-h-0 flex-1 flex-col px-2 pb-2 sm:px-6">
                        {metricsLoading ? (
                            <Skeleton className="min-h-0 flex-1 w-full" />
                        ) : conversionChartData.length > 0 ? (
                            <ChartContainer config={conversionChartConfig} className="min-h-0 flex-1 w-full">
                                <LineChart
                                    data={conversionChartData}
                                    margin={{ top: 8, left: -10, right: 8, bottom: 0 }}
                                    onClick={(e: { activePayload?: { payload?: { rawDate?: string } }[] }) => {
                                        const active = e?.activePayload?.[0]?.payload;
                                        if (active?.rawDate) {
                                            router.visit(`/leads?date_from=${active.rawDate}&date_to=${active.rawDate}`);
                                        }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid horizontal vertical={false} stroke="currentColor" strokeOpacity={0.07} />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, opacity: 0.5 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis tick={{ fontSize: 11, opacity: 0.5 }} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => `${v}%`} />
                                    <ChartTooltip content={(props) => <NightTooltip {...props} valueFormatter={(v) => `${Number(v).toFixed(1)}%`} />} />
                                    <Line type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 3, fill: 'var(--color-rate)', strokeWidth: 0 }} activeDot={{ r: 6, cursor: 'pointer' }} />
                                </LineChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sankey pipeline flow */}
                <SankeyPipeline />
            </div>

            <AdSourcesChart />
            <LeadLifecycleFunnel />

            <AdSourceConversions />
            <ProgramWonDistribution />

            <QuarterlyPerformanceTrends />

            <LeadSourcePerformance />
            <ProgramPerformance />

            <SectionDivider label="Lifecycle Analysis" />

            <LeadLifecycleAnalysis />
        </div>
    );
}
