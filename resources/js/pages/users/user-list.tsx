import { useMemo, useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  Row,
  flexRender,
} from '@tanstack/react-table';
import { Building, Search, Shield, X, Edit, MapPin, Globe } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  active_services_count?: number;
  leads_count?: number;
  active_leads_count?: number;
  active_services?: Array<{
    id: number;
    name: string;
    country_code?: string;
    country_name?: string;
  }>;
  roles?: Array<{
    id: number;
    name: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface UserListProps {
  users?: User[];
  filter?: 'all' | 'active' | 'inactive';
}

const UserList = ({ users, filter = 'all' }: UserListProps) => {
  // Ensure users is always an array
  const usersList = Array.isArray(users) ? users : [];
  const [searchQuery, setSearchQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});
  const [columnPinning, setColumnPinning] = useState({
    left: ['select', 'name'],
    right: [],
  });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editMode, setEditMode] = useState<
    'programs' | 'office' | 'region' | null
  >(null);

  const columns: ColumnDef<User>[] = [
    {
      id: 'select',
      size: 40,
      minSize: 40,
      maxSize: 40,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          size="sm"
          className="ms-1.5 align-middle"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          size="sm"
          className="ms-1.5 align-middle"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Name" />
      ),
      minSize: 180,
      size: 220,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-6">
            <AvatarFallback>
              {row.original.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Link
            href={`/users/${row.original.id}`}
            className="font-medium text-foreground hover:text-primary whitespace-nowrap"
          >
            {row.original.name}
          </Link>
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Email" />
      ),
      minSize: 200,
      size: 250,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm truncate max-w-[200px]" title={row.original.email}>
            {row.original.email}
          </span>
          {row.original.email_verified_at && (
            <Badge variant="outline" className="text-xs shrink-0">
              Verified
            </Badge>
          )}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'roles',
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Roles" />
      ),
      minSize: 150,
      size: 180,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles && row.original.roles.length > 0 ? (
            row.original.roles.map((role) => (
              <Badge key={role.id} variant="secondary" className="text-xs">
                {role.name}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-xs">No roles</span>
          )}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'active_services',
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Programs" />
      ),
      minSize: 200,
      size: 280,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.active_services &&
          row.original.active_services.length > 0 ? (
            row.original.active_services.map((service) => (
              <Badge key={service.id} variant="outline" className="text-xs">
                {service.name}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-xs">
              No programs assigned
            </span>
          )}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'active_services_count',
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Programs Count" />
      ),
      size: 140,
      minSize: 120,
      maxSize: 140,
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.active_services_count || 0}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'leads_count',
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Total Leads" />
      ),
      size: 110,
      minSize: 100,
      maxSize: 110,
      cell: ({ row }) => (
        <div className="text-center">{row.original.leads_count || 0}</div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'active_leads_count',
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Active Leads" />
      ),
      size: 120,
      minSize: 110,
      maxSize: 120,
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.active_leads_count || 0}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Created At" />
      ),
      size: 160,
      minSize: 150,
      maxSize: 180,
      cell: ({ row }) => {
        const date = new Date(row.original.created_at);
        return <span className="whitespace-nowrap">{formatDate(date)}</span>;
      },
      enableSorting: true,
    },
  ];

  // Get all unique roles and programs from users
  const allRoles = useMemo(() => {
    const rolesSet = new Set<string>();
    usersList.forEach((user) => {
      user.roles?.forEach((role) => rolesSet.add(role.name));
    });
    return Array.from(rolesSet);
  }, [usersList]);

  const allPrograms = useMemo(() => {
    const programsSet = new Set<string>();
    usersList.forEach((user) => {
      user.active_services?.forEach((service) =>
        programsSet.add(service.name),
      );
    });
    return Array.from(programsSet);
  }, [usersList]);

  const filteredUsers = useMemo(() => {
    let filtered = usersList;

    // Apply role filter
    if (selectedRoles.length > 0) {
      filtered = filtered.filter(
        (user) =>
          user.roles?.some((role) => selectedRoles.includes(role.name)),
      );
    }

    // Apply program filter
    if (selectedPrograms.length > 0) {
      filtered = filtered.filter(
        (user) =>
          user.active_services?.some((service) =>
            selectedPrograms.includes(service.name),
          ),
      );
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [usersList, selectedRoles, selectedPrograms, searchQuery]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleEditPrograms = (user: User) => {
    setEditingUser(user);
    setEditMode('programs');
    // TODO: Open programs edit dialog
    console.log('Edit programs for user:', user);
  };

  const handleEditOffice = (user: User) => {
    setEditingUser(user);
    setEditMode('office');
    // TODO: Open office edit dialog
    console.log('Edit office for user:', user);
  };

  const handleEditRegion = (user: User) => {
    setEditingUser(user);
    setEditMode('region');
    // TODO: Open region edit dialog
    console.log('Edit region for user:', user);
  };

  const table = useReactTable({
    data: filteredUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      columnPinning,
      rowSelection,
    },
  });

  return (
    <DataGrid
      table={table}
      recordCount={filteredUsers.length}
      tableLayout={{
        dense: true,
        columnsPinnable: true,
        columnsResizable: true,
        columnsMovable: true,
        columnsVisibility: true,
      }}
    >
      <Card className="border-none shadow-none">
        <CardHeader className="container-fluid py-3 -mt-4">
          <div className="flex items-center flex-wrap gap-2 justify-between w-full">
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                <Input
                  variant="sm"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9 w-48 rounded-lg border-gray-300 focus:border-blue-500"
                />
                {searchQuery.length > 0 && (
                  <Button
                    mode="icon"
                    variant="ghost"
                    className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchQuery('')}
                  >
                    <X />
                  </Button>
                )}
              </div>

              {/* Role Filter */}
              {allRoles.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Shield className="size-4" />
                      Roles
                      {selectedRoles.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {selectedRoles.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search roles..." />
                      <CommandList>
                        <CommandEmpty>No roles found.</CommandEmpty>
                        <CommandGroup>
                          {allRoles.map((role) => (
                            <CommandItem
                              key={role}
                              value={role}
                              className="flex items-center gap-2.5 bg-transparent!"
                            >
                              <Checkbox
                                id={role}
                                checked={selectedRoles.includes(role)}
                                onCheckedChange={(checked) => {
                                  setSelectedRoles((prev) =>
                                    checked
                                      ? [...prev, role]
                                      : prev.filter((r) => r !== role),
                                  );
                                }}
                                size="sm"
                              />
                              {role}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}

              {/* Programs Filter */}
              {allPrograms.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Building className="size-4" />
                      Programs
                      {selectedPrograms.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {selectedPrograms.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search programs..." />
                      <CommandList>
                        <CommandEmpty>No programs found.</CommandEmpty>
                        <CommandGroup>
                          {allPrograms.map((program) => (
                            <CommandItem
                              key={program}
                              value={program}
                              className="flex items-center gap-2.5 bg-transparent!"
                            >
                              <Checkbox
                                id={program}
                                checked={selectedPrograms.includes(program)}
                                onCheckedChange={(checked) => {
                                  setSelectedPrograms((prev) =>
                                    checked
                                      ? [...prev, program]
                                      : prev.filter((p) => p !== program),
                                  );
                                }}
                                size="sm"
                              />
                              {program}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}

              {/* Clear Filters */}
              {(selectedRoles.length > 0 || selectedPrograms.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRoles([]);
                    setSelectedPrograms([]);
                  }}
                >
                  Clear Filters
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
          </div>
        </CardHeader>

        <CardTable>
          <ScrollArea className="max-h-[calc(100vh-320px)]">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm table-auto">
                <thead className="[&_tr]:border-b">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="h-10 px-2.5 text-left align-middle font-medium text-muted-foreground whitespace-nowrap"
                          style={{
                            width: header.getSize() !== 150 ? header.getSize() : 'auto',
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <ContextMenu key={row.id}>
                        <ContextMenuTrigger asChild>
                          <tr
                            data-state={row.getIsSelected() && 'selected'}
                            className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className="p-2.5 align-middle"
                                style={{
                                  width: cell.column.getSize() !== 150 ? cell.column.getSize() : 'auto',
                                  minWidth: cell.column.columnDef.minSize,
                                  maxWidth: cell.column.columnDef.maxSize,
                                }}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </td>
                            ))}
                          </tr>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-56">
                          <ContextMenuItem
                            onClick={() => handleEditPrograms(row.original)}
                          >
                            <Building className="mr-2 h-4 w-4" />
                            <span>Edit Programs</span>
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => handleEditOffice(row.original)}
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            <span>Edit Office</span>
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => handleEditRegion(row.original)}
                          >
                            <Globe className="mr-2 h-4 w-4" />
                            <span>Edit Region</span>
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem asChild>
                            <Link
                              href={`/users/${row.original.id}`}
                              className="flex items-center"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>View Details</span>
                            </Link>
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No results.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>

        <CardFooter className="container-fluid py-0">
          <DataGridPagination className="py-1" />
        </CardFooter>
      </Card>
    </DataGrid>
  );
};

export default UserList;