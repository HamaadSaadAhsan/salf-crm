import * as React from 'react';
import { useState } from 'react';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Link2, MoreHorizontal, Trash2, User2 } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CreateButton } from '@/components/ui/create-button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useLeadNotes } from '@/hooks/useLead';
import type { LeadActivity } from '@/types/lead';
import { useCreateDialog } from '@/providers/CreateDialogProvider';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

interface LeadRecordsNotesProps {
    leadId: string;
    leadName?: string;
    leadUrl?: string;
}

export function LeadRecordsNotes({ leadId, leadName, leadUrl }: LeadRecordsNotesProps) {
    const [page, setPage] = useState(1);
    const { open: openCreateDialog, openExisting } = useCreateDialog();
    const { auth } = usePage<SharedData>().props;
    const canAddNotes = auth.permissions.includes('add lead notes');
    const perPage = 12;

    const { data, isLoading, error, refetch } = useLeadNotes(leadId, page, perPage);

    const notes: LeadActivity[] = data?.data || [];
    const meta = data?.meta || {};

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getUserData = (activity: LeadActivity) => {
        if (!activity.user) return null;
        if ('data' in activity.user && activity.user.data) {
            return activity.user.data;
        }
        if ('id' in activity.user && 'name' in activity.user) {
            return activity.user as { id: number; name: string; email: string; avatar?: string };
        }
        return null;
    };

    const formatRelativeDate = (dateString: string) => {
        try {
            const date = parseISO(dateString);
            if (isToday(date)) return 'Today';
            if (isYesterday(date)) return 'Yesterday';
            return formatDistanceToNow(date, { addSuffix: true });
        } catch {
            return dateString;
        }
    };

    const handleCreateNote = () => {
        openCreateDialog('note', {
            type: 'lead',
            id: leadId,
            name: leadName || '',
            url: leadUrl,
        });
    };

    const handleOpenNote = (noteId: string) => {
        openExisting(noteId, 'note', {
            type: 'lead',
            id: leadId,
            name: leadName || '',
            url: leadUrl,
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">Notes</h2>
                    {canAddNotes && (
                        <CreateButton disabled className="opacity-50 pointer-events-none">
                            Create note
                        </CreateButton>
                    )}
                </div>
                <div className="grid grid-cols-2 items-center gap-3 px-3">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="flex flex-col rounded-xl bg-zinc-50 dark:bg-zinc-900 shadow-[inset_0_0_0_1px_var(--color-border)] animate-pulse h-[208px] p-3.5 gap-1.5"
                        >
                            <div className="h-4 bg-muted rounded w-1/2" />
                            <div className="flex-1 space-y-1.5 mt-1">
                                <div className="h-3 bg-muted rounded w-full" />
                                <div className="h-3 bg-muted rounded w-4/5" />
                                <div className="h-3 bg-muted rounded w-2/3" />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <div className="size-3 rounded-full bg-muted" />
                                    <div className="h-3 bg-muted rounded w-16" />
                                </div>
                                <div className="h-3 bg-muted rounded w-12" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">Notes</h2>
                </div>
                <div className="text-destructive py-12 text-center text-sm">
                    Failed to load notes. Please try again.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Notes</h2>
                {canAddNotes && (
                    <CreateButton onClick={handleCreateNote}>
                        Create note
                    </CreateButton>
                )}
            </div>

            {notes.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center text-sm">
                    No notes have been added yet
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 items-center gap-3 px-3">
                        {notes.map((note) => {
                            const user = getUserData(note);

                            return (
                                <div
                                    key={note.id}
                                    className="group flex flex-col rounded-xl bg-zinc-50 dark:bg-zinc-900 shadow-[inset_0_0_0_1px_var(--color-border)] cursor-pointer hover:shadow-[inset_0_0_0_1px_var(--color-border),0_2px_8px_rgba(0,0,0,0.06)] dark:hover:shadow-[inset_0_0_0_1px_var(--color-border),0_2px_8px_rgba(0,0,0,0.2)] transition-shadow duration-200 h-[208px] min-w-0"
                                    onClick={(e) => {
                                        // Don't open if clicking on interactive elements
                                        if ((e.target as HTMLElement).closest('a, button, [role="menuitem"]')) return;
                                        handleOpenNote(note.id);
                                    }}
                                >
                                    <div className="flex flex-col flex-1 overflow-hidden p-3.5 gap-1.5">
                                        {/* Header: lead reference + options */}
                                        <div className="flex items-center justify-between gap-1 shrink-0">
                                            {leadName && leadUrl ? (
                                                <Link
                                                    href={leadUrl}
                                                    className="inline-flex items-center gap-1 h-5 px-1 rounded-md text-xs font-medium tracking-[-0.01em] leading-4 text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors truncate min-w-0"
                                                >
                                                    <User2 className="size-3 shrink-0 text-muted-foreground" />
                                                    <span className="truncate">{leadName}</span>
                                                </Link>
                                            ) : <div />}
                                            {canAddNotes && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity duration-100 p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 [&_svg]:size-3 text-muted-foreground shrink-0"
                                                            aria-label="Note options"
                                                        >
                                                            <MoreHorizontal />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        align="end"
                                                        className="min-w-[180px] gap-px p-1 rounded-xl bg-white dark:bg-[rgb(31,33,37)] shadow-[rgb(228,228,231)_0_0_0_1px_inset,rgba(0,0,0,0.04)_0_0_0_1px,rgba(0,0,0,0.06)_0_4px_8px_-4px] dark:shadow-[rgb(47,48,51)_0_0_0_1px_inset,rgba(0,0,0,0.16)_0_0_0_1px,rgba(0,0,0,0.48)_0_4px_8px_-4px,rgba(0,0,0,0.64)_0_4px_12px_-2px] border-0"
                                                    >
                                                        <DropdownMenuItem className="rounded-lg gap-1.5 px-2 py-1.5 text-sm font-normal tracking-[-0.02em] leading-5">
                                                            <Link2 className="size-3.5 shrink-0" />
                                                            Copy link
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="mx-0 my-px" />
                                                        <DropdownMenuItem variant="destructive" className="rounded-lg gap-1.5 px-2 py-1.5 text-sm font-normal tracking-[-0.02em] leading-5">
                                                            <Trash2 className="size-3.5 shrink-0" />
                                                            Delete note
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex flex-col gap-0.5 flex-1 overflow-hidden px-2">
                                            <div className="text-sm font-medium tracking-[-0.01em] leading-5 text-foreground truncate shrink-0">
                                                {note.subject || 'Untitled note'}
                                            </div>
                                            <div className="text-xs font-medium tracking-[-0.01em] leading-4 text-muted-foreground line-clamp-6 overflow-hidden">
                                                {note.description || (
                                                    <span className="text-muted-foreground/40">
                                                        This note has no content.
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex flex-col gap-2 shrink-0 px-2">
                                            <Separator />
                                            <div className="flex items-center justify-between gap-1">
                                                <div className="flex items-center gap-1 min-w-0">
                                                    <Avatar className="size-3 shrink-0">
                                                        {user?.avatar && (
                                                            <AvatarImage src={user.avatar} alt={user.name} />
                                                        )}
                                                        <AvatarFallback className="text-[6px]">
                                                            {user ? getInitials(user.name) : '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs font-medium tracking-[-0.01em] leading-4 text-foreground truncate">
                                                        {user?.name || 'Unknown'}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-medium tracking-[-0.01em] leading-4 text-muted-foreground/60 shrink-0">
                                                    {formatRelativeDate(note.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {meta.last_page > 1 && (
                        <div className="flex items-center justify-between pt-4 px-2">
                            <div className="text-xs text-muted-foreground">
                                Showing {meta.from} - {meta.to} of {meta.total} notes
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="size-4" />
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {page} of {meta.last_page}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page >= meta.last_page}
                                >
                                    Next
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}

        </div>
    );
}
