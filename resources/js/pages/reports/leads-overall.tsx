import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { BarChart3, Users, Trophy, XCircle, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFiltersBar } from '@/components/reports/report-filters';
import { ReportSummaryCards, SummaryCardItem } from '@/components/reports/report-summary-cards';
import { ReportDataTable } from '@/components/reports/report-data-table';
import { useLeadsOverallReport, type ReportFilters, type TrendDataPoint } from '@/hooks/useReports';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { CHART_COLORS, MULTI_SERIES_COLORS } from '@/lib/dashboard-colors';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports' },
    { title: 'Leads Overall', href: '/reports/leads-overall' },
];

interface Props {
    offices?: { id: number; name: string }[];
    services?: { id: number; name: string }[];
    sources?: { id: number; name: string }[];
}

const STATUS_COLORS: Record<string, string> = {
    new: CHART_COLORS.blue.DEFAULT,
    contacted: CHART_COLORS.cyan.DEFAULT,
    qualified: CHART_COLORS.violet.DEFAULT,
    proposal: CHART_COLORS.amber.DEFAULT,
    assigned_to_advisor: CHART_COLORS.indigo.DEFAULT,
    won: CHART_COLORS.emerald.DEFAULT,
    lost: CHART_COLORS.rose.DEFAULT,
};

export default function LeadsOverall({ offices = [], services = [], sources = [] }: Props) {
    const [filters, setFilters] = useState<ReportFilters>({});
    const { data, isLoading } = useLeadsOverallReport(filters);

    const summary = data?.summary;
    const chartData = (data?.chart_data ?? []) as TrendDataPoint[];
    const statusData = data?.table_data as Record<string, number> | undefined;

    const summaryCards: SummaryCardItem[] = [
        { title: 'Total Leads', value: summary?.total_leads ?? 0, format: 'number', icon: BarChart3, iconColor: CHART_COLORS.blue.DEFAULT },
        { title: 'Won Leads', value: summary?.won_leads ?? 0, format: 'number', icon: Trophy, iconColor: CHART_COLORS.emerald.DEFAULT },
        { title: 'Lost Leads', value: summary?.lost_leads ?? 0, format: 'number', icon: XCircle, iconColor: CHART_COLORS.rose.DEFAULT },
        { title: 'Conversion Rate', value: summary?.conversion_rate ?? 0, format: 'percent', icon: Target, iconColor: CHART_COLORS.violet.DEFAULT },
        { title: 'Qualified', value: summary?.qualified_leads ?? 0, format: 'number', icon: TrendingUp, iconColor: CHART_COLORS.cyan.DEFAULT },
        { title: 'Qualification Rate', value: summary?.qualification_rate ?? 0, format: 'percent', icon: Users, iconColor: CHART_COLORS.indigo.DEFAULT },
    ];

    const trendChartConfig = {
        count: { label: 'Leads', color: CHART_COLORS.blue.DEFAULT },
    } satisfies ChartConfig;

    const pieData = statusData
        ? Object.entries(statusData).map(([status, count]) => ({
              name: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
              value: count as number,
              fill: STATUS_COLORS[status] ?? CHART_COLORS.teal.DEFAULT,
          }))
        : [];

    const statusColumns: ColumnDef<{ name: string; value: number; fill: string }, unknown>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        },
        {
            accessorKey: 'value',
            header: ({ column }) => <DataGridColumnHeader column={column} title="Count" />,
            cell: ({ getValue }) => formatNumber(getValue() as number),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Leads Overall Report" />
            <div className="p-5 lg:p-7.5 space-y-5">
                <ReportFiltersBar
                    filters={filters}
                    onChange={setFilters}
                    offices={offices}
                    services={services}
                    sources={sources}
                />

                <ReportSummaryCards items={summaryCards} isLoading={isLoading} columns={3} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Leads Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-[300px] w-full" />
                            ) : chartData.length > 0 ? (
                                <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={CHART_COLORS.blue.DEFAULT} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={CHART_COLORS.blue.DEFAULT} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="period" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Area type="monotone" dataKey="count" stroke={CHART_COLORS.blue.DEFAULT} fill="url(#trendGradient)" strokeWidth={2} />
                                    </AreaChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Status Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-[300px] w-full" />
                            ) : pieData.length > 0 ? (
                                <div className="h-[300px]">
                                    <ChartContainer config={{ value: { label: 'Count' } }} className="h-[240px] w-full">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                                                {pieData.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                        </PieChart>
                                    </ChartContainer>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        {pieData.map((entry) => (
                                            <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                                                <span className="text-muted-foreground">{entry.name}</span>
                                                <span className="font-medium">{entry.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <ReportDataTable
                    title="Status Details"
                    data={pieData as any}
                    columns={statusColumns as any}
                    isLoading={isLoading}
                />
            </div>
        </AppLayout>
    );
}
