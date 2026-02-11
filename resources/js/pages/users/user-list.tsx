import { Fragment, useMemo, useState } from 'react';
import {
  Cell,
  ColumnDef,
  ColumnFiltersState,
  ColumnPinningState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  HeaderGroup,
  Row,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Building, Search, Shield, X, Edit, MapPin, Globe, Building2, UserCog, MoreVertical } from 'lucide-react';
import { EditOfficeSheet } from './edit-office-sheet';
import { EditZoneSheet } from './edit-zone-sheet';
import { EditServicesSheet } from './edit-services-sheet';
import { Link, router, usePage } from '@inertiajs/react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowExpandded,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableRowSpacer,
} from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { type SharedData } from '@/types';

interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  active_services_count?: number;
  leads_count?: number;
  active_leads_count?: number;
  zone_id?: number;
  office_id?: number;
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
  zone?: {
    id: number;
    name: string;
    code?: string;
  };
  office?: {
    id: number;
    name: string;
    code?: string;
    zone?: {
      id: number;
      name: string;
    };
  };
  created_at: string;
  updated_at: string;
}

interface Zone {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
}

interface Office {
  id: number;
  name: string;
  code?: string;
  zone_id?: number;
  zone?: {
    id: number;
    name: string;
  };
  is_active: boolean;
}

interface Service {
  id: number;
  name: string;
  detail?: string;
  country_code?: string;
  country_name?: string;
  parent_id?: number;
  children?: Service[];
}

interface UserListProps {
  users?: User[];
  zones?: Zone[];
  offices?: Office[];
  services?: Service[];
  filter?: 'all' | 'active' | 'inactive';
}

