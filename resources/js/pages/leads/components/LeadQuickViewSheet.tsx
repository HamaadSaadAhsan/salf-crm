import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetBody,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Lead, LeadActivity as LeadActivityType, LeadStatus } from '@/types/lead';
import type { Task } from '@/types/task';
import { router } from '@inertiajs/react';
import {
    Activity,
    Briefcase,
    Calendar,
    CalendarClock,
    DollarSign,
    ExternalLink,
    FileText,
    FlameIcon,
    Globe,
    ListTodo,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    PhoneMissed,
    RefreshCw,
    User,
} from 'lucide-react';
import { memo, useMemo } from 'react';

// --- Status config (reuse from LeadRow) ---
type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive';

const STATUS_CONFIG: Record<LeadStatus, { label: string; variant: BadgeVariant; appearance: 'light' | 'outline' }> = {
    new: { label: 'New', variant: 'primary', appearance: 'light' },
    contacted: { label: 'Contacted', variant: 'info', appearance: 'light' },
    qualified: { label: 'Qualified', variant: 'success', appearance: 'light' },
    assigned_to_advisor: { label: 'With Advisor', variant: 'primary', appearance: 'outline' },
    requalify: { label: 'Requalify', variant: 'warning', appearance: 'light' },
    proposal: { label: 'Proposal', variant: 'info', appearance: 'outline' },
    won: { label: 'Won', variant: 'success', appearance: 'outline' },
    lost: { label: 'Lost', variant: 'destructive', appearance: 'light' },
    nurturing: { label: 'Nurturing', variant: 'secondary', appearance: 'light' },
    converted: { label: 'Converted', variant: 'success', appearance: 'light' },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
    low: { color: 'bg-cyan-400', label: 'Low' },
    medium: { color: 'bg-green-500', label: 'Medium' },
    high: { color: 'bg-orange-500', label: 'High' },
    urgent: { color: 'bg-red-500', label: 'Urgent' },
};

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
    call: Phone,
    email: Mail,
    meeting: Calendar,
    note: FileText,
    message: MessageSquare,
    follow_up: CalendarClock,
    status_change: RefreshCw,
    assignment_change: User,
};

const ACTIVITY_COLORS: Record<string, string> = {
    call: 'bg-blue-500',
    email: 'bg-purple-500',
    meeting: 'bg-green-500',
    note: 'bg-gray-400',
    message: 'bg-cyan-500',
    follow_up: 'bg-amber-500',
    status_change: 'bg-indigo-500',
    assignment_change: 'bg-teal-500',
};

function formatLeadAge(rawDays: number): string {
    const days = Math.floor(rawDays);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    const weeks = Math.floor(days / 7);
    if (days < 30) return weeks === 1 ? '1 week' : `${weeks} weeks`;
    const months = Math.floor(days / 30);
    if (days < 365) return months === 1 ? '1 month' : `${months} months`;
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    if (remainingMonths === 0) return years === 1 ? '1 year' : `${years} years`;
    return `${years}y ${remainingMonths}m`;
}

// --- Sub-components ---

const ContactCard = memo(({ lead }: { lead: Lead }) => {
    const hasContactInfo = lead.email || lead.city || lead.country || lead.occupation;
    if (!hasContactInfo) return null;

    return (
        <div className="space-y-2.5 rounded-lg border bg-muted/30 p-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <User size={12} />
                Contact
            </h3>
            <div className="space-y-2">
                {lead.email && (
                    <div className="flex items-center gap-2.5 text-sm">
                        <Mail size={14} className="shrink-0 text-muted-foreground" />
                        <a href={`mailto:${lead.email}`} className="truncate text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                            {lead.email}
                        </a>
                    </div>
                )}
                {(lead.city || lead.country) && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <MapPin size={14} className="shrink-0" />
                        <span>{[lead.city, lead.country].filter(Boolean).join(', ')}</span>
                    </div>
                )}
                {lead.occupation && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Briefcase size={14} className="shrink-0" />
                        <span>{lead.occupation}</span>
                    </div>
                )}
            </div>
        </div>
    );
});
ContactCard.displayName = 'ContactCard';

const MetricCard = memo(({ icon: Icon, label, value, className }: { icon: typeof Phone; label: string; value: string; className?: string }) => (
    <div className={cn('space-y-1 rounded-lg border bg-card p-3', className)}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon size={12} />
            <span className="font-medium">{label}</span>
        </div>
        <p className="truncate text-sm font-semibold">{value}</p>
    </div>
));
MetricCard.displayName = 'MetricCard';

