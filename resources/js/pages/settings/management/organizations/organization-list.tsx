import { useState } from 'react';
import { router } from '@inertiajs/react';
import { api } from '@/lib/api';
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
import { Landmark, Search, X, Edit, Trash2, Users, ToggleLeft, ToggleRight } from 'lucide-react';
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
import { type OrganizationItem } from './index';

interface OrganizationListProps {
  organizations?: OrganizationItem[];
  onEditOrganization?: (organization: OrganizationItem) => void;
  onDeleteOrganization?: (organization: OrganizationItem) => void;
}

export function OrganizationList({ organizations, onEditOrganization, onDeleteOrganization }: OrganizationListProps) {
  const list = Array.isArray(organizations) ? organizations : [];
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnPinning] = useState<ColumnPinningState>({
    left: ['select', 'name'],
    right: [],
  });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const handleToggleActive = async (org: OrganizationItem) => {
    try {
      await api.post(`/api/organizations/${org.id}/toggle-active`, {});
      router.reload({ only: ['organizations'] });
    } catch (err: any) {
      console.error('Toggle error:', err?.response?.data?.message || err);
    }
  };

  const columns: ColumnDef<OrganizationItem>[] = [
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
        <DataGridColumnHeader column={column} title="Organization" />
      ),
      cell: ({ row }) => {
        const org = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              {org.logo ? (
                <img src={org.logo} alt={org.name} className="h-6 w-6 rounded object-cover" />
              ) : (
                <Landmark className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{org.name}</span>
              <span className="text-xs text-muted-foreground">{org.slug}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'owner',
      size: 180,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Owner" />
      ),
      cell: ({ row }) => {
        const owner = row.original.owner;
        if (!owner) {
          return <span className="text-muted-foreground text-sm">No owner</span>;
        }
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{owner.name}</span>
            <span className="text-xs text-muted-foreground">{owner.email}</span>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'users_count',
      size: 120,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Members" />
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
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      size: 140,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = row.getValue('created_at') as string;
        if (!date) return null;
        return (
          <span className="text-sm text-muted-foreground">
            {new Date(date).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: 'actions',
      size: 60,
      cell: ({ row }) => {
        const org = row.original;
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
              <DropdownMenuItem onClick={() => onEditOrganization?.(org)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleActive(org)}>
                {org.is_active ? (
                  <>
                    <ToggleLeft className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleRight className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDeleteOrganization?.(org)}
                disabled={(org.users_count ?? 0) > 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: list,
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

  return (
    <DataGrid table={table} recordCount={list.length}>
      <Card className="border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={
                  (table.getColumn('name')?.getFilterValue() as string) ?? ''
                }
                onChange={(event) =>
                  table.getColumn('name')?.setFilterValue(event.target.value)
                }
                className="pl-9 h-9"
              />
            </div>
            {table.getColumn('name')?.getFilterValue() && (
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
          <DataGridTable table={table} columns={columns} />
        </CardTable>
        <CardFooter className="pt-4">
          <DataGridPagination table={table} />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
