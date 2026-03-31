import { useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarDays, CheckSquare, Clock, Phone, Mail, Users, PlusIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type CalendarEvent } from '@/components/ui/calendar/types';

interface CalendarSidebarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    events: CalendarEvent[];
    onNewEvent: () => void;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    eventCounts: Record<string, number>;
}

const EVENT_COLORS: Record<string, string> = {
    sky: 'after:bg-sky-500',
    amber: 'after:bg-amber-500',
    violet: 'after:bg-violet-500',
    rose: 'after:bg-rose-500',
    emerald: 'after:bg-emerald-500',
    orange: 'after:bg-orange-500',
};

const MENU_ITEMS = [
    { id: 'all', label: 'All Events', icon: CalendarDays, color: 'text-blue-400' },
    { id: 'follow_up', label: 'Follow-ups', icon: Clock, color: 'text-sky-400' },
    { id: 'task', label: 'Tasks', icon: CheckSquare, color: 'text-violet-400' },
    { id: 'call', label: 'Calls', icon: Phone, color: 'text-green-400' },
    { id: 'meeting', label: 'Meetings', icon: Users, color: 'text-orange-400' },
    { id: 'email', label: 'Emails', icon: Mail, color: 'text-cyan-400' },
];

export function CalendarSidebar({
    selectedDate,
    onDateSelect,
    events,
    onNewEvent,
    activeFilter,
    onFilterChange,
    eventCounts,
}: CalendarSidebarProps) {
    const eventsForSelectedDate = useMemo(() => {
        return events.filter((event) => {
            const eventDate = new Date(event.start);
            return (
                eventDate.getFullYear() === selectedDate.getFullYear() &&
                eventDate.getMonth() === selectedDate.getMonth() &&
                eventDate.getDate() === selectedDate.getDate()
            );
        });
    }, [events, selectedDate]);

    return (
        <div className="dark hidden w-[260px] shrink-0 flex-col border-r border-white/10 bg-zinc-950 lg:flex">
            <ScrollArea className="h-full">
                <div className="w-full space-y-6 py-4">
                    {/* Mini Calendar */}
                    <div className="px-4">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && onDateSelect(date)}
                            className="w-full bg-transparent p-0 text-white"
                            required
                        />
                    </div>

                    {/* Selected Date Events */}
                    <div className="flex flex-col items-start gap-3 px-4">
                        <div className="flex w-full items-center justify-between px-1">
                            <div className="text-sm font-medium text-white">
                                {selectedDate.toLocaleDateString('en-US', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </div>
                            <Button variant="ghost" size="icon" className="size-6 text-white/60 hover:text-white" title="Add Event" onClick={onNewEvent}>
                                <PlusIcon className="size-4" />
                                <span className="sr-only">Add Event</span>
                            </Button>
                        </div>
                        <div className="flex w-full flex-col gap-2">
                            {eventsForSelectedDate.length === 0 ? (
                                <p className="px-1 text-xs text-white/40">No events for this date</p>
                            ) : (
                                eventsForSelectedDate.map((event) => (
                                    <div
                                        key={event.id}
                                        className={cn(
                                            'relative rounded-md bg-white/5 p-2 pl-6 text-sm text-white after:absolute after:inset-y-2 after:left-2 after:w-1 after:rounded-full',
                                            EVENT_COLORS[event.color || 'sky'],
                                        )}
                                    >
                                        <div className="font-medium">{event.title}</div>
                                        <div className="text-xs text-white/40">{format(new Date(event.start), 'h:mm a')}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Category Menu */}
                    <div className="space-y-3.5 px-4 pt-2">
                        <div className="text-[0.725rem] font-medium uppercase tracking-wider text-white/40">Calendars</div>
                        <div className="space-y-0.5">
                            {MENU_ITEMS.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onFilterChange(item.id)}
                                    className={cn(
                                        'flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition-all duration-200',
                                        'hover:bg-white/5 active:scale-[0.98]',
                                        activeFilter === item.id ? 'bg-white/10 shadow-sm' : 'bg-transparent',
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={cn(
                                                'flex size-7 items-center justify-center rounded-md',
                                                activeFilter === item.id ? 'bg-white/10' : 'bg-white/5',
                                            )}
                                        >
                                            <item.icon className={cn('size-4', item.color)} />
                                        </div>
                                        <span className={cn('text-sm font-medium', activeFilter === item.id ? 'text-white' : 'text-gray-300')}>
                                            {item.label}
                                        </span>
                                    </div>
                                    {(eventCounts[item.id] ?? 0) > 0 && (
                                        <span
                                            className={cn(
                                                'rounded-full px-2 py-0.5 text-xs font-semibold',
                                                activeFilter === item.id ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400',
                                            )}
                                        >
                                            {eventCounts[item.id]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
