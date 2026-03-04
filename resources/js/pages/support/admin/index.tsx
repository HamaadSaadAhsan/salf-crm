import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type User } from '@/types';
import type { Ticket, SelectOption } from '@/types/ticket';
import { Head, Link, router } from '@inertiajs/react';
import {
    ColumnDef,
    ColumnPinningState,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import {
    Ellipsis,
    Eye,
    MessageSquare,
    Search,
    ShieldCheck,
    Trash,
    X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridTable } from '@/components/ui/data-grid-table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { InlineEdit } from '@/components/inline-edit';
import { TicketStatusBadge } from '../components/ticket-status-badge';
import { TicketPriorityBadge } from '../components/ticket-priority-badge';
import { TicketTypeBadge } from '../components/ticket-type-badge';

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface AdminTicketsProps {
    tickets: PaginatedData<Ticket>;
    users: User[];
    filters: {
        status: string | null;
        type: string | null;
        priority: string | null;
        assigned_to_id: string | null;
        search: string | null;
    };
    statusOptions: SelectOption[];
    typeOptions: SelectOption[];
    priorityOptions: SelectOption[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Admin Tickets', href: '/admin/tickets' },
];

export default function AdminTickets({ tickets, users, filters, statusOptions, typeOptions, priorityOptions }: AdminTicketsProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
        left: ['id', 'subject'],
        right: ['actions'],
    });

    function applyFilter(key: string, value: string | null) {
        router.get(
            '/admin/tickets',
            { ...filters, [key]: value || undefined, search: search || undefined },
            { preserveState: true, preserveScroll: true },
        );
    }

    function handleSearch() {
        applyFilter('search', search || null);
    }

    function handleInlineUpdate(ticketId: number, field: string, value: string) {
        router.put(
            `/support/${ticketId}`,
            { [field]: field === 'assigned_to_id' ? (value || null) : value },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success('Ticket updated successfully.');
                },
                onError: () => {
                    toast.error('Failed to update ticket.');
                },
            },
        );
    }

    function handleDelete(ticketId: number) {
        if (!confirm('Are you sure you want to delete this ticket?')) return;
        router.delete(`/support/${ticketId}`, {
            preserveScroll: true,
        });
    }

    const assigneeOptions = useMemo(
        () => [
            { value: '', label: 'Unassigned' },
            ...users.map((u) => ({ value: u.id.toString(), label: u.name })),
        ],
        [users],
    );

    const columns = useMemo<ColumnDef<Ticket>[]>(
        () => [
            {
                accessorKey: 'id',
                id: 'id',
                header: ({ column }) => (
                    <DataGridColumnHeader title="ID" column={column} visibility={true} />
                ),
                cell: ({ row }) => (
                    <span className="text-muted-foreground">#{row.original.id}</span>
                ),
                size: 70,
                enableSorting: true,
                enableHiding: false,
                enableResizing: false,
                meta: { headerTitle: 'ID' },
            },
            {
                accessorKey: 'subject',
                id: 'subject',
                header: ({ column }) => (
                    <DataGridColumnHeader title="Subject" column={column} visibility={true} />
                ),
                cell: ({ row }) => (
                    <span className="truncate font-medium">{row.original.subject}</span>
                ),
                size: 250,
                enableSorting: true,
                enableHiding: false,
                enableResizing: true,
                meta: { headerTitle: 'Subject' },
            },
            {
                accessorKey: 'user',
                id: 'reporter',
                header: ({ column }) => (
                    <DataGridColumnHeader title="Reporter" column={column} visibility={true} />
                ),
                cell: ({ row }) => (
                    <span className="truncate">{row.original.user?.name ?? '—'}</span>
                ),
                size: 140,
                enableSorting: false,
                enableHiding: true,
                enableResizing: true,
                meta: { headerTitle: 'Reporter' },
            },
            {
                accessorKey: 'type',
                id: 'type',
                header: ({ column }) => (
                    <DataGridColumnHeader title="Type" column={column} visibility={true} />
                ),
                cell: ({ row }) => <TicketTypeBadge type={row.original.type} />,
                size: 140,
                enableSorting: true,
                enableHiding: true,
                enableResizing: true,
                meta: { headerTitle: 'Type' },
            },
            {
                accessorKey: 'priority',
                id: 'priority',
                header: ({ column }) => (
                    <DataGridColumnHeader title="Priority" column={column} visibility={true} />
                ),
                cell: ({ row }) => (
                    <div onClick={(e) => e.stopPropagation()}>
                        <InlineEdit
                            type="select"
                            value={row.original.priority}
                            options={priorityOptions}
                            selectTitle="Change Priority"
                            onSave={(value) => handleInlineUpdate(row.original.id, 'priority', value)}
                        />
                    </div>
                ),
                size: 120,
                enableSorting: true,
                enableHiding: true,
                enableResizing: true,
                meta: { headerTitle: 'Priority' },
            },
            {
                accessorKey: 'status',
                id: 'status',
                header: ({ column }) => (
                    <DataGridColumnHeader title="Status" column={column} visibility={true} />
                ),
                cell: ({ row }) => (
                    <div onClick={(e) => e.stopPropagation()}>
                        <InlineEdit
                            type="select"
                            value={row.original.status}
                            options={statusOptions}
                            selectTitle="Change Status"
                            onSave={(value) => handleInlineUpdate(row.original.id, 'status', value)}
                        />
                    </div>
                ),
                size: 130,
                enableSorting: true,
                enableHiding: true,
                enableResizing: true,
                meta: { headerTitle: 'Status' },
            },
            {
                accessorKey: 'assigned_to_id',
                id: 'assigned_to',
                header: ({ column }) => (
                    <DataGridColumnHeader title="Assigned To" column={column} visibility={true} />
                ),
                cell: ({ row }) => (
                    <div onClick={(e) => e.stopPropagation()}>
                        <InlineEdit
                            type="select"
                            value={row.original.assigned_to_id?.toString() ?? ''}
                            options={assigneeOptions}
                            selectTitle="Assign To"
                            onSave={(value) => handleInlineUpdate(row.original.id, 'assigned_to_id', value)}
                        />
                    </div>
                ),
                size: 160,
                enableSorting: false,
                enableHiding: true,
                enableResizing: true,
                meta: { headerTitle: 'Assigned To' },
            },
            {
                accessorKey: 'created_at',
                id: 'created_at',
                header: ({ column }) => (
                    <DataGridColumnHeader title="Created" column={column} visibility={true} />
                ),
                cell: ({ row }) => (
                    <span className="whitespace-nowrap text-muted-foreground">
                        {formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true })}
                    </span>
                ),
                size: 130,
                enableSorting: true,
                enableHiding: true,
                enableResizing: true,
                meta: { headerTitle: 'Created' },
            },
            {
                accessorKey: 'comments_count',
                id: 'comments',
                header: ({ column }) => (
                    <DataGridColumnHeader title="Comments" column={column} visibility={true} />
                ),
                cell: ({ row }) => {
                    const count = row.original.comments_count ?? 0;
                    return count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <MessageSquare className="size-3.5" />
                            {count}
                        </span>
                    ) : null;
                },
                size: 80,
                enableSorting: true,
                enableHiding: true,
                enableResizing: false,
                meta: { headerTitle: 'Comments' },
            },
            {
                id: 'actions',
                header: () => <></>,
                cell: ({ row }) => (
                    <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="dim"
                                    mode="icon"
                                    size="sm"
                                    className="pointer-events-none opacity-0 transition-opacity duration-300 group-hover/row:pointer-events-auto group-hover/row:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:opacity-100"
                                >
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="bottom">
                                <DropdownMenuItem onClick={() => router.get(`/support/${row.original.id}`)}>
                                    <Eye />
                                    View
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(row.original.id)}>
                                    <Trash />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ),
                size: 60,
                enableSorting: false,
                enableHiding: false,
                enableResizing: false,
            },
        ],
        [statusOptions, priorityOptions, assigneeOptions],
    );

    const table = useReactTable({
        data: tickets.data,
        columns,
        state: {
            sorting,
            columnPinning,
        },
        onSortingChange: setSorting,
        onColumnPinningChange: setColumnPinning,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - All Tickets" />

            <div className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
                <h1 className="inline-flex items-center gap-2.5 text-lg font-semibold">
                    <ShieldCheck className="size-5 text-primary" /> All Tickets
                </h1>
                <span className="text-sm text-muted-foreground">{tickets.total} total</span>
            </div>

            {/* Desktop Data Grid */}
            <div className="hidden flex-1 lg:block">
                <DataGrid
                    table={table}
                    recordCount={tickets.total}
                    onRowClick={(row) => router.get(`/support/${row.id}`)}
                    emptyMessage="No tickets found."
                    tableClassNames={{
                        bodyRow: 'group/row',
                    }}
                    tableLayout={{
                        dense: true,
                        headerBackground: true,
                        columnsResizable: true,
                        columnsPinnable: true,
                        columnsMovable: true,
                        columnsVisibility: true,
                    }}
                >
                    <Card className="border-none shadow-none rounded-none">
                        <CardHeader className="px-4 py-3 sm:px-6">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        variant="sm"
                                        placeholder="Search tickets..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="w-48 ps-9"
                                    />
                                    {search.length > 0 && (
                                        <Button
                                            mode="icon"
                                            variant="ghost"
                                            className="absolute end-1.5 top-1/2 h-6 w-6 -translate-y-1/2"
                                            onClick={() => {
                                                setSearch('');
                                                applyFilter('search', null);
                                            }}
                                        >
                                            <X />
                                        </Button>
                                    )}
                                </div>

                                <Select
                                    value={filters.status ?? 'all'}
                                    onValueChange={(v) => applyFilter('status', v === 'all' ? null : v)}
                                >
                                    <SelectTrigger className="h-8 w-36">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {statusOptions.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filters.type ?? 'all'}
                                    onValueChange={(v) => applyFilter('type', v === 'all' ? null : v)}
                                >
                                    <SelectTrigger className="h-8 w-40">
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        {typeOptions.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filters.priority ?? 'all'}
                                    onValueChange={(v) => applyFilter('priority', v === 'all' ? null : v)}
                                >
                                    <SelectTrigger className="h-8 w-36">
                                        <SelectValue placeholder="Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Priorities</SelectItem>
                                        {priorityOptions.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filters.assigned_to_id ?? 'all'}
                                    onValueChange={(v) => applyFilter('assigned_to_id', v === 'all' ? null : v)}
                                >
                                    <SelectTrigger className="h-8 w-44">
                                        <SelectValue placeholder="Assigned To" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Assignees</SelectItem>
                                        {users.map((u) => (
                                            <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>

                        <CardTable>
                            <ScrollArea>
                                <DataGridTable />
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </CardTable>

                        <CardFooter className="justify-between px-4 py-2.5 sm:px-6">
                            <div className="text-sm text-muted-foreground">
                                {tickets.total > 0
                                    ? `${(tickets.current_page - 1) * tickets.per_page + 1} - ${Math.min(tickets.current_page * tickets.per_page, tickets.total)} of ${tickets.total}`
                                    : '0 results'}
                            </div>
                            {tickets.last_page > 1 && (
                                <div className="flex items-center gap-1">
                                    {tickets.links.map((link, index) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? 'default' : 'ghost'}
                                            size="sm"
                                            mode={index === 0 || index === tickets.links.length - 1 ? undefined : 'icon'}
                                            className="h-7 min-w-7 px-2 text-xs"
                                            disabled={!link.url}
                                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardFooter>
                    </Card>
                </DataGrid>
            </div>

            {/* Mobile / Tablet Card List */}
            <div className="flex-1 lg:hidden">
                {/* Mobile Filters */}
                <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-6">
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                        <Input
                            placeholder="Search tickets..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="h-8 min-w-0 flex-1 sm:w-64 sm:flex-none"
                        />
                        <Button variant="outline" size="sm" onClick={handleSearch}>
                            <Search className="size-4" />
                        </Button>
                    </div>

                    <Select
                        value={filters.status ?? 'all'}
                        onValueChange={(v) => applyFilter('status', v === 'all' ? null : v)}
                    >
                        <SelectTrigger className="h-8 w-[calc(50%-0.25rem)]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {statusOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.priority ?? 'all'}
                        onValueChange={(v) => applyFilter('priority', v === 'all' ? null : v)}
                    >
                        <SelectTrigger className="h-8 w-[calc(50%-0.25rem)]">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Priorities</SelectItem>
                            {priorityOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {tickets.data.length === 0 ? (
                    <div className="px-4 py-12 text-center text-sm text-muted-foreground">No tickets found.</div>
                ) : (
                    <div className="divide-y">
                        {tickets.data.map((ticket) => (
                            <Link
                                key={ticket.id}
                                href={`/support/${ticket.id}`}
                                className="block px-4 py-3 transition-colors hover:bg-muted/50 sm:px-6"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">#{ticket.id}</span>
                                            <span className="truncate text-sm font-medium">{ticket.subject}</span>
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            {ticket.user?.name ?? '—'}
                                            {ticket.assigned_to && <span> &rarr; {ticket.assigned_to.name}</span>}
                                        </div>
                                    </div>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <TicketTypeBadge type={ticket.type} />
                                    <TicketPriorityBadge priority={ticket.priority} />
                                    <TicketStatusBadge status={ticket.status} />
                                    {(ticket.comments_count ?? 0) > 0 && (
                                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                            <MessageSquare className="size-3" />
                                            {ticket.comments_count}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Mobile Pagination */}
                {tickets.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2 border-t px-4 py-4 sm:px-6">
                        {tickets.links.map((link, index) => (
                            <Button
                                key={index}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
