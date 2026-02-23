import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { Globe, Trophy, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFiltersBar } from '@/components/reports/report-filters';
import { ReportSummaryCards, SummaryCardItem } from '@/components/reports/report-summary-cards';
import { ReportDataTable } from '@/components/reports/report-data-table';
import { useLeadsBySourceReport, type ReportFilters, type SourceRow } from '@/hooks/useReports';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { CHART_COLORS, MULTI_SERIES_COLORS, getSeriesColor } from '@/lib/dashboard-colors';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports' },
    { title: 'By Source', href: '/reports/leads-by-source' },
];

interface Props {
    offices?: { id: number; name: string }[];
    services?: { id: number; name: string }[];
    sources?: { id: number; name: string }[];
}

const columns: ColumnDef<SourceRow, unknown>[] = [
    { accessorKey: 'source_name', header: ({ column }) => <DataGridColumnHeader column={column} title="Source" /> },
    { accessorKey: 'total_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Total Leads" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'qualified_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Qualified" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'won_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Won" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'lost_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Lost" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'conversion_rate', header: ({ column }) => <DataGridColumnHeader column={column} title="Conversion %" />, cell: ({ getValue }) => formatPercent(getValue() as number) },
    { accessorKey: 'qualification_rate', header: ({ column }) => <DataGridColumnHeader column={column} title="Qualification %" />, cell: ({ getValue }) => formatPercent(getValue() as number) },
];

const barChartConfig = {
    total_leads: { label: 'Total', color: CHART_COLORS.blue.DEFAULT },
    won_leads: { label: 'Won', color: CHART_COLORS.emerald.DEFAULT },
} satisfies ChartConfig;

export default function LeadsBySource({ offices = [], services = [], sources = [] }: Props) {
    const [filters, setFilters] = useState<ReportFilters>({});
    const { data, isLoading } = useLeadsBySourceReport(filters);

    const summary = data?.summary;
    const tableData = (data?.table_data ?? []) as SourceRow[];

    const summaryCards: SummaryCardItem[] = [
        { title: 'Total Leads', value: summary?.total_leads ?? 0, format: 'number', icon: Globe, iconColor: CHART_COLORS.blue.DEFAULT },
        { title: 'Total Won', value: summary?.total_won ?? 0, format: 'number', icon: Trophy, iconColor: CHART_COLORS.emerald.DEFAULT },
        { title: 'Sources', value: summary?.total_sources ?? 0, format: 'number', icon: TrendingUp, iconColor: CHART_COLORS.violet.DEFAULT },
        { title: 'Conversion Rate', value: summary?.overall_conversion_rate ?? 0, format: 'percent', icon: Target, iconColor: CHART_COLORS.amber.DEFAULT },
    ];

    const pieData = tableData.map((row, i) => ({
        name: row.source_name,
        value: row.total_leads,
        fill: getSeriesColor(i),
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Leads by Source Report" />
            <div className="p-5 lg:p-7.5 space-y-5">
                <ReportFiltersBar filters={filters} onChange={setFilters} offices={offices} services={services} sources={sources} showGroupBy={false} showSource={false} />
                <ReportSummaryCards items={summaryCards} isLoading={isLoading} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Source Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-[350px] w-full" />
                            ) : tableData.length > 0 ? (
                                <ChartContainer config={barChartConfig} className="h-[350px] w-full">
                                    <BarChart data={tableData}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="source_name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={60} />
                                        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="total_leads" fill={CHART_COLORS.blue.DEFAULT} radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="won_leads" fill={CHART_COLORS.emerald.DEFAULT} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex h-[350px] items-center justify-center text-muted-foreground">No data available</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Lead Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-[350px] w-full" />
                            ) : pieData.length > 0 ? (
                                <div className="h-[350px]">
                                    <ChartContainer config={{ value: { label: 'Leads' } }} className="h-[280px] w-full">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
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
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-[350px] items-center justify-center text-muted-foreground">No data available</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <ReportDataTable title="Source Details" data={tableData as any} columns={columns as any} isLoading={isLoading} />
            </div>
        </AppLayout>
    );
}