const CallStatsCard = memo(({ activities }: { activities: LeadActivityType[] }) => {
    const callActivities = activities.filter((a) => a.type === 'call');
    const totalCalls = callActivities.length;
    const missedCalls = callActivities.filter((a) => a.status === 'no_answer' || a.status === 'busy').length;
    const successfulCalls = callActivities.filter((a) => a.status === 'successful').length;

    return (
        <div className="space-y-3 rounded-lg border bg-card p-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Phone size={12} />
                Call Activity
            </h3>
            <div className="flex items-center gap-5">
                <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                        <Phone size={14} className="text-primary" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold leading-tight">{totalCalls}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-full bg-green-500/10">
                        <Phone size={14} className="text-green-600" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Answered</p>
                        <p className="text-lg font-bold leading-tight text-green-600">{successfulCalls}</p>
                    </div>
                </div>
                {missedCalls > 0 && (
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-destructive/10">
                            <PhoneMissed size={14} className="text-destructive" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Missed</p>
                            <p className="text-lg font-bold leading-tight text-destructive">{missedCalls}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
CallStatsCard.displayName = 'CallStatsCard';

const PendingTasksCard = memo(({ tasks }: { tasks: Task[] }) => {
    const pendingTasks = tasks.filter((t) => t.status?.value === 'pending' || t.status?.value === 'in_progress');
    if (pendingTasks.length === 0) return null;

    return (
        <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ListTodo size={12} />
                    Pending Tasks
                </h3>
                <Badge variant="secondary" appearance="light" size="xs">
                    {pendingTasks.length}
                </Badge>
            </div>
            <div className="space-y-2">
                {pendingTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-start gap-2.5 rounded-md border bg-muted/30 p-2.5">
                        <div
                            className={cn(
                                'mt-1.5 size-1.5 shrink-0 rounded-full',
                                task.is_overdue ? 'bg-destructive' : 'bg-amber-500',
                            )}
                        />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{task.title}</p>
                            <div className="mt-0.5 flex items-center gap-2">
                                {task.due_at_formatted && (
                                    <span className={cn('text-xs', task.is_overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                                        {task.is_overdue ? 'Overdue: ' : 'Due: '}
                                        {task.due_at_formatted}
                                    </span>
                                )}
                                {task.type?.label && (
                                    <Badge variant="secondary" appearance="light" size="xs">
                                        {task.type.label}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        {task.priority?.value && (
                            <Badge
                                variant={task.priority.value === 'urgent' ? 'destructive' : task.priority.value === 'high' ? 'warning' : 'secondary'}
                                appearance="light"
                                size="xs"
                                className="shrink-0 capitalize"
                            >
                                {task.priority.label}
                            </Badge>
                        )}
                    </div>
                ))}
                {pendingTasks.length > 3 && (
                    <p className="pt-1 text-center text-xs text-muted-foreground">
                        +{pendingTasks.length - 3} more task{pendingTasks.length - 3 !== 1 ? 's' : ''}
                    </p>
                )}
            </div>
        </div>
    );
});
PendingTasksCard.displayName = 'PendingTasksCard';

const ActivityTimeline = memo(({ activities }: { activities: LeadActivityType[] }) => {
    if (activities.length === 0) {
        return (
            <div className="space-y-3 rounded-lg border bg-card p-4">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Activity size={12} />
                    Recent Activity
                </h3>
                <p className="py-4 text-center text-sm text-muted-foreground">No activities yet</p>
            </div>
        );
    }

    const displayActivities = activities.slice(0, 5);

    return (
        <div className="space-y-3 rounded-lg border bg-card p-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Activity size={12} />
                Recent Activity
            </h3>
            <div className="space-y-0">
                {displayActivities.map((activity, index) => {
                    const IconComponent = ACTIVITY_ICONS[activity.type] || Activity;
                    const dotColor = ACTIVITY_COLORS[activity.type] || 'bg-gray-400';
                    const isLast = index === displayActivities.length - 1;

                    return (
                        <div key={activity.id} className="flex gap-3">
                            {/* Timeline connector */}
                            <div className="flex flex-col items-center">
                                <div className={cn('mt-1.5 size-2 shrink-0 rounded-full', dotColor)} />
                                {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
                            </div>
                            {/* Content */}
                            <div className={cn('min-w-0 flex-1', !isLast && 'pb-3')}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <IconComponent size={13} className="shrink-0 text-muted-foreground" />
                                        <span className="text-sm font-medium capitalize">{activity.type.replace('_', ' ')}</span>
                                        {activity.status && activity.type === 'call' && (
                                            <Badge variant="secondary" appearance="light" size="xs" className="capitalize">
                                                {activity.status.replace('_', ' ')}
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="shrink-0 text-xs text-muted-foreground">{activity.created_at}</span>
                                </div>
                                {activity.subject && (
                                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{activity.subject}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
ActivityTimeline.displayName = 'ActivityTimeline';

// --- Main Component ---

interface LeadQuickViewSheetProps {
    lead: Lead | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function LeadQuickViewSheet({ lead, open, onOpenChange }: LeadQuickViewSheetProps) {
    const statusConfig = lead ? STATUS_CONFIG[lead.inquiry_status] : null;
    const priorityConfig = lead?.priority ? PRIORITY_CONFIG[lead.priority] : null;
    const activities = useMemo(() => lead?.activities?.data || [], [lead?.activities]);
    const tasks = useMemo(() => lead?.tasks?.data || [], [lead?.tasks]);
    const isRequalified = !!lead?.requalified_from_advisor_id;

    const handleViewDetails = () => {
        if (!lead) return;
        onOpenChange(false);
        router.visit(`/leads/${lead.id}`);
    };

    if (!lead) return null;

    const serviceHierarchy = lead.service?.data?.full_hierarchy || lead.service?.data?.name;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-xl">
                {/* Header */}
                <SheetHeader className="shrink-0 space-y-3 border-b p-6 pb-4">
                    <div className="flex items-start gap-3 pr-6">
                        <div className="min-w-0 flex-1">
                            <SheetTitle className="flex items-center gap-2 text-xl">
                                <span className="truncate">{lead.name}</span>
                                {lead.is_hot_lead && <FlameIcon className="shrink-0 text-orange-400" size={20} />}
                            </SheetTitle>
                            {lead.detail && (
                                <p className="mt-1 truncate text-sm text-muted-foreground">{lead.detail}</p>
                            )}
                        </div>
                    </div>

                    {/* Status + Priority + Score */}
                    <div className="flex flex-wrap items-center gap-2">
                        {statusConfig && (
                            <div className="flex items-center gap-1">
                                <Badge variant={statusConfig.variant} appearance={statusConfig.appearance} size="sm">
                                    {lead.inquiry_status === 'requalify' && <RefreshCw className="h-3 w-3" />}
                                    {statusConfig.label}
                                </Badge>
                                {isRequalified && lead.inquiry_status !== 'requalify' && (
                                    <Badge variant="warning" appearance="light" size="sm">
                                        <RefreshCw className="h-3 w-3" />
                                    </Badge>
                                )}
                            </div>
                        )}
                        {priorityConfig && (
                            <Badge variant="secondary" appearance="light" size="sm" className="gap-1.5 capitalize">
                                <span className={cn('size-2 rounded-full', priorityConfig.color)} />
                                {priorityConfig.label}
                            </Badge>
                        )}
                        {lead.lead_score > 0 && (
                            <Badge variant="info" appearance="light" size="sm">
                                Score: {lead.lead_score}
                            </Badge>
                        )}
                    </div>

                    {/* Service hierarchy */}
                    {serviceHierarchy && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Globe size={14} className="mt-0.5 shrink-0" />
                            <span className="leading-snug">{serviceHierarchy}</span>
                        </div>
                    )}
                </SheetHeader>

                {/* Scrollable body */}
                <SheetBody className="flex-1 space-y-4 overflow-y-auto p-6">
                    {/* Contact info */}
                    <ContactCard lead={lead} />

                    {/* Key metrics grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {lead.formatted_budget && (
                            <MetricCard icon={DollarSign} label="Budget" value={lead.formatted_budget} />
                        )}
                        {lead.assigned_to?.data && (
                            <MetricCard icon={User} label="Assigned To" value={lead.assigned_to.data.name} />
                        )}
                        <MetricCard
                            icon={CalendarClock}
                            label="Lead Age"
                            value={formatLeadAge(lead.days_since_created)}
                        />
                        {lead.last_activity_at && (
                            <MetricCard icon={Activity} label="Last Activity" value={lead.last_activity_at} />
                        )}
                        {lead.next_follow_up_at && (
                            <MetricCard
                                icon={CalendarClock}
                                label="Next Follow-up"
                                value={lead.next_follow_up_at}
                                className="col-span-2 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30"
                            />
                        )}
                    </div>

                    {/* Tags */}
                    {lead.tags && lead.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {lead.tags.map((tag) => (
                                <Badge key={tag.value} variant="secondary" appearance="outline" size="xs">
                                    {tag.label}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Call stats */}
                    <CallStatsCard activities={activities} />

                    {/* Pending tasks */}
                    <PendingTasksCard tasks={tasks} />

                    {/* Activity timeline */}
                    <ActivityTimeline activities={activities} />
                </SheetBody>

                {/* Footer */}
                <SheetFooter className="shrink-0 border-t bg-background p-4">
                    <div className="flex w-full items-center gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button variant="default" className="flex-1 gap-2" onClick={handleViewDetails}>
                            <ExternalLink size={14} />
                            View Full Details
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

export default memo(LeadQuickViewSheet);
