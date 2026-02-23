import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { Layers, Trophy, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFiltersBar } from '@/components/reports/report-filters';
import { ReportSummaryCards, SummaryCardItem } from '@/components/reports/report-summary-cards';
import { ReportDataTable } from '@/components/reports/report-data-table';
import { useLeadsByServiceReport, type ReportFilters, type ServiceRow } from '@/hooks/useReports';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { CHART_COLORS } from '@/lib/dashboard-colors';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports' },
    { title: 'By Service', href: '/reports/leads-by-service' },
];

interface Props {
    offices?: { id: number; name: string }[];
    services?: { id: number; name: string }[];
    sources?: { id: number; name: string }[];
}

const columns: ColumnDef<ServiceRow, unknown>[] = [
    { accessorKey: 'service_name', header: ({ column }) => <DataGridColumnHeader column={column} title="Service" /> },
    { accessorKey: 'total_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Total Leads" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'qualified_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Qualified" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'won_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Won" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'lost_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Lost" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'conversion_rate', header: ({ column }) => <DataGridColumnHeader column={column} title="Conversion %" />, cell: ({ getValue }) => formatPercent(getValue() as number) },
];

const chartConfig = {
    total_leads: { label: 'Total', color: CHART_COLORS.blue.DEFAULT },
    won_leads: { label: 'Won', color: CHART_COLORS.emerald.DEFAULT },
    qualified_leads: { label: 'Qualified', color: CHART_COLORS.violet.DEFAULT },
} satisfies ChartConfig;

export default function LeadsByService({ offices = [], services = [], sources = [] }: Props) {
    const [filters, setFilters] = useState<ReportFilters>({});
    const { data, isLoading } = useLeadsByServiceReport(filters);

    const summary = data?.summary;
    const tableData = (data?.table_data ?? []) as ServiceRow[];

    const summaryCards: SummaryCardItem[] = [
        { title: 'Total Leads', value: summary?.total_leads ?? 0, format: 'number', icon: Layers, iconColor: CHART_COLORS.blue.DEFAULT },
        { title: 'Total Won', value: summary?.total_won ?? 0, format: 'number', icon: Trophy, iconColor: CHART_COLORS.emerald.DEFAULT },
        { title: 'Services', value: summary?.total_services ?? 0, format: 'number', icon: TrendingUp, iconColor: CHART_COLORS.violet.DEFAULT },
        { title: 'Conversion Rate', value: summary?.overall_conversion_rate ?? 0, format: 'percent', icon: Target, iconColor: CHART_COLORS.amber.DEFAULT },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Leads by Service Report" />
            <div className="p-5 lg:p-7.5 space-y-5">
                <ReportFiltersBar filters={filters} onChange={setFilters} offices={offices} services={services} sources={sources} showGroupBy={false} showService={false} />
                <ReportSummaryCards items={summaryCards} isLoading={isLoading} />

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Service Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[350px] w-full" />
                        ) : tableData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                <BarChart data={tableData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="service_name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={60} />
                                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="total_leads" fill={CHART_COLORS.blue.DEFAULT} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="won_leads" fill={CHART_COLORS.emerald.DEFAULT} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="qualified_leads" fill={CHART_COLORS.violet.DEFAULT} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-[350px] items-center justify-center text-muted-foreground">No data available</div>
                        )}
                    </CardContent>
                </Card>

                <ReportDataTable title="Service Details" data={tableData as any} columns={columns as any} isLoading={isLoading} />
            </div>
        </AppLayout>
    );
}
