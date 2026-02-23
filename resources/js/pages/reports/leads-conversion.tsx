import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFiltersBar } from '@/components/reports/report-filters';
import { ReportSummaryCards, SummaryCardItem } from '@/components/reports/report-summary-cards';
import { ReportDataTable } from '@/components/reports/report-data-table';
import { useLeadsConversionReport, type ReportFilters, type TrendDataPoint } from '@/hooks/useReports';
import { formatNumber } from '@/lib/dashboard-utils';
import { CHART_COLORS } from '@/lib/dashboard-colors';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports' },
    { title: 'Won Leads', href: '/reports/leads-conversion' },
];

interface Props {
    offices?: { id: number; name: string }[];
    services?: { id: number; name: string }[];
    sources?: { id: number; name: string }[];
}

interface BreakdownRow {
    source_name?: string;
    service_name?: string;
    count: number;
}

const sourceColumns: ColumnDef<BreakdownRow, unknown>[] = [
    { accessorKey: 'source_name', header: ({ column }) => <DataGridColumnHeader column={column} title="Source" /> },
    { accessorKey: 'count', header: ({ column }) => <DataGridColumnHeader column={column} title="Won Leads" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
];

const serviceColumns: ColumnDef<BreakdownRow, unknown>[] = [
    { accessorKey: 'service_name', header: ({ column }) => <DataGridColumnHeader column={column} title="Service" /> },
    { accessorKey: 'count', header: ({ column }) => <DataGridColumnHeader column={column} title="Won Leads" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
];

const trendChartConfig = {
    count: { label: 'Won Leads', color: CHART_COLORS.emerald.DEFAULT },
} satisfies ChartConfig;

const barChartConfig = {
    count: { label: 'Count', color: CHART_COLORS.emerald.DEFAULT },
} satisfies ChartConfig;

export default function LeadsConversion({ offices = [], services = [], sources = [] }: Props) {
    const [filters, setFilters] = useState<ReportFilters>({});
    const { data, isLoading } = useLeadsConversionReport(filters);

    const summary = data?.summary;
    const chartData = (data?.chart_data ?? []) as TrendDataPoint[];
    const tableData = data?.table_data as { by_source?: BreakdownRow[]; by_service?: BreakdownRow[] } | undefined;

    const summaryCards: SummaryCardItem[] = [
        { title: 'Total Won', value: summary?.total_won ?? 0, format: 'number', icon: TrendingUp, iconColor: CHART_COLORS.emerald.DEFAULT },
        { title: 'Avg Conversion Days', value: summary?.avg_conversion_days ?? 0, format: 'days', icon: Clock, iconColor: CHART_COLORS.amber.DEFAULT },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Won Leads Report" />
            <div className="p-5 lg:p-7.5 space-y-5">
                <ReportFiltersBar filters={filters} onChange={setFilters} offices={offices} services={services} sources={sources} />
                <ReportSummaryCards items={summaryCards} isLoading={isLoading} columns={2} />

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Won Leads Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : chartData.length > 0 ? (
                            <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="conversionGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={CHART_COLORS.emerald.DEFAULT} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={CHART_COLORS.emerald.DEFAULT} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="period" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area type="monotone" dataKey="count" stroke={CHART_COLORS.emerald.DEFAULT} fill="url(#conversionGradient)" strokeWidth={2} />
                                </AreaChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div>
                        <Card className="mb-5">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Won by Source</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-[200px] w-full" />
                                ) : (tableData?.by_source ?? []).length > 0 ? (
                                    <ChartContainer config={barChartConfig} className="h-[200px] w-full">
                                        <BarChart data={tableData?.by_source} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                            <YAxis dataKey="source_name" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="count" fill={CHART_COLORS.emerald.DEFAULT} radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex h-[200px] items-center justify-center text-muted-foreground">No data</div>
                                )}
                            </CardContent>
                        </Card>
                        <ReportDataTable title="Source Breakdown" data={(tableData?.by_source ?? []) as any} columns={sourceColumns as any} isLoading={isLoading} />
                    </div>

                    <div>
                        <Card className="mb-5">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Won by Service</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-[200px] w-full" />
                                ) : (tableData?.by_service ?? []).length > 0 ? (
                                    <ChartContainer config={barChartConfig} className="h-[200px] w-full">
                                        <BarChart data={tableData?.by_service} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                            <YAxis dataKey="service_name" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="count" fill={CHART_COLORS.violet.DEFAULT} radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex h-[200px] items-center justify-center text-muted-foreground">No data</div>
                                )}
                            </CardContent>
                        </Card>
                        <ReportDataTable title="Service Breakdown" data={(tableData?.by_service ?? []) as any} columns={serviceColumns as any} isLoading={isLoading} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
