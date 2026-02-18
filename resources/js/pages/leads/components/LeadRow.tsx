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
    User,
    UserPlus,
} from 'lucide-react';
import React, { memo, useCallback, useMemo } from 'react';
import type { ListChildComponentProps } from 'react-window';

// Source icon mapping
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

// Priority bars configuration: 1 bar = low, 2 = medium, 3 = high, 4 = urgent
const PRIORITY_BAR_CONFIG = {
    low: { bars: 1, color: 'bg-cyan-400', label: 'Low' },
    medium: { bars: 2, color: 'bg-green-500', label: 'Medium' },
    high: { bars: 3, color: 'bg-orange-500', label: 'High' },
    urgent: { bars: 4, color: 'bg-red-500', label: 'Urgent' },
} as const;

// Status badge configuration
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

// Helper to extract source data
function getSourceData(source?: { data?: { slug: string; name: string } } | { slug: string; name: string }) {
    if (!source) return null;
    if ('data' in source) return source.data || null;
    if ('slug' in source) return source;
    return null;
}

// Priority bars component (1-4 bars)
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

// Source icon component
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

// Status badge component
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

// Loading skeleton
const LoadingSkeleton = memo(({ style }: { style: React.CSSProperties }) => (
    <div
        style={style}
        className="flex items-center gap-2 border-b px-3 py-1.5"
    >
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-[18px] animate-pulse rounded bg-muted" />
        <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        <div className="hidden h-4 w-20 animate-pulse rounded bg-muted lg:block" />
    </div>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

// Main lead row component
const LeadRow = memo(({ index, style, data }: ListChildComponentProps) => {
    const { leads, selectedLeads, onSelectLead, onLeadClick } = data;
    const lead = leads[index] as Lead | undefined;

    const isSelected = useMemo(() => (lead ? selectedLeads.has(lead.id) : false), [selectedLeads, lead?.id]);

    const rowClasses = useMemo(() => {
        let classes =
            'flex items-center gap-2 border-b px-3 py-1.5 cursor-pointer transition-colors duration-75 hover:bg-muted/50';
        if (isSelected) classes += ' bg-[#c2dbff] dark:bg-[#003569]';
        return classes;
    }, [isSelected]);

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

    return (
        <div
            style={style}
            className={rowClasses}
            onClick={handleClick}
            role="row"
            aria-selected={isSelected}
            tabIndex={0}
        >
            {/* Checkbox */}
            <div className="shrink-0">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={handleCheckboxChange}
                    onClick={handleCheckboxClick}
                    aria-label={`Select ${lead.name}`}
                />
            </div>

            {/* Priority Bars */}
            <div className="shrink-0">
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

            {/* Source Icon - desktop only */}
            <div className="hidden shrink-0 md:flex">
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

            {/* Name + Detail column — constrained width on desktop */}
            <div className="min-w-0 flex-1 md:max-w-[220px] lg:max-w-[260px] xl:max-w-[280px]">
                <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{lead.name}</span>
                    {lead.is_hot_lead && <FlameIcon className="shrink-0 text-orange-400" size={14} />}
                    {hasFollowUp && (
                        <Badge variant="warning" appearance="light" size="xs" className="shrink-0">
                            <CalendarClock className="h-2.5 w-2.5" />
                            Follow-up
                        </Badge>
                    )}
                    {hasDueTask && !hasFollowUp && (
                        <Badge variant={hasOverdueTask ? 'destructive' : 'info'} appearance="light" size="xs" className="shrink-0">
                            <ListTodo className="h-2.5 w-2.5" />
                            {hasOverdueTask ? 'Overdue' : 'Due Task'}
                        </Badge>
                    )}
                </div>
                {/* Second line: detail (+ service on mobile) */}
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {lead.detail && (
                        <span className="truncate">{lead.detail}</span>
                    )}
                    {serviceName && (
                        <span className="flex shrink-0 items-center gap-1 md:hidden">
                            {lead.detail && <span className="text-muted-foreground/50">·</span>}
                            <span className="truncate font-medium">{serviceName}</span>
                            {lead.formatted_budget && (
                                <>
                                    <span className="text-muted-foreground/50">·</span>
                                    <span>{lead.formatted_budget}</span>
                                </>
                            )}
                        </span>
                    )}
                </div>
            </div>

            {/* Desktop: Service + Budget column — takes remaining space */}
            <div className="hidden min-w-0 flex-1 md:block">
                {serviceName ? (
                    <div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="truncate text-sm text-muted-foreground">
                                    {serviceHierarchy}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {serviceHierarchy}
                            </TooltipContent>
                        </Tooltip>
                        {lead.formatted_budget && (
                            <div className="mt-0.5 flex items-center gap-0.5 text-xs text-muted-foreground/70">
                                <DollarSign size={10} />
                                <span>{lead.formatted_budget}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground/50">--</span>
                )}
            </div>

            {/* Call stats — xl only */}
            <div className="hidden shrink-0 items-center gap-2.5 xl:flex" style={{ minWidth: '80px' }}>
                {totalCalls > 0 ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                                <Phone size={12} />
                                {totalCalls}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {totalCalls} {totalCalls === 1 ? 'call' : 'calls'}
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground/40">
                        <Phone size={12} />
                        0
                    </span>
                )}
                {missedCalls > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
                                <PhoneMissed size={12} />
                                {missedCalls}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {missedCalls} missed {missedCalls === 1 ? 'call' : 'calls'}
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>

            {/* Metadata indicators - desktop only */}
            <div className="hidden shrink-0 items-center gap-1.5 md:flex">
                {/* Activity count */}
                {activityCount > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                                <Activity size={12} />
                                {activityCount}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
                            {lead.last_activity_at && <div className="text-xs opacity-75">{lead.last_activity_at}</div>}
                        </TooltipContent>
                    </Tooltip>
                )}
                {/* Pending tasks */}
                {pendingTaskCount > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-0.5 text-xs text-orange-500">
                                <ListTodo size={12} />
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

            {/* Assigned user — xl only */}
            {assignedUser && (
                <div className="hidden shrink-0 xl:flex" style={{ minWidth: '90px' }}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <User size={12} />
                                <span className="max-w-[70px] truncate">{assignedUser.name.split(' ')[0]}</span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">{assignedUser.name}</TooltipContent>
                    </Tooltip>
                </div>
            )}

            {/* Status badge - always visible */}
            <div className="shrink-0">
                <StatusBadge
                    status={lead.inquiry_status}
                    isRequalified={isRequalified}
                />
            </div>

            {/* Country - desktop only */}
            {country && (
                <div className="hidden shrink-0 items-center gap-1 lg:flex">
                    <MapPin size={12} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{country}</span>
                </div>
            )}

            {/* Created date - desktop only */}
            <div className="hidden shrink-0 text-right text-xs text-muted-foreground lg:block" style={{ minWidth: '70px' }}>
                {lead.created_at}
            </div>
        </div>
    );
});

LeadRow.displayName = 'OptimizedLeadRow';

export default LeadRow;