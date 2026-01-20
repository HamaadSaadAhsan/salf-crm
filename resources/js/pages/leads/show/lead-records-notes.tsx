import * as React from 'react';
import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { Plus, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLeadNotes } from '@/hooks/useLead';
import type { LeadActivity } from '@/types/lead';
import { NewNoteSheet } from './new-note-sheet';

interface LeadRecordsNotesProps {
    leadId: string;
}

export function LeadRecordsNotes({ leadId }: LeadRecordsNotesProps) {
    const [page, setPage] = useState(1);
    const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
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

    const formatDate = (dateString: string) => {
        try {
            return format(parseISO(dateString), 'MMM d, yyyy');
        } catch {
            return dateString;
        }
    };

    const getNoteTitle = (activity: LeadActivity) => {
        if (activity.subject) return activity.subject;
        if (activity.type === 'call') return 'Call Note';
        return 'Note';
    };

    const getNoteContent = (activity: LeadActivity) => {
        if (activity.type === 'call') {
            return activity.notes || activity.description || 'No call notes recorded';
        }
        return activity.description || 'This note has no content';
    };

    const isCallNote = (activity: LeadActivity) => activity.type === 'call';

    const handleNoteCreated = () => {
        refetch();
        setIsNewNoteOpen(false);
    };

    if (isLoading) {
        return (
            <div className="space-y-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">Notes</h2>
                    <Button variant="outline" size="sm" className="gap-1" disabled>
                        <Plus className="size-4" />
                        Create note
                    </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="bg-background animate-pulse">
                            <CardContent className="flex flex-col justify-between min-h-[140px]">
                                <div className="space-y-2">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-3 bg-muted rounded w-full" />
                                    <div className="h-3 bg-muted rounded w-2/3" />
                                </div>
                                <div className="flex items-center justify-between pt-2 mt-auto">
                                    <div className="flex items-center gap-2">
                                        <div className="size-6 rounded-full bg-muted" />
                                        <div className="h-3 bg-muted rounded w-20" />
                                    </div>
                                    <div className="h-3 bg-muted rounded w-16" />
                                </div>
                            </CardContent>
                        </Card>
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
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setIsNewNoteOpen(true)}
                >
                    <Plus className="size-4" />
                    Create note
                </Button>
            </div>

            {notes.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center text-sm">
                    No notes have been added yet
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {notes.map((note) => {
                            const user = getUserData(note);
                            const callNote = isCallNote(note);

                            return (
                                <Card key={note.id} className="bg-background">
                                    <CardContent className="flex flex-col justify-between min-h-[140px]">
                                        <div className="mb-2">
                                            {callNote && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant="outline" className="gap-1 text-xs">
                                                        <Phone className="size-3" />
                                                        Call note
                                                    </Badge>
                                                    {note.duration_minutes && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {note.duration_minutes}m
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                            <div className="font-semibold text-sm mb-1">
                                                {getNoteTitle(note)}
                                            </div>
                                            <div className="text-xs text-muted-foreground line-clamp-3">
                                                {getNoteContent(note)}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-1 mt-auto pt-2 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Avatar className="size-6">
                                                    {user?.avatar && (
                                                        <AvatarImage src={user.avatar} alt={user.name} />
                                                    )}
                                                    <AvatarFallback>
                                                        {user ? getInitials(user.name) : '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <Link
                                                    href="#"
                                                    className="font-medium text-mono text-xs hover:text-primary"
                                                >
                                                    {user?.name || 'Unknown'}
                                                </Link>
                                            </div>
                                            <span className="shrink-0">{formatDate(note.created_at)}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {meta.last_page > 1 && (
                        <div className="flex items-center justify-between pt-4">
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

            {/* New Note Sheet */}
            <NewNoteSheet
                open={isNewNoteOpen}
                onOpenChange={setIsNewNoteOpen}
                leadId={leadId}
                onSuccess={handleNoteCreated}
            />
        </div>
    );
}
