import { useState } from 'react';
import {
    ColumnDef,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import { Card, CardFooter, CardHeader, CardTable, CardTitle } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportDataTableProps<TData> {
    title: string;
    data: TData[];
    columns: ColumnDef<TData, unknown>[];
    isLoading?: boolean;
}

export function ReportDataTable<TData extends Record<string, unknown>>({
    title,
    data,
    columns,
    isLoading = false,
}: ReportDataTableProps<TData>) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: { pageSize: 10 },
        },
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <div className="p-6 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </div>
            </Card>
        );
    }

    return (
        <DataGrid table={table} recordCount={data.length} tableLayout={{ cellBorder: true, headerBackground: true }}>
            <Card className="border-0 shadow-none">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold">{title}</CardTitle>
                </CardHeader>
                <CardTable>
                    <DataGridTable />
                </CardTable>
                {data.length > 10 && (
                    <CardFooter className="pt-4">
                        <DataGridPagination />
                    </CardFooter>
                )}
            </Card>
        </DataGrid>
    );
}
