import { useState, useCallback, useMemo } from 'react';
import { useCreateDialog } from '@/providers/CreateDialogProvider';
import { index } from '@/actions/App/Http/Controllers/Api/LeadActivityController';
import { isAnyCalendarConnected, getEvents } from '@/actions/App/Http/Controllers/GoogleCalendarController';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/http';
import { CalendarDays, ExternalLink, Link2, Loader2, Search, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isSameDay, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import type { LinkedMeeting } from './types';

interface CrmMeeting {
    id: string;
    subject: string;
    scheduled_at: string;
    duration_minutes?: number | null;
    user?: { id: number; name: string; email: string; avatar?: string };
}

interface GoogleEvent {
    id: string;
    summary: string;
    start: string | null;
    end: string | null;
    meet_link: string | null;
    attendees_count: number;
}

interface CalendarStatus {
    isLinked: boolean;
    id?: string;
    google_account_email?: string;
}

type Tab = 'crm' | 'google' | 'paste';

export function LinkMeetingPopover() {
    const { association, setData } = useCreateDialog();
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<Tab>('crm');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [crmSearch, setCrmSearch] = useState('');
    const [googleSearch, setGoogleSearch] = useState('');
    const [pasteUrl, setPasteUrl] = useState('');
    const [pasteTitle, setPasteTitle] = useState('');

    const { data: crmMeetingsData, isLoading: crmLoading } = useQuery({
        queryKey: ['lead-activities', 'meetings', association?.id],
        queryFn: async (): Promise<CrmMeeting[]> => {
            if (!association?.id) return [];
            const response = await axios.get<{ data?: CrmMeeting[] }>(
                index.url({ query: { lead_id: association.id, type: 'meeting' } }),
            );
            return response.data.data ?? [];
        },
        enabled: open && tab === 'crm' && !!association?.id,
        staleTime: 30_000,
    });

    const { data: calendarStatus } = useQuery({
        queryKey: ['calendar-status'],
        queryFn: async (): Promise<CalendarStatus> => {
            const response = await axios.get<CalendarStatus>(isAnyCalendarConnected.url());
            return response.data;
        },
        enabled: open && tab === 'google',
        staleTime: 60_000,
    });

    const { data: googleEventsData, isLoading: googleLoading } = useQuery({
        queryKey: ['google-calendar-events', calendarStatus?.id],
        queryFn: async (): Promise<GoogleEvent[]> => {
            if (!calendarStatus?.id) return [];
            const timeMin = new Date(Date.now() - 7 * 86400000).toISOString();
            const timeMax = new Date(Date.now() + 30 * 86400000).toISOString();
            const response = await axios.get<{ events?: GoogleEvent[] }>(
                getEvents.url(calendarStatus.id, { query: { time_min: timeMin, time_max: timeMax } }),
            );
            return response.data.events ?? [];
        },
        enabled: open && tab === 'google' && !!calendarStatus?.isLinked && !!calendarStatus?.id,
        staleTime: 60_000,
    });

    const crmMeetings = crmMeetingsData ?? [];
    const googleEvents = googleEventsData ?? [];

    const filteredCrmMeetings = useMemo(() => {
        let list = crmMeetings.filter(
            (m) => m.scheduled_at && isSameDay(parseISO(m.scheduled_at), selectedDate),
        );
        if (crmSearch.trim()) {
            const q = crmSearch.toLowerCase();
            list = list.filter((m) => m.subject?.toLowerCase().includes(q));
        }
        return list;
    }, [crmMeetings, selectedDate, crmSearch]);

    const filteredGoogleEvents = useMemo(() => {
        if (!googleSearch.trim()) return googleEvents;
        const q = googleSearch.toLowerCase();
        return googleEvents.filter((e) => e.summary.toLowerCase().includes(q));
    }, [googleEvents, googleSearch]);

    const crmMeetingDates = useMemo(
        () => crmMeetings.filter((m) => m.scheduled_at).map((m) => parseISO(m.scheduled_at)),
        [crmMeetings],
    );

    const linkMeeting = useCallback(
        (meeting: LinkedMeeting) => {
            setData({ linkedMeeting: meeting });
            setOpen(false);
        },
        [setData],
    );

    const handleLinkCrm = useCallback(
        (m: CrmMeeting) => linkMeeting({ id: m.id, title: m.subject }),
        [linkMeeting],
    );

    const handleLinkGoogle = useCallback(
        (e: GoogleEvent) => linkMeeting({ id: e.id, title: e.summary, meet_link: e.meet_link ?? undefined }),
        [linkMeeting],
    );

    const handlePasteLink = useCallback(() => {
        if (!pasteUrl.trim()) return;
        linkMeeting({ title: pasteTitle.trim() || pasteUrl.trim(), url: pasteUrl.trim(), meet_link: pasteUrl.trim() });
        setPasteUrl('');
        setPasteTitle('');
    }, [pasteUrl, pasteTitle, linkMeeting]);

    if (!association?.id) return null;

    const tabs: { id: Tab; label: string }[] = [
        { id: 'crm', label: 'CRM Meetings' },
        { id: 'google', label: 'Google Calendar' },
        { id: 'paste', label: 'Paste Link' },
    ];

    const calendarDayClass = cn(
        'cursor-pointer relative flex h-8 w-full min-w-8 items-center justify-center whitespace-nowrap rounded-md p-0 text-sm text-foreground transition-colors',
        'hover:not-in-data-selected:bg-zinc-100 dark:hover:not-in-data-selected:bg-zinc-800',
        'group-data-selected:bg-foreground group-data-selected:text-background',
        'group-data-disabled:text-foreground/30 group-data-disabled:line-through group-data-disabled:pointer-events-none',
        'group-data-outside:text-foreground/30',
        'outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
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
            </DialogTrigger>

            <DialogContent className="z-[10001] p-0 gap-0 max-w-[680px] overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-0">
                    <DialogTitle className="text-sm font-semibold tracking-[-0.01em]">Link a meeting</DialogTitle>
                </DialogHeader>

                {/* Tab bar */}
                <div className="flex items-center px-5 pt-3 border-b border-border">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={cn(
                                'px-3 py-2 text-xs font-medium tracking-[-0.01em] leading-4 transition-colors border-b-2 -mb-px',
                                tab === t.id
                                    ? 'text-foreground border-foreground'
                                    : 'text-muted-foreground border-transparent hover:text-foreground',
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* CRM Meetings */}
                {tab === 'crm' && (
                    <div className="flex min-h-[340px] max-h-[480px]">
                        <div className="p-1 border-r border-border shrink-0">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(d) => d && setSelectedDate(d)}
                                modifiers={{ hasMeeting: crmMeetingDates }}
                                modifiersClassNames={{ hasMeeting: '*:after:!bg-blue-500 *:after:!size-1 *:after:!bottom-0.5' }}
                                className="p-2"
                                classNames={{
                                    day_button: calendarDayClass,
                                    today: '*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-foreground [&[data-selected]>*]:after:bg-background [&[data-disabled]>*]:after:bg-foreground/30 *:after:transition-colors',
                                }}
                            />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                                <Search className="size-3.5 shrink-0 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search meetings..."
                                    value={crmSearch}
                                    onChange={(e) => setCrmSearch(e.target.value)}
                                    className="flex-1 bg-transparent text-sm font-normal tracking-[-0.01em] leading-5 text-foreground placeholder:text-muted-foreground/50 outline-none"
                                />
                            </div>
                            <div className="px-3 pt-2.5 pb-1">
                                <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                                    {format(selectedDate, 'EEEE, MMMM d')}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto px-1 pb-1">
                                {crmLoading ? (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                    </div>
                                ) : filteredCrmMeetings.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-1.5">
                                        <CalendarDays className="size-5 text-muted-foreground/40" />
                                        <span className="text-xs text-muted-foreground/60">No meetings on this date</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-px">
                                        {filteredCrmMeetings.map((meeting) => (
                                            <button
                                                key={meeting.id}
                                                type="button"
                                                onClick={() => handleLinkCrm(meeting)}
                                                className="flex flex-col gap-0.5 px-2 py-1.5 rounded-lg text-left w-full hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors duration-[160ms]"
                                            >
                                                <span className="text-sm font-medium tracking-[-0.01em] leading-5 text-foreground truncate">
                                                    {meeting.subject}
                                                </span>
                                                <span className="text-xs text-muted-foreground leading-4">
                                                    {format(parseISO(meeting.scheduled_at), 'h:mm a')}
                                                    {meeting.duration_minutes && <> &middot; {meeting.duration_minutes} min</>}
                                                    {meeting.user?.name && <> &middot; {meeting.user.name}</>}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Google Calendar */}
                {tab === 'google' && (
                    <div className="min-h-[340px] max-h-[480px] flex flex-col">
                        {calendarStatus === undefined ? (
                            <div className="flex items-center justify-center flex-1 py-10">
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : !calendarStatus.isLinked ? (
                            <div className="flex flex-col items-center justify-center flex-1 gap-3 py-10 px-6">
                                <div className="size-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                    <CalendarDays className="size-5 text-muted-foreground" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-foreground">Google Calendar not connected</p>
                                    <p className="text-xs text-muted-foreground mt-1">Connect your Google account to link meetings from your calendar.</p>
                                </div>
                                <a
                                    href="/settings/integrations/calendar"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
                                >
                                    <ExternalLink className="size-3.5" />
                                    Connect Google Calendar
                                </a>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                                    <div className="flex items-center gap-2">
                                        <Search className="size-3.5 shrink-0 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search events..."
                                            value={googleSearch}
                                            onChange={(e) => setGoogleSearch(e.target.value)}
                                            className="bg-transparent text-sm font-normal tracking-[-0.01em] leading-5 text-foreground placeholder:text-muted-foreground/50 outline-none w-48"
                                        />
                                    </div>
                                    {calendarStatus.google_account_email && (
                                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                            {calendarStatus.google_account_email}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto px-1 py-1">
                                    {googleLoading ? (
                                        <div className="flex items-center justify-center py-10">
                                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : filteredGoogleEvents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 gap-1.5">
                                            <CalendarDays className="size-5 text-muted-foreground/40" />
                                            <span className="text-xs text-muted-foreground/60">No upcoming events found</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-px">
                                            {filteredGoogleEvents.map((event) => (
                                                <button
                                                    key={event.id}
                                                    type="button"
                                                    onClick={() => handleLinkGoogle(event)}
                                                    className="flex items-start gap-3 px-2 py-2 rounded-lg text-left w-full hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors duration-[160ms]"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-sm font-medium tracking-[-0.01em] leading-5 text-foreground truncate block">
                                                            {event.summary}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground leading-4">
                                                            {event.start ? format(parseISO(event.start), 'MMM d · h:mm a') : 'All day'}
                                                            {event.attendees_count > 0 && <> &middot; {event.attendees_count} attendees</>}
                                                        </span>
                                                    </div>
                                                    {event.meet_link && (
                                                        <span className="shrink-0 inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                                                            <Video className="size-2.5" />
                                                            Meet
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Paste Link */}
                {tab === 'paste' && (
                    <div className="flex flex-col gap-4 p-5 min-h-[340px]">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-foreground">Meeting URL</label>
                            <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-ring/30">
                                <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                                <input
                                    type="url"
                                    placeholder="https://meet.google.com/..."
                                    value={pasteUrl}
                                    onChange={(e) => setPasteUrl(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handlePasteLink(); }}
                                    className="flex-1 bg-transparent text-sm font-normal tracking-[-0.01em] leading-5 text-foreground placeholder:text-muted-foreground/40 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-foreground">
                                Meeting title <span className="text-muted-foreground font-normal">(optional)</span>
                            </label>
                            <div className="flex items-center h-9 px-3 rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-ring/30">
                                <input
                                    type="text"
                                    placeholder="e.g. Demo call with Acme"
                                    value={pasteTitle}
                                    onChange={(e) => setPasteTitle(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handlePasteLink(); }}
                                    className="flex-1 bg-transparent text-sm font-normal tracking-[-0.01em] leading-5 text-foreground placeholder:text-muted-foreground/40 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handlePasteLink}
                                disabled={!pasteUrl.trim()}
                                className="inline-flex items-center justify-center h-8 px-4 rounded-lg text-xs font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                            >
                                Link meeting
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="inline-flex items-center justify-center h-8 px-4 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground/60">
                            Supports Google Meet, Zoom, Microsoft Teams, and other meeting URLs.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
