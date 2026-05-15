import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Lead, LeadStatus } from '@/types/lead';
import { IconBrandFacebook, IconBrandGoogle, IconBrandLinkedin } from '@tabler/icons-react';
import {
    Activity,
    CalendarClock,
    DollarSign,
    FlameIcon,
    Globe,
    HelpCircle,
    ListTodo,
    Mail,
    Mailbox,
    MapPin,
    Phone,
    PhoneMissed,
    RefreshCw,
    Search,
    ShieldCheck,
    User,
    UserPlus,
} from 'lucide-react';
import React, { memo, useCallback, useMemo } from 'react';
import type { ListChildComponentProps } from 'react-window';
import { cn } from '@/lib/utils';
import { differenceInCalendarDays, isPast, parseISO } from 'date-fns';

type FollowUpState = 'overdue' | 'today' | 'soon' | null;

function getFollowUpState(nextFollowUpAt?: string): FollowUpState {
    if (!nextFollowUpAt) return null;
    const date = parseISO(nextFollowUpAt);
    if (isPast(date) && differenceInCalendarDays(new Date(), date) >= 1) return 'overdue';
    const diff = differenceInCalendarDays(date, new Date());
    if (diff === 0) return 'today';
    if (diff <= 3) return 'soon';
    return null;
}

const FOLLOW_UP_ROW_CLASSES: Record<NonNullable<FollowUpState>, string> = {
    overdue: 'bg-red-50/70 hover:bg-red-100/60 dark:bg-red-950/20 dark:hover:bg-red-950/30',
    today:   'bg-amber-50/70 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/30',
    soon:    'bg-yellow-50/50 hover:bg-yellow-100/40 dark:bg-yellow-950/10 dark:hover:bg-yellow-950/20',
};

const SOURCE_ICONS = {
    'cold-call': Phone,
    'direct-mail': Mailbox,
    'email-campaign': Mail,
    'facebook-ads': IconBrandFacebook,
    'google-ads': IconBrandGoogle,
    linkedin: IconBrandLinkedin,
    'organic-search': Search,
    referral: UserPlus,
    'website-contact-form': Globe,
} as const;

const SOURCE_ICON_COLORS = {
    'cold-call': 'text-blue-500',
    'direct-mail': 'text-green-500',
    'email-campaign': 'text-purple-500',
    'facebook-ads': 'text-blue-600',
    'google-ads': 'text-red-500',
    linkedin: 'text-blue-700',
    'organic-search': 'text-green-600',
    referral: 'text-orange-500',
    'website-contact-form': 'text-cyan-500',
} as const;

const PRIORITY_BAR_CONFIG = {
    low: { bars: 1, color: 'bg-cyan-400', label: 'Low' },
    medium: { bars: 2, color: 'bg-green-500', label: 'Medium' },
    high: { bars: 3, color: 'bg-orange-500', label: 'High' },
    urgent: { bars: 4, color: 'bg-red-500', label: 'Urgent' },
} as const;

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
    closed: { label: 'Closed', variant: 'destructive', appearance: 'light' },
};

function getSourceData(source?: { data?: { slug: string; name: string } } | { slug: string; name: string }) {
    if (!source) return null;
    if ('data' in source) return source.data || null;
    if ('slug' in source) return source;
    return null;
}

const PriorityBars = memo(({ priority }: { priority?: string }) => {
    if (!priority) return <span className="inline-flex h-4 w-[18px]" />;
    const config = PRIORITY_BAR_CONFIG[priority as keyof typeof PRIORITY_BAR_CONFIG];
    if (!config) return <span className="inline-flex h-4 w-[18px]" />;

    return (
        <div className="flex items-end gap-[2px]" style={{ height: '16px' }}>
            {[1, 2, 3, 4].map((bar) => (
                <div
                    key={bar}
                    className={`w-[3px] rounded-sm transition-colors ${
                        bar <= config.bars ? config.color : 'bg-muted-foreground/20'
                    }`}
                    style={{ height: `${bar * 3 + 2}px` }}
                />
            ))}
        </div>
    );
});
PriorityBars.displayName = 'PriorityBars';

const SourceIcon = memo(({ source }: { source?: { data?: { slug: string; name: string } } | { slug: string; name: string } }) => {
    const sourceData = getSourceData(source);
    const IconComponent = sourceData?.slug ? SOURCE_ICONS[sourceData.slug as keyof typeof SOURCE_ICONS] : null;
    const colorClass = sourceData?.slug ? SOURCE_ICON_COLORS[sourceData.slug as keyof typeof SOURCE_ICON_COLORS] : 'text-gray-400';

    if (!IconComponent) {
        return <HelpCircle className="h-4 w-4 text-gray-400" />;
    }

    return <IconComponent className={`h-4 w-4 ${colorClass}`} />;
});
SourceIcon.displayName = 'SourceIcon';

