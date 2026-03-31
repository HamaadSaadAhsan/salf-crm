import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EventCalendar } from '@/components/ui/calendar/event-calendar';
import { type CalendarEvent } from '@/components/ui/calendar/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck2, CalendarX2, ExternalLink } from 'lucide-react';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { PageProps } from '@/types/global';
import { CreateEventDialog } from './create-event-dialog';
import { CalendarSidebar } from './calendar-sidebar';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Follow-Up Calendar', href: '/follow-up-calendar' },
];

interface CalendarPageProps extends PageProps {
    calendarLinked: boolean;
    calendarEmail: string | null;
}

interface ApiEvent {
    id: string;
    title: string;
    start: string;
    type: string;
    extendedProps?: {
        assignedTo?: string;
        service?: string;
        status?: string;
        priority?: string;
        completed?: boolean;
        taskType?: string;
    };
}

function priorityToColor(type: string, priority?: string, completed?: boolean): CalendarEvent['color'] {
    if (completed) return undefined;
    if (type === 'task') return 'violet';
    if (priority === 'high') return 'rose';
    if (priority === 'low') return 'orange';
    return 'sky';
}

export default function FollowUpCalendar({ calendarLinked, calendarEmail }: CalendarPageProps) {
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = auth.user.role === 'Super Admin';

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [rawEvents, setRawEvents] = useState<ApiEvent[]>([]);
    const lastFetchRangeRef = useRef<{ start: string; end: string } | null>(null);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createDialogDate, setCreateDialogDate] = useState<Date | undefined>();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeFilter, setActiveFilter] = useState('all');

    const mapEvents = useCallback((apiEvents: ApiEvent[], filter: string): CalendarEvent[] => {
        let filtered = apiEvents;
        if (filter !== 'all') {
            if (filter === 'follow_up') {
                filtered = apiEvents.filter((e) => e.type === 'follow_up');
            } else if (filter === 'task') {
                filtered = apiEvents.filter((e) => e.type === 'task');
            } else {
                filtered = apiEvents.filter((e) => e.extendedProps?.taskType === filter);
            }
        }

        return filtered.map((e) => ({
            id: e.id,
            title: e.title,
            description: [
                e.extendedProps?.assignedTo && `Assigned to: ${e.extendedProps.assignedTo}`,
                e.extendedProps?.service && `Service: ${e.extendedProps.service}`,
                e.extendedProps?.status && `Status: ${e.extendedProps.status.replace(/_/g, ' ')}`,
                e.type === 'task' ? 'Task' : 'Follow-up',
            ]
                .filter(Boolean)
                .join('\n'),
            start: new Date(e.start),
            end: new Date(e.start),
            allDay: false,
            color: priorityToColor(e.type, e.extendedProps?.priority, e.extendedProps?.completed),
            location: e.extendedProps?.service || undefined,
        }));
    }, []);

    const eventCounts = useMemo(() => {
        const counts: Record<string, number> = { all: rawEvents.length };
        rawEvents.forEach((e) => {
            counts[e.type] = (counts[e.type] || 0) + 1;
            if (e.extendedProps?.taskType) {
                counts[e.extendedProps.taskType] = (counts[e.extendedProps.taskType] || 0) + 1;
            }
        });
        return counts;
    }, [rawEvents]);

    const fetchEvents = useCallback(
        async (start: Date, end: Date, force = false) => {
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];

            if (!force && lastFetchRangeRef.current?.start === startStr && lastFetchRangeRef.current?.end === endStr) return;
            lastFetchRangeRef.current = { start: startStr, end: endStr };

            try {
                const res = await api.get('/api/follow-up-calendar/events', { start: startStr, end: endStr });
                setRawEvents(res.events);
                setEvents(mapEvents(res.events, activeFilter));
            } catch {
                setRawEvents([]);
                setEvents([]);
            }
        },
        [activeFilter, mapEvents],
    );

    useEffect(() => {
        const now = new Date();
        const start = startOfMonth(subMonths(now, 1));
        const end = endOfMonth(addMonths(now, 1));
        fetchEvents(start, end);
    }, []);

    useEffect(() => {
        setEvents(mapEvents(rawEvents, activeFilter));
    }, [activeFilter, rawEvents, mapEvents]);

    const handleEventSelect = useCallback((event: CalendarEvent) => {
        const id = event.id;
        if (id.startsWith('lead-')) {
            router.visit(`/leads/${id.replace('lead-', '')}`);
        }
    }, []);

    const handleNewEvent = useCallback(
        (date: Date) => {
            setCreateDialogDate(date);
            setCreateDialogOpen(true);
        },
        [],
    );

    const handleEventCreated = useCallback(() => {
        if (lastFetchRangeRef.current) {
            const start = new Date(lastFetchRangeRef.current.start);
            const end = new Date(lastFetchRangeRef.current.end);
            fetchEvents(start, end, true);
        }
    }, [fetchEvents]);

    const handleSidebarNewEvent = useCallback(() => {
        setCreateDialogDate(selectedDate);
        setCreateDialogOpen(true);
    }, [selectedDate]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Follow-Up Calendar" />

            <div className="flex flex-1 overflow-hidden">
                {/* Metronic-style dark sidebar */}
                <CalendarSidebar
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    events={events}
                    onNewEvent={handleSidebarNewEvent}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    eventCounts={eventCounts}
                />

                {/* Main content area */}
                <div className="flex flex-1 flex-col overflow-y-auto">
                    {/* Status bar */}
                    <div className="flex items-center justify-between border-b px-4 py-2.5 sm:px-5">
                        <p className="text-xs text-muted-foreground">
                            {isSuperAdmin ? 'Showing all follow-ups and tasks' : 'Showing your follow-ups and tasks'}
                        </p>

                        {calendarLinked ? (
                            <div className="flex items-center gap-2">
                                <Badge variant="success" appearance="light" size="sm">
                                    <CalendarCheck2 className="mr-1 size-3" />
                                    Synced to {calendarEmail}
                                </Badge>
                                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                                    <Link href="/integrations/calendar/">
                                        <ExternalLink className="mr-1 size-3" />
                                        Settings
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" asChild>
                                <Link href="/integrations">
                                    <CalendarX2 className="size-3.5 text-muted-foreground" />
                                    Link Google Calendar
                                </Link>
                            </Button>
                        )}
                    </div>

                    {/* Calendar */}
                    <div className="flex-1 p-2 sm:p-3">
                        <EventCalendar
                            events={events}
                            onEventAdd={handleEventSelect}
                            onEventUpdate={() => {}}
                            onEventDelete={() => {}}
                            onNewEvent={handleNewEvent}
                        />
                    </div>
                </div>
            </div>

            <CreateEventDialog
                isOpen={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onCreated={handleEventCreated}
                defaultDate={createDialogDate}
            />
        </AppLayout>
    );
}