const UserList = ({ users, zones = [], offices = [], services = [] }: UserListProps) => {
  // Ensure users is always an array
  const usersList = Array.isArray(users) ? users : [];
  const { auth } = usePage<SharedData>().props;
  const isSuperAdmin = auth.isSuperAdmin;
  const currentUserId = auth.user.id;

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
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<number[]>([]);
  const [selectedOffices, setSelectedOffices] = useState<number[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showOfficeSheet, setShowOfficeSheet] = useState(false);
  const [showZoneSheet, setShowZoneSheet] = useState(false);
  const [showServicesSheet, setShowServicesSheet] = useState(false);

  // Impersonate a user (super admin only)
  const handleImpersonate = (user: User) => {
    if (!isSuperAdmin || user.id === currentUserId) return;

    // Check if target user is super-admin (cannot impersonate)
    const isSuperAdminUser = user.roles?.some(role => role.name === 'super-admin');
    if (isSuperAdminUser) return;

    router.post(`/impersonate/${user.id}`);
  };

  // Check if a user can be impersonated
  const canImpersonate = (user: User): boolean => {
    if (!isSuperAdmin) return false;
    if (user.id === currentUserId) return false;
    const isSuperAdminUser = user.roles?.some(role => role.name === 'super-admin');
    return !isSuperAdminUser;
  };

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
      minSize: 180,
      size: 250,
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
      cell: ({ row }) => {
        const services = row.original.active_services || [];
        const maxVisible = 1;
        const visibleServices = services.slice(0, maxVisible);
        const remainingCount = services.length - maxVisible;

        return (
          <div className="flex items-center gap-1 min-w-0">
            {services.length > 0 ? (
              <>
                {visibleServices.map((service) => (
                  <Badge
                    key={service.id}
                    variant="outline"
                    className="text-xs max-w-[160px] shrink-0"
                    title={service.name}
                  >
                    <span className="truncate block">
                      {service.name}
                    </span>
                  </Badge>
                ))}
                {remainingCount > 0 && (
                  <Badge variant="secondary" size="sm" className="text-xs shrink-0">
                    +{remainingCount}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-muted-foreground text-xs">
                No programs assigned
              </span>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'zone',
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Zone" />
      ),
      minSize: 150,
      size: 180,
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.original.zone ? (
            <span className="text-sm">
              {row.original.zone.name}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">No zone</span>
          )}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'office',
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Office" />
      ),
      minSize: 150,
      size: 200,
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.original.office ? (
            <span className="text-sm">
              {row.original.office.name}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">No office</span>
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
    {
      id: 'actions',
      header: () => <></>,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="pointer-events-none opacity-0 transition-opacity duration-300 group-hover/row:pointer-events-auto group-hover/row:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:opacity-100"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem onClick={() => handleEditPrograms(user)}>
                <Building className="mr-2 h-4 w-4" />
                Edit Programs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditOffice(user)}>
                <MapPin className="mr-2 h-4 w-4" />
                Edit Office
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditRegion(user)}>
                <Globe className="mr-2 h-4 w-4" />
                Edit Region
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/users/${user.id}`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {canImpersonate(user) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleImpersonate(user)}
                    className="text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    Impersonate User
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 60,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
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

    // Apply zone filter
    if (selectedZones.length > 0) {
      filtered = filtered.filter(
        (user) =>
          user.zone_id && selectedZones.includes(user.zone_id),
      );
    }

    // Apply office filter
    if (selectedOffices.length > 0) {
      filtered = filtered.filter(
        (user) =>
          user.office_id && selectedOffices.includes(user.office_id),
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
  }, [usersList, selectedRoles, selectedPrograms, selectedZones, selectedOffices, searchQuery]);

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
    setShowServicesSheet(true);
  };

  const handleEditOffice = (user: User) => {
    setEditingUser(user);
    setShowOfficeSheet(true);
  };

  const handleEditRegion = (user: User) => {
    setEditingUser(user);
    setShowZoneSheet(true);
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

              {/* Zone Filter */}
              {zones.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Globe className="size-4" />
                      Zones
                      {selectedZones.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {selectedZones.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search zones..." />
                      <CommandList>
                        <CommandEmpty>No zones found.</CommandEmpty>
                        <CommandGroup>
                          {zones.filter((z) => z.is_active).map((zone) => (
                            <CommandItem
                              key={zone.id}
                              value={zone.name}
                              className="flex items-center gap-2.5 bg-transparent!"
                            >
                              <Checkbox
                                id={`zone-${zone.id}`}
                                checked={selectedZones.includes(zone.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedZones((prev) =>
                                    checked
                                      ? [...prev, zone.id]
                                      : prev.filter((id) => id !== zone.id),
                                  );
                                }}
                                size="sm"
                              />
                              {zone.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}

              {/* Office Filter */}
              {offices.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Building2 className="size-4" />
                      Offices
                      {selectedOffices.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {selectedOffices.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search offices..." />
                      <CommandList>
                        <CommandEmpty>No offices found.</CommandEmpty>
                        <CommandGroup>
                          {offices.filter((o) => o.is_active).map((office) => (
                            <CommandItem
                              key={office.id}
                              value={office.name}
                              className="flex items-center gap-2.5 bg-transparent!"
                            >
                              <Checkbox
                                id={`office-${office.id}`}
                                checked={selectedOffices.includes(office.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedOffices((prev) =>
                                    checked
                                      ? [...prev, office.id]
                                      : prev.filter((id) => id !== office.id),
                                  );
                                }}
                                size="sm"
                              />
                              {office.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}

              {/* Clear Filters */}
              {(selectedRoles.length > 0 || selectedPrograms.length > 0 || selectedZones.length > 0 || selectedOffices.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRoles([]);
                    setSelectedPrograms([]);
                    setSelectedZones([]);
                    setSelectedOffices([]);
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
          <ScrollArea>
            <DataGridTableBase>
              <DataGridTableHead>
                {table.getHeaderGroups().map((headerGroup: HeaderGroup<User>, index) => (
                  <DataGridTableHeadRow headerGroup={headerGroup} key={index}>
                    {headerGroup.headers.map((header, hIndex) => (
                      <DataGridTableHeadRowCell header={header} key={hIndex}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanResize() && (
                          <DataGridTableHeadRowCellResize header={header} />
                        )}
                      </DataGridTableHeadRowCell>
                    ))}
                  </DataGridTableHeadRow>
                ))}
              </DataGridTableHead>
              <DataGridTableRowSpacer />
              <DataGridTableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row: Row<User>) => (
                    <Fragment key={row.id}>
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <tr
                            data-state={row.getIsSelected() ? 'selected' : undefined}
                            className="group/row hover:bg-muted/40 data-[state=selected]:bg-muted/50 [&:not(:last-child)>td]:border-b [&_>:first-child]:relative"
                          >
                            {row.getVisibleCells().map((cell: Cell<User, unknown>, colIndex) => (
                              <DataGridTableBodyRowCell cell={cell} key={colIndex}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </DataGridTableBodyRowCell>
                            ))}
                          </tr>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-56">
                          <ContextMenuItem onClick={() => handleEditPrograms(row.original)}>
                            <Building className="mr-2 h-4 w-4" />
                            Edit Programs
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleEditOffice(row.original)}>
                            <MapPin className="mr-2 h-4 w-4" />
                            Edit Office
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleEditRegion(row.original)}>
                            <Globe className="mr-2 h-4 w-4" />
                            Edit Region
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem asChild>
                            <Link href={`/users/${row.original.id}`} className="flex items-center">
                              <Edit className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </ContextMenuItem>
                          {canImpersonate(row.original) && (
                            <>
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                onClick={() => handleImpersonate(row.original)}
                                className="text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                              >
                                <UserCog className="mr-2 h-4 w-4" />
                                Impersonate User
                              </ContextMenuItem>
                            </>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                      {row.getIsExpanded() && <DataGridTableBodyRowExpandded row={row} />}
                    </Fragment>
                  ))
                ) : (
                  <DataGridTableEmpty />
                )}
              </DataGridTableBody>
            </DataGridTableBase>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>

        <CardFooter className="container-fluid py-0">
          <DataGridPagination className="py-1" />
        </CardFooter>
      </Card>

      {/* Edit Sheets */}
      <EditOfficeSheet
        open={showOfficeSheet}
        onOpenChange={setShowOfficeSheet}
        user={editingUser}
        offices={offices.filter((o) => o.is_active)}
      />
      <EditZoneSheet
        open={showZoneSheet}
        onOpenChange={setShowZoneSheet}
        user={editingUser}
        zones={zones.filter((z) => z.is_active)}
      />
      <EditServicesSheet
        open={showServicesSheet}
        onOpenChange={setShowServicesSheet}
        user={editingUser}
        services={services}
      />
    </DataGrid>
  );
};

export default UserList;
