import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type User } from '@/types';
import type { Ticket, SelectOption } from '@/types/ticket';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Calendar, Clock, User as UserIcon } from 'lucide-react';
import { TicketStatusBadge } from './components/ticket-status-badge';
import { TicketPriorityBadge } from './components/ticket-priority-badge';
import { TicketTypeBadge } from './components/ticket-type-badge';
import { AttachmentGallery } from './components/attachment-gallery';
import { CommentThread } from './components/comment-thread';
import { CommentForm } from './components/comment-form';
import { formatDistanceToNow, format } from 'date-fns';

interface ShowTicketProps {
    ticket: Ticket;
    isSuperAdmin: boolean;
    users: User[];
    statusOptions: SelectOption[];
    priorityOptions: SelectOption[];
}

export default function ShowTicket({ ticket, isSuperAdmin, users, statusOptions, priorityOptions }: ShowTicketProps) {
    const backHref = isSuperAdmin ? '/admin/tickets' : '/support';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: isSuperAdmin ? 'Admin Tickets' : 'Support', href: backHref },
        { title: `#${ticket.id}`, href: `/support/${ticket.id}` },
    ];

    function handleAdminUpdate(field: string, value: string | null) {
        router.put(`/support/${ticket.id}`, { [field]: value }, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Ticket #${ticket.id} - ${ticket.subject}`} />

            <div className="flex items-center gap-3 border-b px-6 py-4">
                <Link href={backHref}>
                    <Button variant="outline" size="sm" mode="icon">
                        <ArrowLeft className="size-4" />
                    </Button>
                </Link>
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-lg font-semibold">{ticket.subject}</h1>
                    <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>#{ticket.id}</span>
                        <span>by {ticket.user?.name ?? 'Unknown'}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1">
                {/* Main Content */}
                <div className="flex-1 overflow-auto border-r">
                    <div className="space-y-6 p-6">
                        {/* Ticket Info Badges */}
                        <div className="flex items-center gap-2">
                            <TicketTypeBadge type={ticket.type} />
                            <TicketPriorityBadge priority={ticket.priority} />
                            <TicketStatusBadge status={ticket.status} />
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Description</h3>
                            <div className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm">
                                {ticket.description}
                            </div>
                        </div>

                        {/* Ticket Attachments */}
                        {ticket.attachments && ticket.attachments.length > 0 && (
                            <div>
                                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Attachments</h3>
                                <AttachmentGallery attachments={ticket.attachments} />
                            </div>
                        )}

                        {/* Comments */}
                        <div>
                            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Comments</h3>
                            <CommentThread comments={ticket.comments ?? []} />
                        </div>

                        {/* Comment Form */}
                        <div>
                            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Add Comment</h3>
                            <CommentForm ticketId={ticket.id} />
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-72 shrink-0 overflow-auto">
                    <div className="space-y-5 p-5">
                        {/* Ticket Details */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold">Details</h3>

                            <div className="flex items-center gap-2 text-sm">
                                <UserIcon className="size-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Reporter:</span>
                                <span>{ticket.user?.name ?? 'Unknown'}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="size-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Created:</span>
                                <span>{format(new Date(ticket.created_at), 'MMM d, yyyy')}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="size-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Updated:</span>
                                <span>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}</span>
                            </div>

                            {ticket.assigned_to && (
                                <div className="flex items-center gap-2 text-sm">
                                    <UserIcon className="size-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Assigned:</span>
                                    <span>{ticket.assigned_to.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Admin Actions */}
                        {isSuperAdmin && (
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="text-sm font-semibold">Admin Actions</h3>

                                <div className="space-y-2">
                                    <Label className="text-xs">Status</Label>
                                    <Select
                                        value={ticket.status}
                                        onValueChange={(value) => handleAdminUpdate('status', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs">Priority</Label>
                                    <Select
                                        value={ticket.priority}
                                        onValueChange={(value) => handleAdminUpdate('priority', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {priorityOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs">Assign To</Label>
                                    <Select
                                        value={ticket.assigned_to_id?.toString() ?? ''}
                                        onValueChange={(value) =>
                                            handleAdminUpdate('assigned_to_id', value === 'unassigned' ? null : value)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Unassigned" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                            {users.map((user) => (
                                                <SelectItem key={user.id} value={user.id.toString()}>
                                                    {user.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
