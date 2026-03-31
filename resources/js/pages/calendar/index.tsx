import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { type EventInput, type DatesSetArg, type EventClickArg, type EventContentArg } from '@fullcalendar/core';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Phone,
    CheckSquare,
    CalendarClock,
    AlertTriangle,
    User,
    Briefcase,
    Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Follow-Up Calendar', href: '/follow-up-calendar' },
];

/**
 * Color map for event rendering.
 * Each entry returns CSS-friendly classes for the event pill.
 */
const EVENT_STYLES: Record<string, { bg: string; dot: string; text: string; hoverBg: string }> = {
    // Follow-ups by priority
    'follow_up:high': {
        bg: 'bg-red-50 dark:bg-red-950/40',
        dot: 'bg-red-500',
        text: 'text-red-800 dark:text-red-300',
        hoverBg: 'hover:bg-red-100 dark:hover:bg-red-950/60',
    },
    'follow_up:medium': {
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        dot: 'bg-blue-500',
        text: 'text-blue-800 dark:text-blue-300',
        hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-950/60',
    },
    'follow_up:low': {
        bg: 'bg-slate-50 dark:bg-slate-800/40',
        dot: 'bg-slate-400',
        text: 'text-slate-700 dark:text-slate-300',
        hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800/60',
    },
    // Tasks
    task: {
        bg: 'bg-violet-50 dark:bg-violet-950/40',
        dot: 'bg-violet-500',
        text: 'text-violet-800 dark:text-violet-300',
        hoverBg: 'hover:bg-violet-100 dark:hover:bg-violet-950/60',
    },
    task_completed: {
        bg: 'bg-zinc-50 dark:bg-zinc-800/40',
        dot: 'bg-zinc-400',
        text: 'text-zinc-500 dark:text-zinc-500',
        hoverBg: 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60',
    },
};

function getEventStyle(type: string, priority?: string, completed?: boolean) {
    if (type === 'task') {
        return completed ? EVENT_STYLES.task_completed : EVENT_STYLES.task;
    }
    const key = `follow_up:${priority || 'medium'}`;
    return EVENT_STYLES[key] || EVENT_STYLES['follow_up:medium'];
}

function formatEventTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * View configuration definitions
 */
const VIEWS = [
    { key: 'dayGridMonth', label: 'Month', shortLabel: 'Mo' },
    { key: 'timeGridWeek', label: 'Week', shortLabel: 'Wk' },
    { key: 'timeGridDay', label: 'Day', shortLabel: 'Dy' },
] as const;

