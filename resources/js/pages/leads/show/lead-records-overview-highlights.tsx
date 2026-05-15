import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Lead, LeadStatus } from '@/types/lead';
import { store } from '@/actions/App/Http/Controllers/Api/LeadActivityController';
import { router } from '@inertiajs/react';
import axios from '@/lib/http';
import { format, parseISO } from 'date-fns';
import {
    CalendarCheck,
    CalendarIcon,
    Clock,
    EllipsisVertical,
    LayoutDashboard,
    UserCheck,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TIME_SLOTS = [
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
    '22:00', '22:30', '23:00', '23:30', '00:00', '00:30',
    '01:00', '01:30', '02:00',
];

const DURATION_OPTIONS = [
    { value: '15', label: '15 min' },
    { value: '30', label: '30 min' },
    { value: '45', label: '45 min' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
];

const LEAD_STAGES = [
    { key: 'new', label: 'New', color: 'bg-blue-400' },
    { key: 'contacted', label: 'Contacted', color: 'bg-amber-400' },
    { key: 'qualified', label: 'Qualified', color: 'bg-emerald-400' },
    { key: 'assigned_to_advisor', label: 'Assigned', color: 'bg-violet-400' },
] as const;

const ADVISOR_STAGES = [
    { key: 'new', label: 'New', color: 'bg-blue-400' },
    { key: 'contacted', label: 'Contacted', color: 'bg-amber-400' },
    { key: 'meeting', label: 'Meeting', color: 'bg-orange-400' },
    { key: 'contract_signed', label: 'Contract', color: 'bg-emerald-400' },
    { key: 'initial_payment', label: 'Payment', color: 'bg-teal-400' },
    { key: 'won', label: 'Won', color: 'bg-green-400' },
] as const;

const QUALIFIED_STATUSES: LeadStatus[] = ['qualified', 'assigned_to_advisor', 'proposal', 'won', 'converted'];

function getStageInfo(lead: Lead) {
    const isQualified = QUALIFIED_STATUSES.includes(lead.inquiry_status);
    const hasAdvisorStage = !!lead.advisor_stage && lead.advisor_stage !== 'lost';

    if (isQualified && hasAdvisorStage) {
        const stages = ADVISOR_STAGES;
        const currentIndex = stages.findIndex(s => s.key === lead.advisor_stage);
        return {
            label: 'Advisor stage',
            currentName: stages[currentIndex]?.label ?? lead.advisor_stage,
            stages,
            currentIndex: currentIndex >= 0 ? currentIndex : 0,
        };
    }

    const stages = LEAD_STAGES;
    const statusToStageMap: Record<string, string> = {
        new: 'new',
        assigned_to_cro: 'new',
        contacted: 'contacted',
        qualified: 'qualified',
        assigned_to_advisor: 'assigned_to_advisor',
    };
    const mappedKey = statusToStageMap[lead.inquiry_status] ?? 'new';
    const currentIndex = stages.findIndex(s => s.key === mappedKey);

    return {
        label: 'Lead stage',
        currentName: stages[currentIndex]?.label ?? lead.inquiry_status,
        stages,
        currentIndex: currentIndex >= 0 ? currentIndex : 0,
    };
}

const formatTaskDueDate = (dueAt: string): string => {
    try {
        const date = parseISO(dueAt);
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (date.toDateString() === now.toDateString()) {
            return 'Today ' + format(date, 'h:mm a');
        }
        if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow ' + format(date, 'h:mm a');
        }
        return format(date, 'MMM d, h:mm a');
    } catch {
        return dueAt;
    }
};

const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export function LeadRecordsOverviewHighlights({ lead }: { lead: Lead }) {
    const nextTask = lead.next_task;
    const nextMeeting = lead.next_meeting;
    const stageInfo = getStageInfo(lead);
    const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);

    return (
        <div className="space-y-3.5">
            <h3 className="ms-1 flex items-center gap-1.5 text-sm font-semibold">
                <LayoutDashboard className="size-3.5 opacity-60" />
                Highlights
            </h3>

            {/* Attio-style responsive grid: 1 col mobile, max 3 columns desktop */}
            <div
                className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(max(168px,calc((100%-16px)/3)),1fr))]"
            >
                {/* Lead/Advisor Stage */}
                <div className="relative h-[86px]">
                    <div className="absolute inset-0 flex flex-col rounded-xl bg-card shadow-[inset_0_0_0_1px_var(--color-border)]">
                        <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
                            <span className="truncate text-xs font-medium text-muted-foreground">
                                {stageInfo.label}
                            </span>
                        </div>
                        <div className="mt-auto px-3 pb-2.5">
                            <span className="text-sm font-medium text-card-foreground">
                                {stageInfo.currentName}
                            </span>
                            <div className="flex gap-0.5 mt-1">
                                {stageInfo.stages.map((stage, i) => (
                                    <Tooltip key={stage.key}>
                                        <TooltipTrigger asChild>
                                            <div className="flex-1 py-1.5 cursor-default">
                                                <div
                                                    className={cn(
                                                        'h-1 rounded-full transition-colors',
                                                        i <= stageInfo.currentIndex
                                                            ? stage.color
                                                            : 'bg-border',
                                                    )}
                                                />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent
                                            side="bottom"
                                            className="rounded-lg bg-zinc-950 px-2 py-1 text-xs text-white dark:border-0 dark:bg-zinc-950 dark:text-white"
                                        >
                                            {stage.label}
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Next Follow-up */}
                <div className="relative h-[86px]">
                    <div className="absolute inset-0 flex flex-col rounded-xl bg-card shadow-[inset_0_0_0_1px_var(--color-border)]">
                        <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
                            <span className="truncate text-xs font-medium text-muted-foreground">
                                Next follow-up
                            </span>
                        </div>
                        <div className="mt-auto overflow-hidden px-3 pb-2.5">
                            {nextTask ? (
                                <div className="flex flex-col gap-0.5">
                                    <span className="truncate text-sm font-medium text-card-foreground">
                                        {nextTask.title}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        {nextTask.assigned_to && (
                                            <>
                                                <UserCheck className="size-3 shrink-0" />
                                                <span className="truncate">{nextTask.assigned_to.name}</span>
                                            </>
                                        )}
                                        {nextTask.due_at && (
                                            <>
                                                {nextTask.assigned_to && <span>·</span>}
                                                <Clock className="size-3 shrink-0" />
                                                <span className="shrink-0">{formatTaskDueDate(nextTask.due_at)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-sm text-muted-foreground/60">
                                    No upcoming tasks
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Next Meeting */}
                <div className="relative h-[86px]">
                    <div className="absolute inset-0 flex flex-col rounded-xl bg-card shadow-[inset_0_0_0_1px_var(--color-border)]">
                        <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
                            <span className="truncate text-xs font-medium text-muted-foreground">
                                Next meeting
                            </span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="shrink-0 rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                                        <EllipsisVertical className="size-3.5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setMeetingDialogOpen(true)}>
                                        <CalendarCheck className="size-3.5" />
                                        Schedule Meeting
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="mt-auto overflow-hidden px-3 pb-2.5">
                            {nextMeeting ? (
                                <div className="flex flex-col gap-0.5">
                                    <span className="truncate text-sm font-medium text-card-foreground">
                                        {nextMeeting.subject}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        {nextMeeting.user && (
                                            <>
                                                <Users className="size-3 shrink-0" />
                                                <span className="truncate">{nextMeeting.user.name}</span>
                                            </>
                                        )}
                                        <span>·</span>
                                        <Clock className="size-3 shrink-0" />
                                        <span className="shrink-0">{formatTaskDueDate(nextMeeting.scheduled_at)}</span>
                                        {nextMeeting.duration_minutes && (
                                            <>
                                                <span>·</span>
                                                <span className="shrink-0">{formatDuration(nextMeeting.duration_minutes)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-sm text-muted-foreground/60">
                                    No upcoming meetings
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ScheduleMeetingDialog
                open={meetingDialogOpen}
                onOpenChange={setMeetingDialogOpen}
                leadId={lead.id}
            />
        </div>
    );
}

function ScheduleMeetingDialog({
    open,
    onOpenChange,
    leadId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId: string;
}) {
    const [subject, setSubject] = useState('');
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState('60');
    const [submitting, setSubmitting] = useState(false);
    const [datePickerOpen, setDatePickerOpen] = useState(false);

    const resetForm = () => {
        setSubject('');
        setDate(undefined);
        setTime('');
        setDuration('60');
    };

    const handleSubmit = async () => {
        if (!subject.trim() || !date || !time) {
            toast.error('Please fill in all required fields.');
            return;
        }

        setSubmitting(true);

        try {
            const [hours, minutes] = time.split(':').map(Number);
            const scheduledAt = new Date(date);
            scheduledAt.setHours(hours, minutes, 0, 0);

            const dueAt = new Date(scheduledAt);
            dueAt.setMinutes(dueAt.getMinutes() + parseInt(duration));

            await axios.post(store.url(), {
                lead_id: leadId,
                type: 'meeting',
                subject: subject.trim(),
                scheduled_at: scheduledAt.toISOString(),
                due_at: dueAt.toISOString(),
                duration_minutes: parseInt(duration),
                description: `Meeting scheduled for ${format(scheduledAt, 'MMM d, yyyy h:mm a')} (${DURATION_OPTIONS.find(d => d.value === duration)?.label})`,
            });

            toast.success('Meeting scheduled successfully.');
            resetForm();
            onOpenChange(false);
            router.reload({ only: ['lead'] });
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to schedule meeting.';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen) resetForm();
            onOpenChange(isOpen);
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Schedule Meeting</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="meeting-subject">Subject</Label>
                        <Input
                            id="meeting-subject"
                            placeholder="e.g. Discovery call, Follow-up meeting"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Date</Label>
                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !date && 'text-muted-foreground',
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, 'PPP') : 'Pick a date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => {
                                        setDate(d);
                                        setDatePickerOpen(false);
                                    }}
                                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Time</Label>
                            <Select value={time} onValueChange={setTime}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_SLOTS.map((slot) => (
                                        <SelectItem key={slot} value={slot}>
                                            {slot}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Duration</Label>
                            <Select value={duration} onValueChange={setDuration}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Duration" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DURATION_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Scheduling...' : 'Schedule Meeting'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
