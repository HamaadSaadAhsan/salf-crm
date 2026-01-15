import * as React from 'react';
import { ChevronRight, GalleryVerticalEnd, Phone, Plus } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { LeadActivity } from '@/types/lead';

interface LeadRecordsOverviewNotesProps {
    activities?: LeadActivity[];
    leadId: string;
    onAddNote?: () => void;
}

export function LeadRecordsOverviewNotes({
    activities = [],
    leadId,
    onAddNote,
}: LeadRecordsOverviewNotesProps) {
    const [isNotesOpen, setIsNotesOpen] = React.useState(true);

    // Filter activities to only show notes and call notes
    const noteActivities = activities.filter(
        (activity) => activity.type === 'note' || activity.type === 'call'
    );

    // Sort by most recent first
    const sortedNotes = [...noteActivities].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

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

    const formatTimeAgo = (dateString: string) => {
        try {
            return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
        } catch {
            return dateString;
        }
    };

    const formatDuration = (minutes?: number | null) => {
        if (!minutes) return null;

        if (minutes < 60) {
            return `${minutes}m`;
        }

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const getNoteContent = (activity: LeadActivity) => {
        // For call notes, use the 'notes' field if available
        if (activity.type === 'call') {
            return activity.notes || activity.description || 'No call notes recorded';
        }
        // For regular notes, use description
        return activity.description || 'This note has no content';
    };

    const isCallNote = (activity: LeadActivity) => {
        return activity.type === 'call';
    };

    return (
        <Collapsible
            className="space-y-2"
            open={isNotesOpen}
            onOpenChange={setIsNotesOpen}
        >
            <div className="flex items-center justify-between gap-2.5">
                <CollapsibleTrigger asChild>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-sm text-semibold [&:not(:hover)[data-state=open]]:bg-transparent hover:bg-accent ps-1.5"
                    >
                        <GalleryVerticalEnd />
                        Notes
                        <ChevronRight className="[[data-state=open]_&]:rotate-90" />
                    </Button>
                </CollapsibleTrigger>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Button variant="ghost" size="sm" mode="icon" onClick={onAddNote}>
                                <Plus />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Add note</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <CollapsibleContent>
                <Card className="shadow-none">
                    <CardContent className="space-y-3 p-3.5">
                        {sortedNotes.length === 0 ? (
                            <div className="text-muted-foreground py-8 text-center text-sm">
                                No notes yet
                            </div>
                        ) : (
                            <>
                                <ul className="flex flex-col gap-2.5">
                                    {sortedNotes.map((activity) => {
                                        const user = getUserData(activity);
                                        const callNote = isCallNote(activity);
                                        const duration = formatDuration(activity.duration_minutes);

                                        return (
                                            <li key={activity.id} className="flex items-start gap-1.5 text-sm">
                                                <Avatar className="size-6 shrink-0">
                                                    {user?.avatar && (
                                                        <AvatarImage
                                                            src={user.avatar}
                                                            alt={user.name}
                                                        />
                                                    )}
                                                    <AvatarFallback>
                                                        {user ? getInitials(user.name) : '?'}
                                                    </AvatarFallback>
                                                </Avatar>

                                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <Link
                                                            href="#"
                                                            className="font-medium text-foreground hover:text-primary shrink-0"
                                                        >
                                                            {user?.name || 'Unknown'}
                                                        </Link>

                                                        {callNote && (
                                                            <Badge
                                                                variant="outline"
                                                                className="gap-1 text-xs shrink-0"
                                                            >
                                                                <Phone className="size-3" />
                                                                Call note
                                                            </Badge>
                                                        )}

                                                        {duration && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs shrink-0"
                                                            >
                                                                {duration}
                                                            </Badge>
                                                        )}

                                                        <span className="ml-auto text-xs text-muted-foreground shrink-0">
                                                            {formatTimeAgo(activity.created_at)}
                                                        </span>
                                                    </div>

                                                    <div className="text-muted-foreground break-words">
                                                        <Link
                                                            href="#"
                                                            className="font-medium text-foreground hover:text-primary"
                                                        >
                                                            {activity.subject || (callNote ? 'Call note' : 'Note')}
                                                        </Link>
                                                        {' - '}
                                                        {getNoteContent(activity)}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <div className="flex justify-start">
                                    <Button mode="link" underline="solid" asChild>
                                        <Link href="#">View all</Link>
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </CollapsibleContent>
        </Collapsible>
    );
}