export default function FollowUpCalendar() {
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = auth.user.role === 'Super Admin';

    const calendarRef = useRef<FullCalendar>(null);
    const [events, setEvents] = useState<EventInput[]>([]);
    const [currentTitle, setCurrentTitle] = useState('');
    const [currentView, setCurrentView] = useState('dayGridMonth');
    const [isLoading, setIsLoading] = useState(true);

    const fetchEvents = useCallback(async (start: string, end: string) => {
        setIsLoading(true);
        try {
            const res = await api.get('/api/follow-up-calendar/events', { start, end });
            const mapped: EventInput[] = res.events.map((event: any) => {
                const isTask = event.type === 'task';
                const priority = event.extendedProps?.priority || 'medium';
                const completed = event.extendedProps?.completed;
                const style = getEventStyle(event.type, priority, completed);

                return {
                    id: event.id,
                    title: event.title,
                    start: event.start,
                    allDay: false,
                    extendedProps: {
                        ...event.extendedProps,
                        eventType: event.type,
                        styleKey: style,
                    },
                    // Transparent so we can render custom content
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    textColor: 'inherit',
                    classNames: completed ? ['opacity-60'] : [],
                };
            });
            setEvents(mapped);
        } catch {
            setEvents([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleDatesSet = useCallback((arg: DatesSetArg) => {
        setCurrentTitle(arg.view.title);
        setCurrentView(arg.view.type);
        fetchEvents(arg.startStr, arg.endStr);
    }, [fetchEvents]);

    const handleEventClick = useCallback((info: EventClickArg) => {
        const props = info.event.extendedProps;
        if (props.leadId) {
            router.visit(`/leads/${props.leadId}`);
        }
    }, []);

    const navigate = (action: 'prev' | 'next' | 'today') => {
        const calApi = calendarRef.current?.getApi();
        if (!calApi) return;
        if (action === 'prev') calApi.prev();
        else if (action === 'next') calApi.next();
        else calApi.today();
    };

    const changeView = (view: string) => {
        calendarRef.current?.getApi()?.changeView(view);
    };

    // Switch to day view on mobile for a better experience
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 640px)');
        const handler = (e: MediaQueryListEvent | MediaQueryList) => {
            if (e.matches && currentView === 'dayGridMonth') {
                changeView('timeGridDay');
            }
        };
        handler(mq);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Follow-Up Calendar" />

            <div className="flex flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-5">
                {/* Toolbar */}
                <CalendarToolbar
                    title={currentTitle}
                    subtitle={isSuperAdmin ? 'All follow-ups and tasks' : 'Your follow-ups and tasks'}
                    currentView={currentView}
                    onNavigate={navigate}
                    onChangeView={changeView}
                />

                {/* Calendar Card */}
                <div className="fc-calendar relative flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                    {/* Loading overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60 backdrop-blur-[1px]">
                            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 shadow-sm">
                                <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                <span className="text-xs font-medium text-muted-foreground">Loading events...</span>
                            </div>
                        </div>
                    )}

                    {/* Empty state overlay — shown when not loading and no events */}
                    {!isLoading && events.length === 0 && (
                        <div className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center gap-3">
                            <div className="rounded-full bg-muted p-4">
                                <CalendarClock className="size-8 text-muted-foreground/60" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-foreground">No events scheduled</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Follow-ups and tasks will appear here when scheduled
                                </p>
                            </div>
                        </div>
                    )}

                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={false}
                        events={events}
                        datesSet={handleDatesSet}
                        eventClick={handleEventClick}
                        eventContent={renderEventContent}
                        height="auto"
                        dayMaxEvents={3}
                        nowIndicator
                        eventDisplay="block"
                        fixedWeekCount={false}
                    />
                </div>
            </div>
        </AppLayout>
    );
}

/* -----------------------------------------------
   Toolbar
   ----------------------------------------------- */
interface CalendarToolbarProps {
    title: string;
    subtitle: string;
    currentView: string;
    onNavigate: (action: 'prev' | 'next' | 'today') => void;
    onChangeView: (view: string) => void;
}

function CalendarToolbar({ title, subtitle, currentView, onNavigate, onChangeView }: CalendarToolbarProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left — Title */}
            <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/15">
                    <CalendarDays className="size-4.5 text-primary" />
                </div>
                <div>
                    <h1 className="text-base font-semibold tracking-tight text-foreground">{title || <Skeleton className="h-5 w-32" />}</h1>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                </div>
            </div>

            {/* Right — Controls */}
            <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Navigation Group */}
                <div className="flex items-center">
                    <Button variant="outline" size="sm" className="rounded-r-none border-r-0" onClick={() => onNavigate('prev')}>
                        <ChevronLeft className="size-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-none" onClick={() => onNavigate('today')}>
                        Today
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-l-none border-l-0" onClick={() => onNavigate('next')}>
                        <ChevronRight className="size-3.5" />
                    </Button>
                </div>

                {/* Divider */}
                <div className="hidden h-5 w-px bg-border sm:block" />

                {/* View Switcher */}
                <div className="flex items-center rounded-md border border-border bg-muted/50">
                    {VIEWS.map((v) => (
                        <button
                            key={v.key}
                            onClick={() => onChangeView(v.key)}
                            className={cn(
                                'px-2.5 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md sm:px-3',
                                currentView === v.key
                                    ? 'bg-card text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <span className="hidden sm:inline">{v.label}</span>
                            <span className="sm:hidden">{v.shortLabel}</span>
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div className="hidden h-5 w-px bg-border md:block" />

                {/* Legend */}
                <div className="hidden items-center gap-1.5 md:flex">
                    <LegendDot color="bg-blue-500" label="Follow-ups" />
                    <LegendDot color="bg-violet-500" label="Tasks" />
                </div>
            </div>
        </div>
    );
}

/* -----------------------------------------------
   Legend Dot
   ----------------------------------------------- */
function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground">
            <span className={cn('size-2 rounded-full', color)} />
            {label}
        </span>
    );
}

/* -----------------------------------------------
   Custom Event Content Renderer
   ----------------------------------------------- */
function renderEventContent(arg: EventContentArg) {
    const { event } = arg;
    const ext = event.extendedProps;
    const style = ext.styleKey as (typeof EVENT_STYLES)[string];
    const isTask = ext.eventType === 'task';
    const completed = ext.completed;
    const priority = ext.priority;
    const time = event.start ? formatEventTime(event.start.toISOString()) : '';
    const isTimeGrid = arg.view.type.startsWith('timeGrid');

    // Tooltip content for hover
    const tooltipLines: { icon: typeof User; label: string; value: string }[] = [];

    if (ext.assignedTo) {
        tooltipLines.push({ icon: User, label: 'Assigned to', value: ext.assignedTo });
    }
    if (ext.service) {
        tooltipLines.push({ icon: Briefcase, label: 'Service', value: ext.service });
    }
    if (ext.status) {
        tooltipLines.push({ icon: Clock, label: 'Status', value: ext.status.replace(/_/g, ' ') });
    }
    if (priority) {
        tooltipLines.push({ icon: AlertTriangle, label: 'Priority', value: priority });
    }

    const eventPill = (
        <div
            className={cn(
                'group flex w-full items-center gap-1.5 rounded-[0.3rem] px-1.5 py-1 transition-colors',
                style.bg,
                style.hoverBg,
                completed && 'line-through',
            )}
        >
            {/* Type indicator dot */}
            <span className={cn('size-1.5 shrink-0 rounded-full', style.dot)} />

            {/* Content */}
            <div className="flex min-w-0 flex-1 items-center gap-1">
                {/* Icon for type */}
                {isTask ? (
                    <CheckSquare className={cn('size-3 shrink-0', style.text)} />
                ) : (
                    <Phone className={cn('size-3 shrink-0', style.text)} />
                )}

                {/* Title */}
                <span className={cn('truncate text-[0.6875rem] font-medium leading-tight', style.text)}>
                    {event.title}
                </span>
            </div>

            {/* Time — only in month view */}
            {!isTimeGrid && time && (
                <span className={cn('hidden shrink-0 text-[0.625rem] opacity-70 xl:inline', style.text)}>
                    {time}
                </span>
            )}

            {/* Priority indicator for high priority */}
            {priority === 'high' && !completed && (
                <AlertTriangle className="size-3 shrink-0 text-red-500 dark:text-red-400" />
            )}
        </div>
    );

    // Wrap with tooltip if we have detail lines
    if (tooltipLines.length > 0) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    {eventPill}
                </TooltipTrigger>
                <TooltipContent variant="light" side="bottom" align="start" className="max-w-64 p-0">
                    <EventTooltipBody
                        title={event.title}
                        isTask={isTask}
                        completed={completed}
                        time={time}
                        priority={priority}
                        lines={tooltipLines}
                        style={style}
                    />
                </TooltipContent>
            </Tooltip>
        );
    }

    return eventPill;
}

