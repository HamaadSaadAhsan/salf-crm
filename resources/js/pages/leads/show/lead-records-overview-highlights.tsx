import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    CalendarCheck,
    Clock,
    EllipsisVertical,
    Flag,
    LayoutDashboard,
    MessageSquareText,
    Phone,
    TrendingUp,
    UserCheck,
} from 'lucide-react';
import { Lead } from '@/types/lead';
import { format, parseISO } from 'date-fns';

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

export function LeadRecordsOverviewHighlights({ lead }: { lead: Lead }) {
    const leadScore = lead.lead_score || 0;
    const isHotLead = lead.is_hot_lead || false;
    const nextTask = lead.next_task;

    return (
        <div className="space-y-3.5">
            <h3 className="ms-1 flex items-center gap-1.5 text-sm font-semibold">
                <LayoutDashboard className="size-3.5 opacity-60" />
                Highlights
            </h3>

            {/* Responsive grid: 1 column on mobile, 2 columns on sm+ */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:flex lg:gap-4">
                {/* Lead Score */}
                <Card className="w-full shadow-none lg:w-72">
                    <CardHeader className="border-0 p-2.5 py-0 min-h-10">
                        <CardTitle className="text-2sm font-normal">
                            Lead Score
                        </CardTitle>
                        <div className="ml-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        <EllipsisVertical className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem>
                                        <MessageSquareText className="h-3.5 w-3.5" />
                                        Message
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Phone className="h-3.5 w-3.5" />
                                        Call
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <CalendarCheck className="h-3.5 w-3.5" />
                                        Schedule Meeting
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
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
                        <div className="ml-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        <EllipsisVertical className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem>
                                        <CalendarCheck className="h-3.5 w-3.5" />
                                        Reschedule
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <MessageSquareText className="h-3.5 w-3.5" />
                                        Send Reminder
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
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
            </div>
        </div>
    );
}
