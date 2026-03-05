import { useState } from 'react';
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
import { MapPin, Search, X, Edit, Trash2, Building, Users, FileText, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Zone } from './index';

interface ZoneListProps {
  zones?: Zone[];
  onEditZone?: (zone: Zone) => void;
}

const ZoneList = ({ zones, onEditZone }: ZoneListProps) => {
  const zonesList = Array.isArray(zones) ? zones : [];
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});
  const [columnPinning] = useState<ColumnPinningState>({
    left: ['select', 'name'],
    right: [],
  });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [deleteZone, setDeleteZone] = useState<Zone | null>(null);

  const columns: ColumnDef<Zone>[] = [
    {
      id: 'select',
      size: 40,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-0.5"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
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
      size: 250,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Zone Name" />
      ),
      cell: ({ row }) => {
        const zone = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{zone.name}</span>
              {zone.code && (
                <span className="text-xs text-muted-foreground">
                  {zone.code}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'description',
      size: 300,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => {
        const description = row.getValue('description') as string;
        return description ? (
          <div className="max-w-[300px] truncate text-sm text-muted-foreground">
            {description}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'country_code',
      size: 120,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Country" />
      ),
      cell: ({ row }) => {
        const code = row.getValue('country_code') as string;
        return code ? (
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{code.toUpperCase()}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'offices_count',
      size: 100,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Offices" />
      ),
      cell: ({ row }) => {
        const count = row.getValue('offices_count') as number;
        return (
          <div className="flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{count}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'users_count',
      size: 100,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Users" />
      ),
      cell: ({ row }) => {
        const count = row.getValue('users_count') as number;
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
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Leads" />
      ),
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
      accessorKey: 'is_active',
      size: 100,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const isActive = row.getValue('is_active') as boolean;
        return (
          <Badge variant={isActive ? 'success' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      size: 60,
      cell: ({ row }) => {
        const zone = row.original;
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
              <DropdownMenuItem onClick={() => onEditZone?.(zone)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Zone
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteZone(zone)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Zone
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: zonesList,
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
    if (!deleteZone) return;

    router.delete(`/zones/${deleteZone.id}`, {
      onSuccess: () => {
        setDeleteZone(null);
      },
      onError: (errors) => {
        console.error('Delete error:', errors);
      },
    });
  };

  return (
    <DataGrid table={table} recordCount={zonesList.length}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search zones..."
                value={
                  (table.getColumn('name')?.getFilterValue() as string) ?? ''
                }
                onChange={(event) =>
                  table.getColumn('name')?.setFilterValue(event.target.value)
                }
                className="pl-9 h-9"
              />
            </div>
            {!!table.getColumn('name')?.getFilterValue() && (
              <Button
                variant="ghost"
                onClick={() => table.getColumn('name')?.setFilterValue('')}
                className="h-9 px-2 lg:px-3"
              >
                Reset
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DataGridColumnVisibility table={table} />
          </div>
        </CardHeader>
        <CardTable>
          <DataGridTable />
        </CardTable>
        <CardFooter className="pt-4">
          <DataGridPagination />
        </CardFooter>
      </Card>

      <AlertDialog open={!!deleteZone} onOpenChange={() => setDeleteZone(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Zone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteZone?.name}"? This action
              cannot be undone. This zone has {deleteZone?.users_count} users
              and {deleteZone?.leads_count} leads assigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DataGrid>
  );
};

export default ZoneList;
