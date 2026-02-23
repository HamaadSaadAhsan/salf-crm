import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { Briefcase, Trophy, Target, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFiltersBar } from '@/components/reports/report-filters';
import { ReportSummaryCards, SummaryCardItem } from '@/components/reports/report-summary-cards';
import { ReportDataTable } from '@/components/reports/report-data-table';
import { useLeadsBySalesRepReport, type ReportFilters, type SalesRepRow } from '@/hooks/useReports';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { CHART_COLORS } from '@/lib/dashboard-colors';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports' },
    { title: 'By Sales Rep', href: '/reports/leads-by-sales-rep' },
];

interface Props {
    offices?: { id: number; name: string }[];
    services?: { id: number; name: string }[];
    sources?: { id: number; name: string }[];
}

const columns: ColumnDef<SalesRepRow, unknown>[] = [
    { accessorKey: 'rep_name', header: ({ column }) => <DataGridColumnHeader column={column} title="Sales Rep" /> },
    { accessorKey: 'total_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Total Leads" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'won_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Won" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'lost_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Lost" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'in_pipeline', header: ({ column }) => <DataGridColumnHeader column={column} title="In Pipeline" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'conversion_rate', header: ({ column }) => <DataGridColumnHeader column={column} title="Conversion %" />, cell: ({ getValue }) => formatPercent(getValue() as number) },
    { accessorKey: 'avg_conversion_days', header: ({ column }) => <DataGridColumnHeader column={column} title="Avg Days to Convert" />, cell: ({ getValue }) => (getValue() as number).toFixed(1) },
];

const chartConfig = {
    won_leads: { label: 'Won', color: CHART_COLORS.emerald.DEFAULT },
    in_pipeline: { label: 'In Pipeline', color: CHART_COLORS.amber.DEFAULT },
    lost_leads: { label: 'Lost', color: CHART_COLORS.rose.DEFAULT },
} satisfies ChartConfig;

export default function LeadsBySalesRep({ offices = [], services = [], sources = [] }: Props) {
    const [filters, setFilters] = useState<ReportFilters>({});
    const { data, isLoading } = useLeadsBySalesRepReport(filters);

    const summary = data?.summary;
    const tableData = (data?.table_data ?? []) as SalesRepRow[];

    const summaryCards: SummaryCardItem[] = [
        { title: 'Total Leads', value: summary?.total_leads ?? 0, format: 'number', icon: Briefcase, iconColor: CHART_COLORS.blue.DEFAULT },
        { title: 'Total Won', value: summary?.total_won ?? 0, format: 'number', icon: Trophy, iconColor: CHART_COLORS.emerald.DEFAULT },
        { title: 'Sales Reps', value: summary?.total_reps ?? 0, format: 'number', icon: Briefcase, iconColor: CHART_COLORS.violet.DEFAULT },
        { title: 'Conversion Rate', value: summary?.overall_conversion_rate ?? 0, format: 'percent', icon: Target, iconColor: CHART_COLORS.amber.DEFAULT },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Leads by Sales Rep Report" />
            <div className="p-5 lg:p-7.5 space-y-5">
                <ReportFiltersBar filters={filters} onChange={setFilters} offices={offices} services={services} sources={sources} showGroupBy={false} />
                <ReportSummaryCards items={summaryCards} isLoading={isLoading} />

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Sales Rep Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[350px] w-full" />
                        ) : tableData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                <BarChart data={tableData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="rep_name" type="category" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={120} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="won_leads" fill={CHART_COLORS.emerald.DEFAULT} radius={[0, 4, 4, 0]} stackId="a" />
                                    <Bar dataKey="in_pipeline" fill={CHART_COLORS.amber.DEFAULT} radius={[0, 4, 4, 0]} stackId="a" />
                                    <Bar dataKey="lost_leads" fill={CHART_COLORS.rose.DEFAULT} radius={[0, 4, 4, 0]} stackId="a" />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-[350px] items-center justify-center text-muted-foreground">No data available</div>
                        )}
                    </CardContent>
                </Card>

                <ReportDataTable title="Sales Rep Details" data={tableData as any} columns={columns as any} isLoading={isLoading} />
            </div>
        </AppLayout>
    );
}
