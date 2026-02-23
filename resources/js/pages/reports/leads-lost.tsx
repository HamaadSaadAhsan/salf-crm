import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { TrendingDown, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFiltersBar } from '@/components/reports/report-filters';
import { ReportSummaryCards, SummaryCardItem } from '@/components/reports/report-summary-cards';
import { ReportDataTable } from '@/components/reports/report-data-table';
import { useLeadsLostReport, type ReportFilters, type TrendDataPoint, type LossReasonRow } from '@/hooks/useReports';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { CHART_COLORS, getSeriesColor } from '@/lib/dashboard-colors';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports' },
    { title: 'Lost Leads', href: '/reports/leads-lost' },
];

interface Props {
    offices?: { id: number; name: string }[];
    services?: { id: number; name: string }[];
    sources?: { id: number; name: string }[];
}

const reasonColumns: ColumnDef<LossReasonRow, unknown>[] = [
    { accessorKey: 'reason', header: ({ column }) => <DataGridColumnHeader column={column} title="Reason" /> },
    { accessorKey: 'count', header: ({ column }) => <DataGridColumnHeader column={column} title="Count" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'percentage', header: ({ column }) => <DataGridColumnHeader column={column} title="%" />, cell: ({ getValue }) => formatPercent(getValue() as number) },
];

const trendChartConfig = {
    count: { label: 'Lost Leads', color: CHART_COLORS.rose.DEFAULT },
} satisfies ChartConfig;

export default function LeadsLost({ offices = [], services = [], sources = [] }: Props) {
    const [filters, setFilters] = useState<ReportFilters>({});
    const { data, isLoading } = useLeadsLostReport(filters);

    const summary = data?.summary;
    const chartData = (data?.chart_data ?? []) as TrendDataPoint[];
    const tableData = data?.table_data as { reasons?: LossReasonRow[]; by_source?: Array<{ source_name: string; count: number }> } | undefined;

    const topReason = summary?.top_reason as { reason?: string; count?: number } | null;

    const summaryCards: SummaryCardItem[] = [
        { title: 'Total Lost', value: summary?.total_lost ?? 0, format: 'number', icon: TrendingDown, iconColor: CHART_COLORS.rose.DEFAULT },
        { title: 'Top Reason', value: topReason?.reason ?? 'N/A', format: 'raw', icon: AlertCircle, iconColor: CHART_COLORS.amber.DEFAULT },
    ];

    const reasonPieData = (tableData?.reasons ?? []).map((row, i) => ({
        name: row.reason,
        value: row.count,
        fill: getSeriesColor(i),
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Lost Leads Report" />
            <div className="p-5 lg:p-7.5 space-y-5">
                <ReportFiltersBar filters={filters} onChange={setFilters} offices={offices} services={services} sources={sources} />
                <ReportSummaryCards items={summaryCards} isLoading={isLoading} columns={2} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Lost Leads Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-[300px] w-full" />
                            ) : chartData.length > 0 ? (
                                <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="lostGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={CHART_COLORS.rose.DEFAULT} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={CHART_COLORS.rose.DEFAULT} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="period" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Area type="monotone" dataKey="count" stroke={CHART_COLORS.rose.DEFAULT} fill="url(#lostGradient)" strokeWidth={2} />
                                    </AreaChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Loss Reasons</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-[300px] w-full" />
                            ) : reasonPieData.length > 0 ? (
                                <div className="h-[300px]">
                                    <ChartContainer config={{ value: { label: 'Count' } }} className="h-[225px] w-full">
                                        <PieChart>
                                            <Pie data={reasonPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                                                {reasonPieData.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                        </PieChart>
                                    </ChartContainer>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        {reasonPieData.map((entry) => (
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

                <ReportDataTable title="Loss Reason Details" data={(tableData?.reasons ?? []) as any} columns={reasonColumns as any} isLoading={isLoading} />
            </div>
        </AppLayout>
    );
}
