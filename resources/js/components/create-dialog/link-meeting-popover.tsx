import { useState, useCallback, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useCreateDialog } from '@/providers/CreateDialogProvider';
import { index } from '@/actions/App/Http/Controllers/Api/LeadActivityController';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { CalendarDays, Loader2, Search, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isSameDay, parseISO } from 'date-fns';
import type { LeadActivity } from '@/types/lead';

interface Meeting {
    id: string;
    subject: string;
    scheduled_at: string;
    duration_minutes?: number | null;
    user?: { id: number; name: string; email: string; avatar?: string };
}

export function LinkMeetingPopover() {
    const { association, data, setData } = useCreateDialog();
    const [open, setOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [search, setSearch] = useState('');

    // Fetch meetings for the associated lead
    const { data: meetingsData, isLoading } = useQuery({
        queryKey: ['lead-activities', 'meetings', association?.id],
        queryFn: async () => {
            if (!association?.id) return [];
            const response = await axios.get(index.url({ query: { lead_id: association.id, type: 'meeting' } }));
            return (response.data?.data ?? []) as Meeting[];
        },
        enabled: open && !!association?.id,
        staleTime: 30_000,
    });

    const meetings = meetingsData ?? [];

    // Filter meetings for the selected date
    const filteredMeetings = useMemo(() => {
        let filtered = meetings.filter((m) => {
            if (!m.scheduled_at) return false;
            return isSameDay(parseISO(m.scheduled_at), selectedDate);
        });

        if (search.trim()) {
            const q = search.toLowerCase();
            filtered = filtered.filter((m) => m.subject?.toLowerCase().includes(q));
        }

        return filtered;
    }, [meetings, selectedDate, search]);

    // Dates that have meetings (for calendar highlighting)
    const meetingDates = useMemo(() => {
        return meetings
            .filter((m) => m.scheduled_at)
            .map((m) => parseISO(m.scheduled_at));
    }, [meetings]);

    const handleSelectMeeting = useCallback(
        (meeting: Meeting) => {
            // Link the meeting to the note by adding reference in metadata
            const meetingRef = `[Meeting: ${meeting.subject} — ${format(parseISO(meeting.scheduled_at), 'MMM d, yyyy h:mm a')}]`;
            const currentDesc = data.description || '';
            setData({
                description: currentDesc ? `${currentDesc}\n\n${meetingRef}` : meetingRef,
            });
            setOpen(false);
        },
        [data.description, setData],
    );

    const handleDateSelect = useCallback((date: Date | undefined) => {
        if (date) {
            setSelectedDate(date);
        }
    }, []);

    if (!association?.id) return null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'inline-flex items-center gap-1 h-[22px] px-2 rounded-md',
                        'text-xs font-medium tracking-[-0.01em] leading-4',
                        'bg-zinc-100 dark:bg-zinc-800 text-muted-foreground',
                        'hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-foreground',
                        'transition-colors cursor-pointer',
                    )}
                >
                    <Video className="size-3 shrink-0" />
                    <span>Link a meeting</span>
                </button>
            </PopoverTrigger>

            <PopoverContent
                align="start"
                sideOffset={6}
                className={cn(
                    'w-auto p-0 rounded-xl border-0',
                    'bg-white dark:bg-[rgb(31,33,37)]',
                    'shadow-[rgb(228,228,231)_0_0_0_1px_inset,rgba(0,0,0,0.04)_0_0_0_1px,rgba(0,0,0,0.06)_0_4px_8px_-4px]',
                    'dark:shadow-[rgb(47,48,51)_0_0_0_1px_inset,rgba(0,0,0,0.16)_0_0_0_1px,rgba(0,0,0,0.48)_0_4px_8px_-4px,rgba(0,0,0,0.64)_0_4px_12px_-2px]',
                )}
            >
                <div className="flex">
                    {/* Calendar — left side */}
                    <div className="p-1">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            modifiers={{ hasMeeting: meetingDates }}
                            modifiersClassNames={{
                                hasMeeting:
                                    '*:after:!bg-blue-500 *:after:!size-1 *:after:!bottom-0.5',
                            }}
                            className="p-2"
                            classNames={{
                                day_button: cn(
                                    'cursor-pointer relative flex h-8 w-full min-w-8 items-center justify-center whitespace-nowrap rounded-md p-0 text-sm text-foreground transition-colors',
                                    'hover:not-in-data-selected:bg-zinc-100 dark:hover:not-in-data-selected:bg-zinc-800',
                                    'group-data-selected:bg-foreground group-data-selected:text-background',
                                    'group-data-disabled:text-foreground/30 group-data-disabled:line-through group-data-disabled:pointer-events-none',
                                    'group-data-outside:text-foreground/30',
                                    'outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                ),
                                today: '*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-foreground [&[data-selected]>*]:after:bg-background [&[data-disabled]>*]:after:bg-foreground/30 *:after:transition-colors',
                            }}
                        />
                    </div>

                    {/* Vertical separator */}
                    <div className="w-px bg-border dark:bg-zinc-700 my-2" />

                    {/* Meeting list — right side */}
                    <div className="flex flex-col min-w-[252px] max-w-[300px]">
                        {/* Search input */}
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border dark:border-zinc-700">
                            <Search className="size-3.5 shrink-0 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search meetings..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={cn(
                                    'flex-1 bg-transparent text-sm font-normal tracking-[-0.01em] leading-5',
                                    'text-foreground placeholder:text-muted-foreground/50',
                                    'outline-none border-0',
                                )}
                            />
                        </div>

                        {/* Date label */}
                        <div className="px-3 pt-2.5 pb-1">
                            <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                                {format(selectedDate, 'EEEE, MMMM d')}
                            </span>
                        </div>

                        {/* Meeting list */}
                        <div className="flex-1 overflow-y-auto max-h-[300px] px-1 pb-1">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredMeetings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-1.5">
                                    <CalendarDays className="size-5 text-muted-foreground/40" />
                                    <span className="text-xs text-muted-foreground/60">No meetings on this date</span>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-px">
                                    {filteredMeetings.map((meeting) => (
                                        <button
                                            key={meeting.id}
                                            type="button"
                                            onClick={() => handleSelectMeeting(meeting)}
                                            className={cn(
                                                'flex flex-col gap-0.5 px-2 py-1.5 rounded-lg text-left w-full',
                                                'hover:bg-zinc-100 dark:hover:bg-white/5',
                                                'transition-colors duration-[160ms]',
                                            )}
                                        >
                                            <span className="text-sm font-medium tracking-[-0.01em] leading-5 text-foreground truncate">
                                                {meeting.subject}
                                            </span>
                                            <span className="text-xs text-muted-foreground leading-4">
                                                {format(parseISO(meeting.scheduled_at), 'h:mm a')}
                                                {meeting.duration_minutes && (
                                                    <> &middot; {meeting.duration_minutes} min</>
                                                )}
                                                {meeting.user?.name && (
                                                    <> &middot; {meeting.user.name}</>
                                                )}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
