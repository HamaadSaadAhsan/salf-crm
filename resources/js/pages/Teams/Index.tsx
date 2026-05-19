import { useState } from 'react';
import { usePage } from '@inertiajs/react';
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
import { Crown, MoreHorizontal, Plus, Search, Settings2, Trash2, Users, X } from 'lucide-react';
import { Head, Link, router } from '@inertiajs/react';
import { formatDistanceToNow, parseISO } from 'date-fns';

import AppLayout from '@/layouts/app-layout';
import { Content } from '@/crm/layout/components/content';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem, type SharedData, type Team } from '@/types';
import * as teamActions from '@/actions/App/Http/Controllers/TeamController';

interface TeamRow extends Omit<Team, 'owner'> {
    members_count: number;
    invitations_count: number;
    owner: { id: number; name: string; email: string };
}

interface TeamsIndexProps {
    teams: {
        data: TeamRow[];
        meta: {
            current_page: number;
            per_page: number;
            total: number;
            last_page: number;
        };
    };
    filters: {
        search?: string;
        per_page?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Teams', href: teamActions.index().url },
];

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function TeamsIndex({ teams, filters }: TeamsIndexProps) {
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = auth.isSuperAdmin;
    const teamsList = teams?.data ?? [];

    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [columnPinning] = useState<ColumnPinningState>({ left: ['select', 'name'], right: ['actions'] });
    const [search, setSearch] = useState(filters?.search ?? '');

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(teamActions.index().url, { search: value || undefined }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleDelete = (team: TeamRow) => {
        if (!confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;
        router.delete(teamActions.destroy({ team: team.id }).url, { preserveScroll: true });
    };

    const columns: ColumnDef<TeamRow>[] = [
        {
            id: 'select',
            size: 40,
            enableHiding: false,
            enableSorting: false,
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
                    onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                    aria-label="Select all"
                    className="translate-y-0.5"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(v) => row.toggleSelected(!!v)}
                    aria-label="Select row"
                    className="translate-y-0.5"
                />
            ),
        },
        {
            accessorKey: 'name',
            size: 280,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Team" />,
            cell: ({ row }) => {
                const team = row.original;
                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="size-8 shrink-0 rounded-lg">
                            {team.avatar_url && <AvatarImage src={team.avatar_url} alt={team.name} className="rounded-lg object-cover" />}
                            <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                                {getInitials(team.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 overflow-hidden">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={teamActions.show({ team: team.id }).url}
                                        className="block truncate font-medium hover:text-primary transition-colors"
                                    >
                                        {team.name}
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>{team.name}</TooltipContent>
                            </Tooltip>
                            {team.personal_team && (
                                <p className="text-xs text-muted-foreground">Personal team</p>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'owner',
            size: 220,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Owner" />,
            cell: ({ row }) => {
                const owner = row.original.owner;
                if (!owner) return <span className="text-muted-foreground text-sm">—</span>;
                return (
                    <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(owner.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{owner.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{owner.email}</p>
                        </div>
                        <Crown className="size-3.5 shrink-0 text-amber-500" />
                    </div>
                );
            },
        },
        {
            accessorKey: 'members_count',
            size: 110,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Members" />,
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{(row.getValue('members_count') as number) + 1}</span>
                </div>
            ),
        },
        {
            accessorKey: 'invitations_count',
            size: 120,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Pending" />,
            cell: ({ row }) => {
                const count = row.getValue('invitations_count') as number;
                return count > 0
                    ? <Badge variant="warning" appearance="light" size="sm">{count} pending</Badge>
                    : <span className="text-xs text-muted-foreground">—</span>;
            },
        },
        {
            accessorKey: 'personal_team',
            size: 100,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
            cell: ({ row }) => (
                <Badge variant={row.getValue('personal_team') ? 'secondary' : 'primary'} appearance="light" size="sm">
                    {row.getValue('personal_team') ? 'Personal' : 'Team'}
                </Badge>
            ),
        },
        {
            accessorKey: 'created_at',
            size: 140,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
            cell: ({ row }) => {
                try {
                    return (
                        <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(parseISO(row.getValue('created_at')), { addSuffix: true })}
                        </span>
                    );
                } catch {
                    return <span className="text-muted-foreground">—</span>;
                }
            },
        },
        {
            id: 'actions',
            size: 56,
            enableHiding: false,
            enableSorting: false,
            cell: ({ row }) => {
                const team = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="size-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.visit(teamActions.show({ team: team.id }).url)}>
                                <Users className="size-4" />
                                Manage Team
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(team)}
                                disabled={team.personal_team}
                            >
                                <Trash2 className="size-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const table = useReactTable({
        data: teamsList,
        columns,
        state: { sorting, columnFilters, columnVisibility, rowSelection, columnPinning },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        initialState: { pagination: { pageSize: 25 } },
    });

    const selectedCount = Object.keys(rowSelection).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teams" />
            <Content>
                <DataGrid table={table} recordCount={teams?.meta?.total ?? teamsList.length}>
                    <Card className="border-0 bg-background">
                        <CardHeader className="flex flex-row items-center justify-between gap-3">
                            <div className="flex flex-1 items-center gap-2">
                                <div className="relative max-w-sm flex-1">
                                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search teams..."
                                        value={search}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="h-9 pl-9"
                                    />
                                </div>
                                {search && (
                                    <Button variant="ghost" onClick={() => handleSearch('')} className="h-9 px-2">
                                        Reset
                                        <X className="ml-2 size-4" />
                                    </Button>
                                )}
                                {selectedCount > 0 && (
                                    <Badge variant="primary" appearance="light" size="sm">
                                        {selectedCount} selected
                                    </Badge>
                                )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <DataGridColumnVisibility
                                    table={table}
                                    trigger={
                                        <Button size="sm" variant="outline">
                                            <Settings2 />
                                            View
                                        </Button>
                                    }
                                />
                                {isSuperAdmin && (
                                    <Button size="sm" onClick={() => router.visit(teamActions.create().url)}>
                                        <Plus />
                                        New Team
                                    </Button>
                                )}
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
            </Content>
        </AppLayout>
    );
}
