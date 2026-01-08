import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { router } from '@inertiajs/react';
import {
    ColumnDef,
    ColumnFiltersState,
    ColumnPinningState,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import { Briefcase, Edit, FileText, GitBranch, Search, Trash2, Users, X } from 'lucide-react';
import { useState } from 'react';
import { Service } from './index';

interface ServiceListProps {
    services?: Service[];
    onEditService?: (service: Service) => void;
}

const ServiceList = ({ services, onEditService }: ServiceListProps) => {
    const servicesList = Array.isArray(services) ? services : [];
    const [searchQuery, setSearchQuery] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
        left: ['select', 'name'],
        right: [],
    });
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [deleteService, setDeleteService] = useState<Service | null>(null);

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'draft':
                return 'secondary';
            case 'inactive':
                return 'outline';
            case 'archived':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    const columns: ColumnDef<Service>[] = [
        {
            id: 'select',
            size: 40,
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    size="sm"
                    aria-label="Select all"
                    className="translate-y-0.5"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    size="sm"
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                    className="translate-y-0.5"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'name',
            size: 300,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Service Name" />,
            cell: ({ row }) => {
                const service = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                            <Briefcase className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{service.name}</span>
                                {service.is_parent && <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                            {service.parent_name && <span className="text-xs text-muted-foreground">Parent: {service.parent_name}</span>}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'detail',
            size: 300,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Description" />,
            cell: ({ row }) => {
                const detail = row.getValue('detail') as string;
                return detail ? (
                    <div className="max-w-[300px] truncate text-sm text-muted-foreground">{detail}</div>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                );
            },
        },
        {
            accessorKey: 'country_name',
            size: 150,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Country" />,
            cell: ({ row }) => {
                const countryName = row.getValue('country_name') as string;
                const countryCode = row.original.country_code;
                return countryName ? (
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">{countryName}</span>
                        {countryCode && <span className="text-xs text-muted-foreground">({countryCode.toUpperCase()})</span>}
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                );
            },
        },
        {
            accessorKey: 'children_count',
            size: 120,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Sub-Services" />,
            cell: ({ row }) => {
                const count = row.getValue('children_count') as number;
                return (
                    <div className="flex items-center gap-1.5">
                        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{count}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'active_users_count',
            size: 100,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Users" />,
            cell: ({ row }) => {
                const count = row.getValue('active_users_count') as number;
                return (
                    <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{count}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'leads_count',
            size: 100,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Leads" />,
            cell: ({ row }) => {
                const count = row.getValue('leads_count') as number;
                return (
                    <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{count}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'sort_order',
            size: 100,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Sort Order" />,
            cell: ({ row }) => {
                const sortOrder = row.getValue('sort_order') as number;
                return <span className="text-sm font-medium">{sortOrder}</span>;
            },
        },
        {
            accessorKey: 'status',
            size: 120,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
            cell: ({ row }) => {
                const status = row.getValue('status') as string;
                return <Badge variant={getStatusVariant(status)}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
            },
        },
        {
            id: 'actions',
            size: 60,
            cell: ({ row }) => {
                const service = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="19" r="1" />
                                </svg>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onEditService?.(service)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Service
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteService(service)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Service
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const table = useReactTable({
        data: servicesList,
        columns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            columnPinning,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onColumnPinningChange: setColumnPinning,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        initialState: {
            pagination: {
                pageSize: 25,
            },
        },
    });

    const handleDelete = () => {
        if (!deleteService) return;

        router.delete(`/services/${deleteService.id}`, {
            onSuccess: () => {
                setDeleteService(null);
            },
            onError: (errors) => {
                console.error('Delete error:', errors);
            },
        });
    };

    return (
        <DataGrid
            table={table}
            recordCount={servicesList.length}
            tableLayout={{
                dense: true,
                columnsResizable: true,
                columnsVisibility: true,
                columnsPinnable: true,
                columnsMovable: true,
            }}
        >
            <Card className="border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="flex flex-1 items-center space-x-2">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search services..."
                                value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
                                onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
                                className="h-9 pl-9"
                            />
                        </div>
                        {(table.getColumn('name')?.getFilterValue() as string) && (
                            <Button size="sm" variant="ghost" onClick={() => table.getColumn('name')?.setFilterValue('')} className="">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <DataGridColumnVisibility
                            table={table}
                            trigger={
                                <Button variant="outline" size="sm">
                                    Columns
                                </Button>
                            }
                        />
                    </div>
                </CardHeader>
                <CardTable>
                    <ScrollArea className="max-h-[calc(100vh-300px)]">
                        <DataGridTable />
                    </ScrollArea>
                </CardTable>
                <CardFooter className="container-fluid py-0">
                    <DataGridPagination className="py-1" />
                </CardFooter>
            </Card>

            <AlertDialog open={!!deleteService} onOpenChange={() => setDeleteService(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Service</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteService?.name}"? This action cannot be undone. This service has{' '}
                            {deleteService?.active_users_count} users, {deleteService?.leads_count} leads, and {deleteService?.children_count}{' '}
                            sub-services assigned.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DataGrid>
    );
};

export default ServiceList;