const StatusBadge = memo(({ status, isRequalified }: { status: LeadStatus; isRequalified?: boolean }) => {
    const config = STATUS_CONFIG[status];
    if (!config) return null;

    return (
        <div className="flex items-center gap-1">
            <Badge variant={config.variant} appearance={config.appearance} size="xs">
                {status === 'requalify' && <RefreshCw className="h-2.5 w-2.5" />}
                {config.label}
            </Badge>
            {isRequalified && status !== 'requalify' && (
                <Badge variant="warning" appearance="light" size="xs">
                    <RefreshCw className="h-2.5 w-2.5" />
                </Badge>
            )}
        </div>
    );
});
StatusBadge.displayName = 'StatusBadge';

const LoadingSkeleton = memo(({ style }: { style: React.CSSProperties }) => (
    <div style={style} className="flex items-center gap-2 border-b border-border/30 px-2 py-2">
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-[18px] animate-pulse rounded bg-muted" />
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        <div className="w-[180px] shrink-0 space-y-1">
            <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex flex-1 items-baseline gap-1">
            <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        <div className="h-3 w-14 animate-pulse rounded bg-muted" />
    </div>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

const LeadRow = memo(({ index, style, data }: ListChildComponentProps) => {
    const { leads, selectedLeads, onSelectLead, onLeadClick } = data;
    const lead = leads[index] as Lead | undefined;

    const isSelected = useMemo(() => (lead ? selectedLeads.has(lead.id) : false), [selectedLeads, lead]);

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            if (!lead) return;
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('input')) return;
            if (onLeadClick) {
                onLeadClick(lead.id);
            } else {
                onSelectLead(lead.id);
            }
        },
        [onSelectLead, onLeadClick, lead],
    );

    const handleCheckboxChange = useCallback(
        (_checked: boolean | 'indeterminate') => {
            if (lead) onSelectLead(lead.id);
        },
        [onSelectLead, lead],
    );

    const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    if (!lead) {
        return <LoadingSkeleton style={style} />;
    }

    const serviceName = lead.service?.data?.name;
    const serviceHierarchy = lead.service?.data?.full_hierarchy || serviceName;
    const country = lead.country;
    const isRequalified = !!lead.requalified_from_advisor_id;
    const sourceData = getSourceData(lead.source);
    const activities = lead.activities?.data || [];
    const activityCount = activities.length;
    const callActivities = activities.filter((a) => a.type === 'call');
    const totalCalls = callActivities.length;
    const missedCalls = callActivities.filter((a) => a.status === 'no_answer' || a.status === 'busy').length;
    const pendingTasks = lead.tasks?.data?.filter((t) => t.status?.value === 'pending' || t.status?.value === 'in_progress') || [];
    const pendingTaskCount = pendingTasks.length;
    const hasDueTask = pendingTasks.some((t) => !!t.due_at);
    const hasOverdueTask = pendingTasks.some((t) => t.is_overdue);
    const hasFollowUp = !!lead.next_follow_up_at;
    const assignedUser = lead.assigned_to?.data;
    const qualifiedByUser = lead.qualified_by?.data;
    const qualifiedAt = lead.qualified_at;
    const isNew = lead.inquiry_status === 'new';
    const followUpState = getFollowUpState(lead.next_follow_up_at);

    return (
        <div
            style={style}
            className={cn(
                'group flex cursor-pointer items-center gap-2 border-b border-border/30 px-2 py-2 text-left transition-colors hover:shadow-[inset_2px_0_0_0] hover:shadow-border/80',
                isSelected
                    ? 'bg-[#c2dbff] dark:bg-[#003569]'
                    : followUpState
                      ? FOLLOW_UP_ROW_CLASSES[followUpState]
                      : isNew
                        ? 'bg-background hover:bg-muted/30'
                        : 'bg-muted/10 hover:bg-muted/30',
            )}
            onClick={handleClick}
            role="row"
            aria-selected={isSelected}
            tabIndex={0}
        >
            {/* Checkbox */}
            <div className="flex shrink-0 items-center px-1" onClick={handleCheckboxClick}>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={handleCheckboxChange}
                    aria-label={`Select ${lead.name}`}
                    className="size-4"
                />
            </div>

            {/* Priority bars */}
            <div className="shrink-0 px-0.5">
                {lead.priority ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex">
                                <PriorityBars priority={lead.priority} />
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="capitalize">
                            {lead.priority} priority
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <PriorityBars />
                )}
            </div>

            {/* Source icon — md+ */}
            <div className="hidden shrink-0 px-0.5 md:flex">
                {sourceData?.name ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex">
                                <SourceIcon source={lead.source} />
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">{sourceData.name}</TooltipContent>
                    </Tooltip>
                ) : (
                    <SourceIcon source={lead.source} />
                )}
            </div>

            {/* Name column — fixed width like mail sender */}
            <span
                className={cn(
                    'w-[160px] shrink-0 truncate px-1 text-sm md:w-[180px] lg:w-[200px]',
                    isNew ? 'font-semibold text-foreground' : 'text-foreground/80',
                )}
            >
                <span className="flex items-center gap-1">
                    <span className="truncate">{lead.name}</span>
                    {lead.is_hot_lead && <FlameIcon className="shrink-0 text-orange-400" size={15} />}
                </span>
            </span>

            {/* Subject + preview area — flex-1, like mail body */}
            <div className="flex min-w-0 flex-1 items-baseline gap-1 truncate px-1">
                {/* Service as "subject" */}
                {serviceName ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span
                                className={cn(
                                    'shrink-0 truncate text-sm',
                                    isNew ? 'font-semibold text-foreground' : 'text-foreground/80',
                                )}
                            >
                                {serviceName}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">{serviceHierarchy}</TooltipContent>
                    </Tooltip>
                ) : null}

                {/* Detail + budget as "preview" */}
                {(lead.detail || lead.formatted_budget) && (
                    <>
                        {serviceName && <span className="shrink-0 text-sm text-muted-foreground/50">—</span>}
                        <span className="min-w-0 truncate text-sm text-muted-foreground/60">
                            {lead.detail}
                            {lead.detail && lead.formatted_budget && ' · '}
                            {lead.formatted_budget && (
                                <span className="inline-flex items-center gap-0.5">
                                    <DollarSign size={13} className="inline" />
                                    {lead.formatted_budget}
                                </span>
                            )}
                        </span>
                    </>
                )}

                {/* Inline badges — follow-up / tasks */}
                <span className="hidden shrink-0 items-center gap-1 sm:inline-flex">
                    {hasFollowUp && (
                        <Badge variant="warning" appearance="light" size="xs">
                            <CalendarClock className="h-3 w-3" />
                            Follow-up
                        </Badge>
                    )}
                    {hasDueTask && !hasFollowUp && (
                        <Badge variant={hasOverdueTask ? 'destructive' : 'info'} appearance="light" size="xs">
                            <ListTodo className="h-3 w-3" />
                            {hasOverdueTask ? 'Overdue' : 'Due Task'}
                        </Badge>
                    )}
                </span>
            </div>

            {/* Call + activity + task indicators — xl */}
            <div className="hidden shrink-0 items-center gap-2 xl:flex" style={{ minWidth: '80px' }}>
                {totalCalls > 0 ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                                <Phone size={14} />
                                {totalCalls}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {totalCalls} {totalCalls === 1 ? 'call' : 'calls'}
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground/30">
                        <Phone size={14} />0
                    </span>
                )}
                {missedCalls > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
                                <PhoneMissed size={14} />
                                {missedCalls}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {missedCalls} missed {missedCalls === 1 ? 'call' : 'calls'}
                        </TooltipContent>
                    </Tooltip>
                )}
                {activityCount > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                                <Activity size={14} />
                                {activityCount}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
                        </TooltipContent>
                    </Tooltip>
                )}
                {pendingTaskCount > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-0.5 text-xs text-orange-500">
                                <ListTodo size={14} />
                                {pendingTaskCount}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px]">
                            <div className="space-y-1">
                                {pendingTasks.slice(0, 3).map((t) => (
                                    <div key={t.id} className="flex items-center gap-1.5 text-xs">
                                        <span className={`size-1.5 shrink-0 rounded-full ${t.status?.value === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                                        <span className="truncate">{t.title}</span>
                                        <span className="shrink-0 opacity-70">{t.status?.label}</span>
                                    </div>
                                ))}
                                {pendingTaskCount > 3 && (
                                    <div className="text-xs opacity-70">+{pendingTaskCount - 3} more</div>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>

            {/* Assigned user — xl */}
            {assignedUser && (
                <div className="hidden shrink-0 xl:flex" style={{ minWidth: '80px' }}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <User size={14} />
                                <span className="max-w-[60px] truncate">{assignedUser.name.split(' ')[0]}</span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">{assignedUser.name}</TooltipContent>
                    </Tooltip>
                </div>
            )}

            {/* Qualified by — xl */}
            {qualifiedByUser && (
                <div className="hidden shrink-0 xl:flex" style={{ minWidth: '90px' }}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                <span className="max-w-[70px] truncate">{qualifiedByUser.name.split(' ')[0]}</span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <div>Qualified by {qualifiedByUser.name}</div>
                            {qualifiedAt && (
                                <div className="text-xs opacity-75">{new Date(qualifiedAt).toLocaleDateString()}</div>
                            )}
                        </TooltipContent>
                    </Tooltip>
                </div>
            )}

            {/* Status badge */}
            <div className="shrink-0">
                <StatusBadge status={lead.inquiry_status} isRequalified={isRequalified} />
            </div>

            {/* Country — lg */}
            {country && (
                <div className="hidden shrink-0 items-center gap-1 lg:flex">
                    <MapPin size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{country}</span>
                </div>
            )}

            {/* Date — tabular, right-aligned like mail */}
            <span
                className={cn(
                    'hidden shrink-0 px-2 text-xs tabular-nums lg:block',
                    isNew ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
                style={{ minWidth: '70px', textAlign: 'right' }}
            >
                {lead.created_at}
            </span>
        </div>
    );
});

LeadRow.displayName = 'OptimizedLeadRow';

export default LeadRow;
