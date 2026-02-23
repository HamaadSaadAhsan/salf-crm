import { useMemo, useState } from 'react';
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
import {
  Building,
  Search,
  X,
  Edit,
  Trash2,
  MapPin,
  Users,
  Mail,
  Phone,
  Globe,
} from 'lucide-react';
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
import { Office } from './index';

interface OfficeListProps {
  offices?: Office[];
  onEditOffice?: (office: Office) => void;
}

const OfficeList = ({ offices, onEditOffice }: OfficeListProps) => {
  const officesList = Array.isArray(offices) ? offices : [];
  const [searchQuery, setSearchQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    left: ['select', 'name'],
    right: [],
  });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [deleteOffice, setDeleteOffice] = useState<Office | null>(null);

  const columns: ColumnDef<Office>[] = [
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
        <DataGridColumnHeader column={column} title="Office Name" />
      ),
      cell: ({ row }) => {
        const office = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Building className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{office.name}</span>
              {office.code && (
                <span className="text-xs text-muted-foreground">
                  {office.code}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'zone',
      size: 180,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Zone" />
      ),
      cell: ({ row }) => {
        const office = row.original;
        return office.zone ? (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{office.zone.name}</span>
              {office.zone.code && (
                <span className="text-xs text-muted-foreground">
                  {office.zone.code}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No Zone</span>
        );
      },
    },
    {
      accessorKey: 'city',
      size: 150,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Location" />
      ),
      cell: ({ row }) => {
        const office = row.original;
        const location = [office.city, office.country_code]
          .filter(Boolean)
          .join(', ');
        return location ? (
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{location}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'address',
      size: 250,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Address" />
      ),
      cell: ({ row }) => {
        const address = row.getValue('address') as string;
        return address ? (
          <div className="max-w-[250px] truncate text-sm text-muted-foreground">
            {address}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'phone',
      size: 150,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string;
        return phone ? (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{phone}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'email',
      size: 200,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => {
        const email = row.getValue('email') as string;
        return email ? (
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{email}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
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
        const office = row.original;
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
              <DropdownMenuItem onClick={() => onEditOffice?.(office)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Office
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteOffice(office)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Office
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: officesList,
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
    if (!deleteOffice) return;

    router.delete(`/offices/${deleteOffice.id}`, {
      onSuccess: () => {
        setDeleteOffice(null);
      },
      onError: (errors) => {
        console.error('Delete error:', errors);
      },
    });
  };

  return (
      <DataGrid table={table} recordCount={officesList.length}>
          <Card className="border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div className="flex flex-1 items-center space-x-2">
                      <div className="relative max-w-sm flex-1">
                          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                              placeholder="Search offices..."
                              value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
                              onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
                              className="h-9 pl-9"
                          />
                      </div>
                      {table.getColumn('name')?.getFilterValue() && (
                          <Button variant="ghost" onClick={() => table.getColumn('name')?.setFilterValue('')} className="h-9 px-2 lg:px-3">
                              Reset
                              <X className="ml-2 h-4 w-4" />
                          </Button>
                      )}
                  </div>
                  <div className="flex items-center gap-2">
                      <DataGridColumnVisibility table={table} trigger={undefined} />
                  </div>
              </CardHeader>
              <CardTable>
                  <DataGridTable />
              </CardTable>
              <CardFooter className="pt-4">
                  <DataGridPagination />
              </CardFooter>
          </Card>

          <AlertDialog open={!!deleteOffice} onOpenChange={() => setDeleteOffice(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Delete Office</AlertDialogTitle>
                      <AlertDialogDescription>
                          Are you sure you want to delete "{deleteOffice?.name}"? This action cannot be undone. This office has{' '}
                          {deleteOffice?.users_count} users assigned.
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

export default OfficeList;
