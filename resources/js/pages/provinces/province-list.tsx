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
import { MapPin, Search, X, Edit, Trash2, Globe } from 'lucide-react';
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
import { Province } from './index';

interface ProvinceListProps {
  provinces?: Province[];
  onEditProvince?: (province: Province) => void;
}

const ProvinceList = ({ provinces, onEditProvince }: ProvinceListProps) => {
  const provincesList = Array.isArray(provinces) ? provinces : [];
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
  const [deleteProvince, setDeleteProvince] = useState<Province | null>(null);

  const columns: ColumnDef<Province>[] = [
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
        <DataGridColumnHeader column={column} title="Province Name" />
      ),
      cell: ({ row }) => {
        const province = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{province.name}</span>
              <span className="text-xs text-muted-foreground">
                {province.code}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'country.name',
      size: 200,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Country" />
      ),
      cell: ({ row }) => {
        const country = row.original.country;
        return country ? (
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{country.name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'cities_count',
      size: 120,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Cities" />
      ),
      cell: ({ row }) => {
        const count = row.getValue('cities_count') as number;
        return (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
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
        const province = row.original;
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
              <DropdownMenuItem onClick={() => onEditProvince?.(province)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Province
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteProvince(province)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Province
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: provincesList,
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
    if (!deleteProvince) return;

    router.delete(`/provinces/${deleteProvince.id}`, {
      onSuccess: () => {
        setDeleteProvince(null);
      },
      onError: (errors) => {
        console.error('Delete error:', errors);
      },
    });
  };

  return (
    <DataGrid table={table} recordCount={provincesList.length}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search provinces..."
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

      <AlertDialog
        open={!!deleteProvince}
        onOpenChange={() => setDeleteProvince(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Province</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteProvince?.name}"? This
              action cannot be undone. This province has{' '}
              {deleteProvince?.cities_count} cities.
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

export default ProvinceList;
