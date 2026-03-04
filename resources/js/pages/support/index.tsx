import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import type { Ticket, SelectOption } from '@/types/ticket';
import { Head, Link, router } from '@inertiajs/react';
import { MessageSquare, Plus, Ticket as TicketIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TicketStatusBadge } from './components/ticket-status-badge';
import { TicketPriorityBadge } from './components/ticket-priority-badge';
import { TicketTypeBadge } from './components/ticket-type-badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface SupportIndexProps {
    tickets: PaginatedData<Ticket>;
    filters: {
        status: string | null;
        type: string | null;
        priority: string | null;
    };
    statusOptions: SelectOption[];
    typeOptions: SelectOption[];
    priorityOptions: SelectOption[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Support', href: '/support' },
];

const statusTabs = [
    { value: '', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
];

export default function SupportIndex({ tickets, filters }: SupportIndexProps) {
    const activeStatus = filters.status ?? '';

    function handleTabChange(status: string) {
        router.get('/support', { status: status || undefined }, { preserveState: true, preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Support" />

            <div className="flex items-center justify-between border-b px-6 py-4">
                <h1 className="inline-flex items-center gap-2.5 text-lg font-semibold">
                    <TicketIcon className="size-5 text-primary" /> Support Tickets
                </h1>
                <Link href="/support/create">
                    <Button size="sm">
                        <Plus className="size-4" /> New Ticket
                    </Button>
                </Link>
            </div>

            <div className="flex flex-1 flex-col">
                {/* Tab Navigation */}
                <div className="border-b">
                    <div className="flex gap-6 px-5">
                        {statusTabs.map((tab) => {
                            const isActive = activeStatus === tab.value;
                            return (
                                <button
                                    key={tab.value}
                                    onClick={() => handleTabChange(tab.value)}
                                    className={cn(
                                        'inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-secondary-foreground hover:border-border hover:text-foreground',
                                    )}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Ticket List */}
                <div className="flex-1">
                    {tickets.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <TicketIcon className="mb-4 size-12 opacity-50" />
                            <p className="text-lg font-medium">No tickets found</p>
                            <p className="text-sm">Create a new ticket to get started.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {tickets.data.map((ticket) => (
                                <Link
                                    key={ticket.id}
                                    href={`/support/${ticket.id}`}
                                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">#{ticket.id}</span>
                                            <span className="truncate font-medium">{ticket.subject}</span>
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <TicketTypeBadge type={ticket.type} />
                                            <TicketPriorityBadge priority={ticket.priority} />
                                            <TicketStatusBadge status={ticket.status} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        {(ticket.comments_count ?? 0) > 0 && (
                                            <span className="inline-flex items-center gap-1">
                                                <MessageSquare className="size-3.5" />
                                                {ticket.comments_count}
                                            </span>
                                        )}
                                        <span className="whitespace-nowrap">
                                            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {tickets.last_page > 1 && (
                        <div className="flex items-center justify-center gap-2 border-t px-6 py-4">
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
            </div>
        </AppLayout>
    );
}
