import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { EventCalendar } from '@/components/ui/calendar/event-calendar';
import { type CalendarEvent } from '@/components/ui/calendar/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck2, CalendarX2, ExternalLink } from 'lucide-react';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { PageProps } from '@/types/global';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Follow-Up Calendar', href: '/follow-up-calendar' },
];

interface CalendarPageProps extends PageProps {
    calendarLinked: boolean;
    calendarEmail: string | null;
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
    const [lastFetchRange, setLastFetchRange] = useState<{ start: string; end: string } | null>(null);

    const fetchEvents = useCallback(async (start: Date, end: Date) => {
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        if (lastFetchRange?.start === startStr && lastFetchRange?.end === endStr) return;
        setLastFetchRange({ start: startStr, end: endStr });

        try {
            const res = await api.get('/api/follow-up-calendar/events', { start: startStr, end: endStr });
            const mapped: CalendarEvent[] = res.events.map((e: any) => ({
                id: e.id,
                title: e.title,
                description: [
                    e.extendedProps?.assignedTo && `Assigned to: ${e.extendedProps.assignedTo}`,
                    e.extendedProps?.service && `Service: ${e.extendedProps.service}`,
                    e.extendedProps?.status && `Status: ${e.extendedProps.status.replace(/_/g, ' ')}`,
                    e.type === 'task' ? 'Task' : 'Follow-up',
                ].filter(Boolean).join('\n'),
                start: new Date(e.start),
                end: new Date(e.start),
                allDay: false,
                color: priorityToColor(e.type, e.extendedProps?.priority, e.extendedProps?.completed),
                location: e.extendedProps?.service || undefined,
            }));
            setEvents(mapped);
        } catch {
            setEvents([]);
        }
    }, [lastFetchRange]);

    useEffect(() => {
        const now = new Date();
        const start = startOfMonth(subMonths(now, 1));
        const end = endOfMonth(addMonths(now, 1));
        fetchEvents(start, end);
    }, []);

    const handleEventSelect = useCallback((event: CalendarEvent) => {
        const id = event.id;
        if (id.startsWith('lead-')) {
            router.visit(`/leads/${id.replace('lead-', '')}`);
        }
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs} collapseSidebar>
            <Head title="Follow-Up Calendar" />

            <div className="flex flex-1 flex-col p-4 sm:p-5">
                {/* Status bar */}
                <div className="mb-3 flex items-center justify-between">
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
                                <Link href="/calendar">
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

                <EventCalendar
                    events={events}
                    onEventAdd={handleEventSelect}
                    onEventUpdate={() => {}}
                    onEventDelete={() => {}}
                />
            </div>
        </AppLayout>
    );
}