/* -----------------------------------------------
   Event Tooltip Body
   ----------------------------------------------- */
interface EventTooltipBodyProps {
    title: string;
    isTask: boolean;
    completed: boolean;
    time: string;
    priority: string;
    lines: { icon: typeof User; label: string; value: string }[];
    style: (typeof EVENT_STYLES)[string];
}

function EventTooltipBody({ title, isTask, completed, time, priority, lines, style }: EventTooltipBodyProps) {
    return (
        <div className="min-w-48">
            {/* Header */}
            <div className={cn('flex items-center gap-2 border-b border-border px-3 py-2.5', style.bg)}>
                <span className={cn('size-2 rounded-full', style.dot)} />
                <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-xs font-semibold', style.text, completed && 'line-through')}>
                        {title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge
                            variant={isTask ? 'info' : 'primary'}
                            appearance="light"
                            size="xs"
                        >
                            {isTask ? 'Task' : 'Follow-up'}
                        </Badge>
                        {priority && (
                            <Badge
                                variant={priority === 'high' ? 'destructive' : priority === 'low' ? 'secondary' : 'primary'}
                                appearance="light"
                                size="xs"
                            >
                                {priority}
                            </Badge>
                        )}
                        {completed && (
                            <Badge variant="success" appearance="light" size="xs">
                                Done
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="flex flex-col gap-1.5 px-3 py-2.5">
                {time && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="size-3 shrink-0 opacity-60" />
                        <span>{time}</span>
                    </div>
                )}
                {lines.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icon className="size-3 shrink-0 opacity-60" />
                        <span className="capitalize">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
