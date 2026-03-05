import { useState } from 'react';
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
import { Share2, Search, X, Edit, Trash2, Users, Settings2, CheckCircle2, XCircle } from 'lucide-react';
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
import { type LeadSource } from './index';

interface LeadSourceListProps {
  leadSources?: LeadSource[];
  onEditSource?: (source: LeadSource) => void;
  onDeleteSource?: (source: LeadSource) => void;
}

export function LeadSourceList({ leadSources, onEditSource, onDeleteSource }: LeadSourceListProps) {
  const sourcesList = Array.isArray(leadSources) ? leadSources : [];
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnPinning] = useState<ColumnPinningState>({
    left: ['select', 'name'],
    right: [],
  });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const columns: ColumnDef<LeadSource>[] = [
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
        <DataGridColumnHeader column={column} title="Source Name" />
      ),
      cell: ({ row }) => {
        const source = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Share2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{source.name}</span>
              {source.slug && (
                <span className="text-xs text-muted-foreground">
                  {source.slug}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      size: 120,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return (
          <Badge variant={isActive ? 'success' : 'secondary'} className="gap-1.5">
            {isActive ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Active
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Inactive
              </>
            )}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'source_score',
      size: 120,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Source Score" />
      ),
      cell: ({ row }) => {
        const score = row.getValue('source_score') as number;
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant={score >= 8 ? 'success' : score >= 5 ? 'secondary' : score > 0 ? 'outline' : 'secondary'}>
              {score}/10
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'leads_count',
      size: 120,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Leads" />
      ),
      cell: ({ row }) => {
        const count = row.getValue('leads_count') as number;
        return (
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{count}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'identifier',
      size: 180,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Identifier" />
      ),
      cell: ({ row }) => {
        const identifier = row.getValue('identifier') as string;
        return (
          <span className="text-sm text-muted-foreground font-mono">
            {identifier}
          </span>
        );
      },
    },
    {
      id: 'actions',
      size: 60,
      cell: ({ row }) => {
        const source = row.original;
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
              <DropdownMenuItem onClick={() => onEditSource?.(source)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Source
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDeleteSource?.(source)}
                disabled={(source.leads_count ?? 0) > 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Source
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: sourcesList,
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
    <DataGrid table={table} recordCount={sourcesList.length}>
      <Card className="border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sources..."
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
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button size="sm" variant="outline">
                  <Settings2 />
                  View Settings
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardTable>
          <DataGridTable />
        </CardTable>
        <CardFooter className="pt-4">
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
