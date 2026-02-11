import { useState, useMemo, useEffect } from 'react';
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
import { type DragEndEvent } from '@dnd-kit/core';
import { ListChecks, Search, X, Edit, Trash2, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTableDndRows, DataGridTableDndRowHandle } from '@/components/ui/data-grid-table-dnd-rows';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import axios from '@/lib/axios';
import { router } from '@inertiajs/react';
import { type Status } from './index';

interface StatusListProps {
  statuses?: Status[];
  onEditStatus?: (status: Status) => void;
  onDeleteStatus?: (status: Status) => void;
}

export function StatusList({ statuses, onEditStatus, onDeleteStatus }: StatusListProps) {
  const statusesList = Array.isArray(statuses) ? statuses : [];
  const [sorting, setSorting] = useState<SortingState>([{ id: 'order', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnPinning] = useState<ColumnPinningState>({
    left: ['select', 'order', 'name'],
    right: [],
  });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isReordering, setIsReordering] = useState(false);
  const [localStatuses, setLocalStatuses] = useState<Status[]>(statusesList);

  // Update local statuses when props change
  useEffect(() => {
    setLocalStatuses(statusesList);
  }, [statusesList]);

  // Generate unique IDs for drag and drop
  const dataIds = useMemo(() => {
    return localStatuses.map((status) => `status-${status.id}`);
  }, [localStatuses]);

  // Handle drag end event
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = dataIds.indexOf(active.id as string);
    const newIndex = dataIds.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Create new order array
    const reorderedStatuses = [...localStatuses];
    const [movedStatus] = reorderedStatuses.splice(oldIndex, 1);
    reorderedStatuses.splice(newIndex, 0, movedStatus);

    // Update order values
    const orderUpdates = reorderedStatuses.map((status, index) => ({
      id: status.id,
      order: index + 1,
    }));

    // Optimistically update local state
    const updatedStatuses = reorderedStatuses.map((status, index) => ({
      ...status,
      order: index + 1,
    }));
    setLocalStatuses(updatedStatuses);
    setIsReordering(true);

    try {
      await axios.post('/statuses/reorder', { orders: orderUpdates });
      // Reload to get fresh data from server
      router.reload({ only: ['statuses'], preserveScroll: true });
    } catch (error: any) {
      console.error('Failed to reorder statuses:', error);
      const errorMessage = error.response?.data?.message || 'Failed to reorder statuses.';
      alert(errorMessage);
      // Revert on error
      setLocalStatuses(statusesList);
    } finally {
      setIsReordering(false);
    }
  };

  const columns: ColumnDef<Status>[] = [
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
      accessorKey: 'order',
      size: 100,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="#" />
      ),
      cell: ({ row }) => {
        const status = row.original;
        return (
          <div className="flex items-center gap-2">
            <DataGridTableDndRowHandle rowId={row.id} />
            <span className="text-sm font-medium">{row.getValue('order')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      size: 250,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Status Name" />
      ),
      cell: ({ row }) => {
        const status = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <ListChecks className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{status.name}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'color',
      size: 150,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Color" />
      ),
      cell: ({ row }) => {
        const color = row.getValue('color') as string;
        return (
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded border border-border"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm font-mono text-muted-foreground">
              {color}
            </span>
          </div>
        );
      },
    },
    {
      id: 'preview',
      size: 120,
      header: 'Preview',
      cell: ({ row }) => {
        const status = row.original;
        return (
          <Badge
            style={{
              backgroundColor: status.color,
              color: getContrastColor(status.color),
            }}
          >
            {status.name}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      size: 60,
      cell: ({ row }) => {
        const status = row.original;
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
              <DropdownMenuItem onClick={() => onEditStatus?.(status)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDeleteStatus?.(status)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: localStatuses,
    columns,
    getRowId: (row) => `status-${row.id}`,
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

  // Create a key based on status IDs and orders to force remount when data changes
  const tableKey = useMemo(() => {
    return localStatuses.map(s => `${s.id}-${s.order}`).join(',');
  }, [localStatuses]);

  return (
    <DataGrid table={table} recordCount={localStatuses.length} key={tableKey}>
      <Card className="border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search statuses..."
                value={
                  (table.getColumn('name')?.getFilterValue() as string) ?? ''
                }
                onChange={(event) =>
                  table.getColumn('name')?.setFilterValue(event.target.value)
                }
                className="pl-9 h-9"
                disabled={isReordering}
              />
            </div>
            {!!table.getColumn('name')?.getFilterValue() && (
              <Button
                variant="ghost"
                onClick={() => table.getColumn('name')?.setFilterValue('')}
                className="h-9 px-2 lg:px-3"
                disabled={isReordering}
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
                <Button size="sm" variant="outline" disabled={isReordering}>
                  <Settings2 />
                  View Settings
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardTable>
          <DataGridTableDndRows handleDragEnd={handleDragEnd} dataIds={dataIds} />
        </CardTable>
        <CardFooter className="pt-4">
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}

// Helper function to determine contrast color (white or black)
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const color = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
