import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { Lead } from '@/types/lead';
import { store } from '@/actions/App/Http/Controllers/Api/LeadActivityController';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import {
    CalendarCheck,
    CalendarIcon,
    Clock,
    EllipsisVertical,
    Flag,
    LayoutDashboard,
    TrendingUp,
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

const getLeadScoreQuality = (score: number): string => {
    if (score >= 80) return 'High Quality';
    if (score >= 60) return 'Good Quality';
    if (score >= 40) return 'Medium Quality';
    return 'Low Quality';
};

const getLeadScoreVariant = (score: number): 'primary' | 'secondary' | 'outline' | 'destructive' => {
    if (score >= 80) return 'primary';
    if (score >= 60) return 'secondary';
    return 'outline';
};

const getLeadScoreMessage = (score: number, isHotLead: boolean): string => {
    if (isHotLead) return 'High priority - Likely to convert';
    if (score >= 80) return 'Likely to convert';
    if (score >= 60) return 'Good conversion potential';
    if (score >= 40) return 'Moderate conversion chance';
    return 'Needs more qualification';
};

const formatTaskDueDate = (dueAt: string): string => {
    try {
        const date = parseISO(dueAt);
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Check if today
        if (date.toDateString() === now.toDateString()) {
            return 'Today ' + format(date, 'h:mm a');
        }

        // Check if tomorrow
        if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow ' + format(date, 'h:mm a');
        }

        // Otherwise show full date
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
    const leadScore = lead.lead_score || 0;
    const isHotLead = lead.is_hot_lead || false;
    const nextTask = lead.next_task;
    const nextMeeting = lead.next_meeting;
    const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);

    return (
        <div className="space-y-3.5">
            <h3 className="ms-1 flex items-center gap-1.5 text-sm font-semibold">
                <LayoutDashboard className="size-3.5 opacity-60" />
                Highlights
            </h3>

            {/* Responsive grid: 1 column on mobile, 2 columns on sm+, 3 on lg */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:flex lg:gap-4">
                {/* Lead Score */}
                <Card className="w-full shadow-none lg:w-72">
                    <CardHeader className="border-0 p-2.5 py-0 min-h-10">
                        <CardTitle className="text-2sm font-normal">
                            Lead Score
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-2.5 pb-2.5 pt-1">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="text-muted-foreground h-4 w-4" />
                            <span className="text-2xl font-semibold">{leadScore}</span>
                            <Badge size="sm" variant={getLeadScoreVariant(leadScore)}>
                                {getLeadScoreQuality(leadScore)}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <UserCheck className="text-muted-foreground size-3.5 shrink-0" />
                            <span className="text-sm">
                                {getLeadScoreMessage(leadScore, isHotLead)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Next Follow-up/Task */}
                <Card className="w-full shadow-none lg:w-72">
                    <CardHeader className="border-0 p-2.5 py-0 min-h-10">
                        <CardTitle className="text-2sm font-normal">
                            Next Follow-up
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-2.5 pb-2.5 pt-1">
                        {nextTask ? (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Flag className="text-muted-foreground size-3.5 shrink-0" />
                                    <span className="font-medium">
                                        {nextTask.title}
                                    </span>
                                </div>
                                {nextTask.assigned_to && (
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="text-muted-foreground size-3.5 shrink-0" />
                                        <span className="text-sm">
                                            Assigned to {nextTask.assigned_to.name}
                                        </span>
                                    </div>
                                )}
                                {nextTask.due_at && (
                                    <div className="flex items-center gap-2">
                                        <Clock className="text-muted-foreground size-3.5 shrink-0" />
                                        <Badge size="sm">
                                            {formatTaskDueDate(nextTask.due_at)}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <CalendarCheck className="size-3.5 shrink-0" />
                                <span>No upcoming tasks</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Next Meeting */}
                <Card className="w-full shadow-none lg:w-72">
                    <CardHeader className="border-0 p-2.5 py-0 min-h-10">
                        <CardTitle className="text-2sm font-normal">
                            Next Meeting
                        </CardTitle>
                        <div className="ml-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        <EllipsisVertical className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={() => setMeetingDialogOpen(true)}>
                                        <CalendarCheck className="h-3.5 w-3.5" />
                                        Schedule Meeting
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2 px-2.5 pb-2.5 pt-1">
                        {nextMeeting ? (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Users className="text-muted-foreground size-3.5 shrink-0" />
                                    <span className="font-medium">
                                        {nextMeeting.subject}
                                    </span>
                                </div>
                                {nextMeeting.user && (
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="text-muted-foreground size-3.5 shrink-0" />
                                        <span className="text-sm">
                                            Scheduled by {nextMeeting.user.name}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Clock className="text-muted-foreground size-3.5 shrink-0" />
                                    <Badge size="sm">
                                        {formatTaskDueDate(nextMeeting.scheduled_at)}
                                    </Badge>
                                    {nextMeeting.duration_minutes && (
                                        <Badge size="sm" variant="outline">
                                            {formatDuration(nextMeeting.duration_minutes)}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Users className="size-3.5 shrink-0" />
                                <span>No upcoming meetings</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
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
