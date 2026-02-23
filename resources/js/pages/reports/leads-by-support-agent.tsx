import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { HeadphonesIcon, Target, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFiltersBar } from '@/components/reports/report-filters';
import { ReportSummaryCards, SummaryCardItem } from '@/components/reports/report-summary-cards';
import { ReportDataTable } from '@/components/reports/report-data-table';
import { useLeadsBySupportAgentReport, type ReportFilters, type AgentRow } from '@/hooks/useReports';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { CHART_COLORS } from '@/lib/dashboard-colors';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports' },
    { title: 'By Support Agent', href: '/reports/leads-by-support-agent' },
];

interface Props {
    offices?: { id: number; name: string }[];
    services?: { id: number; name: string }[];
    sources?: { id: number; name: string }[];
}

const columns: ColumnDef<AgentRow, unknown>[] = [
    { accessorKey: 'agent_name', header: ({ column }) => <DataGridColumnHeader column={column} title="Agent" /> },
    { accessorKey: 'total_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Total Leads" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'qualified_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Qualified" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'won_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Won" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'lost_leads', header: ({ column }) => <DataGridColumnHeader column={column} title="Lost" />, cell: ({ getValue }) => formatNumber(getValue() as number) },
    { accessorKey: 'qualification_rate', header: ({ column }) => <DataGridColumnHeader column={column} title="Qualification %" />, cell: ({ getValue }) => formatPercent(getValue() as number) },
    { accessorKey: 'avg_response_time_minutes', header: ({ column }) => <DataGridColumnHeader column={column} title="Avg Response (min)" />, cell: ({ getValue }) => (getValue() as number).toFixed(1) },
];

const chartConfig = {
    qualified_leads: { label: 'Qualified', color: CHART_COLORS.violet.DEFAULT },
    won_leads: { label: 'Won', color: CHART_COLORS.emerald.DEFAULT },
} satisfies ChartConfig;

export default function LeadsBySupportAgent({ offices = [], services = [], sources = [] }: Props) {
    const [filters, setFilters] = useState<ReportFilters>({});
    const { data, isLoading } = useLeadsBySupportAgentReport(filters);

    const summary = data?.summary;
    const tableData = (data?.table_data ?? []) as AgentRow[];

    const summaryCards: SummaryCardItem[] = [
        { title: 'Total Leads', value: summary?.total_leads ?? 0, format: 'number', icon: Users, iconColor: CHART_COLORS.blue.DEFAULT },
        { title: 'Total Qualified', value: summary?.total_qualified ?? 0, format: 'number', icon: Target, iconColor: CHART_COLORS.violet.DEFAULT },
        { title: 'Agents', value: summary?.total_agents ?? 0, format: 'number', icon: HeadphonesIcon, iconColor: CHART_COLORS.cyan.DEFAULT },
        { title: 'Qualification Rate', value: summary?.overall_qualification_rate ?? 0, format: 'percent', icon: Clock, iconColor: CHART_COLORS.amber.DEFAULT },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Leads by Support Agent Report" />
            <div className="p-5 lg:p-7.5 space-y-5">
                <ReportFiltersBar filters={filters} onChange={setFilters} offices={offices} services={services} sources={sources} showGroupBy={false} />
                <ReportSummaryCards items={summaryCards} isLoading={isLoading} />

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Agent Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[350px] w-full" />
                        ) : tableData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                <BarChart data={tableData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="agent_name" type="category" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={120} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="qualified_leads" fill={CHART_COLORS.violet.DEFAULT} radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="won_leads" fill={CHART_COLORS.emerald.DEFAULT} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-[350px] items-center justify-center text-muted-foreground">No data available</div>
                        )}
                    </CardContent>
                </Card>

                <ReportDataTable title="Agent Details" data={tableData as any} columns={columns as any} isLoading={isLoading} />
            </div>
        </AppLayout>
    );
}
