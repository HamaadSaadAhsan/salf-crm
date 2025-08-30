import React, { useMemo, useCallback, memo } from "react"
import type { ListChildComponentProps } from "react-window"
import {
  Star,
  Paperclip,
  Archive,
  Trash2,
  Clock,
  MoreHorizontal,
  Phone,
  Mail,
  Globe,
  HelpCircle,
  Mailbox,
  Search,
  UserPlus,
  FlameIcon,
  ChevronUpCircleIcon,
  MessageSquare,
  ChevronRightCircleIcon,
  ChevronDownCircleIcon,
  CircleArrowOutUpRightIcon,
} from "lucide-react"
import type { Lead } from "@/types/lead"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { IconBrandFacebook, IconBrandGoogle, IconBrandLinkedin } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { LeadTag } from '@/components/tag-selector'

// Icon mapping for better performance - computed once
const SOURCE_ICONS = {
  "cold-call": Phone,
  "direct-mail": Mailbox,
  "email-campaign": Mail,
  "facebook-ads": IconBrandFacebook,
  "google-ads": IconBrandGoogle,
  "linkedin": IconBrandLinkedin,
  "organic-search": Search,
  "referral": UserPlus,
  "website-contact-form": Globe,
} as const;

const SOURCE_ICON_COLORS = {
  "cold-call": "text-blue-500",
  "direct-mail": "text-green-500",
  "email-campaign": "text-purple-500",
  "facebook-ads": "text-blue-600",
  "google-ads": "text-red-500",
  "linkedin": "text-blue-700",
  "organic-search": "text-green-600",
  "referral": "text-orange-500",
  "website-contact-form": "text-cyan-500",
} as const;

const PRIORITY_ICONS = {
  urgent: CircleArrowOutUpRightIcon,
  high: ChevronUpCircleIcon,
  medium: ChevronRightCircleIcon,
  low: ChevronDownCircleIcon,
} as const;

const PRIORITY_COLORS = {
  urgent: "text-red-500",
  high: "text-orange-500",
  medium: "text-green-500",
  low: "text-cyan-400",
} as const;

// Memoized source icon component
const SourceIcon = memo(({ source }: { source?: { data?: { slug: string; name: string } } | { slug: string; name: string } }) => {
  // Helper function to get source data regardless of format
  const getSourceData = () => {
    if (!source) return null;

    // Handle { data?: LeadSource } format
    if ('data' in source) {
      return source.data || null;
    }

    // Handle direct LeadSource format
    if ('slug' in source) {
      return source;
    }

    return null;
  };

  const sourceData = getSourceData();
  const IconComponent = sourceData?.slug ? SOURCE_ICONS[sourceData.slug as keyof typeof SOURCE_ICONS] : null;
  const colorClass = sourceData?.slug ? SOURCE_ICON_COLORS[sourceData.slug as keyof typeof SOURCE_ICON_COLORS] : 'text-gray-400';

  if (!IconComponent) {
    return <HelpCircle className="h-4 w-4 text-gray-400" />;
  }

  return <IconComponent className={`h-4 w-4 ${colorClass}`} />;
});
SourceIcon.displayName = "SourceIcon";

// Memoized priority icon component
const PriorityIcon = memo(({ priority }: { priority?: string }) => {
  if (!priority) return null;

  const IconComponent = PRIORITY_ICONS[priority as keyof typeof PRIORITY_ICONS];
  const colorClass = PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS];

  if (!IconComponent) return null;

  return (
    <div className="flex items-center-safe gap-1">
      <IconComponent
        size={16}
        className={colorClass}
      />
    </div>
  );
});
PriorityIcon.displayName = "PriorityIcon";

// Memoized star button component
const StarButton = memo(({
                           isHotLead,
                           onToggleStar
                         }: {
  isHotLead: boolean;
  onToggleStar: (e: React.MouseEvent) => void;
}) => {
  const starClass = useMemo(() =>
      `h-4 w-4 transition-colors duration-75 ${
        isHotLead
          ? "fill-yellow-400 text-yellow-400"
          : "text-gray-300 hover:text-yellow-400"
      }`,
    [isHotLead]
  );

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggleStar}
      className="rounded-full transition-colors duration-75 cursor-pointer"
      aria-label={isHotLead ? "Remove from hot leads" : "Add to hot leads"}
    >
      <Star className={starClass} />
    </Button>
  );
});
StarButton.displayName = "StarButton";

// Memoized labels component
const LeadLabels = memo(({
                           hasAttachment,
                           labels
                         }: {
  hasAttachment: boolean | undefined;
  labels?: LeadTag[];
}) => {

  if (!hasAttachment && (!labels || labels.length === 0)) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {hasAttachment && <Paperclip className="h-4 w-4" />}
      {labels && labels.map((tag, idx) => (
        <Badge key={idx} variant="outline" className="border-dashed">
          {tag.label}
        </Badge>
      ))}
    </div>
  );
});
LeadLabels.displayName = "LeadLabels";

// Memoized hover actions component
const HoverActions = memo(() => {
  const actions = useMemo(() => [
    { Icon: Archive, label: "Archive" },
    { Icon: Trash2, label: "Delete" },
    { Icon: Clock, label: "Snooze" },
    { Icon: MoreHorizontal, label: "More options" },
  ], []);

  return (
    <div className="absolute bg-inherit right-0 top-1/2 -translate-y-1/2 flex rounded z-10 dark:bg-gray-900">
      {actions.map(({ Icon, label }, index) => (
        <Button
          key={index}
          variant="ghost"
          size="icon"
          aria-label={label}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
});
HoverActions.displayName = "HoverActions";

// Loading skeleton component
const LoadingSkeleton = memo(({ style }: { style: React.CSSProperties }) => (
  <div style={style} className="grid items-center px-4 py-3 border-b grid-cols-[28px_28px_28px_1fr_1fr] md:grid-cols-[28px_28px_28px_28px_160px_1fr_auto_auto_60px_auto_auto]">
    <div className="animate-pulse space-y-1">
      {/* Checkbox */}
      <div className="w-4 h-4 bg-primary-foreground rounded"></div>
    </div>
    <div className="animate-pulse space-y-1">
      {/* Star */}
      <div className="w-4 h-4 bg-primary-foreground rounded"></div>
    </div>
    <div className="animate-pulse space-y-1">
      {/* Priority */}
      <div className="w-4 h-4 bg-primary-foreground rounded"></div>
    </div>
    {/* Source - hidden on mobile */}
    <div className="hidden md:block animate-pulse space-y-1">
      <div className="w-4 h-4 bg-primary-foreground rounded"></div>
    </div>
    <div className="animate-pulse space-y-1">
      {/* Name */}
      <div className="w-20 md:w-32 h-4 bg-primary-foreground rounded"></div>
    </div>
    <div className="animate-pulse space-y-1">
      {/* Details */}
      <div className="w-16 md:w-full h-4 bg-primary-foreground rounded"></div>
    </div>
    {/* Service - hidden on mobile */}
    <div className="hidden md:block animate-pulse space-y-1">
      <div className="w-16 h-4 bg-primary-foreground rounded"></div>
    </div>
    {/* Labels - hidden on mobile */}
    <div className="hidden md:block animate-pulse space-y-1">
      <div className="w-12 h-4 bg-primary-foreground rounded"></div>
    </div>
    {/* Message count - hidden on mobile */}
    <div className="hidden md:block animate-pulse space-y-1">
      <div className="w-8 h-4 bg-primary-foreground rounded"></div>
    </div>
    {/* Time - hidden on mobile */}
    <div className="hidden md:block animate-pulse space-y-1">
      <div className="w-16 h-4 bg-primary-foreground rounded"></div>
    </div>
  </div>
));
LoadingSkeleton.displayName = "LoadingSkeleton";

// Main lead row component - heavily optimized
const LeadRow = memo(({ index, style, data }: ListChildComponentProps) => {
  const {
    leads,
    selectedLeads,
    hoveredLead,
    onSelectLead,
    onHoverLead,
    onToggleStar,
    onLeadClick
  } = data;

  // Get the lead (might be undefined)
  const lead = leads[index] as Lead | undefined;

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Memoized computed values (with fallbacks for undefined lead)
  const isSelected = useMemo(() => lead ? selectedLeads.has(lead.id) : false, [selectedLeads, lead?.id]);
  const isHovered = useMemo(() => lead ? hoveredLead === lead.id : false, [hoveredLead, lead?.id]);
  const isUnread = useMemo(() => lead ? lead.last_activity_at === null : false, [lead?.last_activity_at]);

  // Memoized row classes for performance with responsive grid
  const rowClasses = useMemo(() => {
    const baseClasses = "grid items-center px-4 py-1 border-b cursor-pointer duration-75 transition-all hover:shadow-md relative " +
      // Mobile/tablet: checkbox, star, priority, name, description
      "grid-cols-[28px_28px_28px_1fr_1fr] md:grid-cols-[28px_28px_28px_28px_160px_1fr_auto_auto_60px_auto_auto]";

    let classes = baseClasses;
    if (isUnread) classes += " font-semibold";
    if (isSelected) classes += " bg-[#c2dbff] dark:bg-[#003569] border-none";
    else if (isHovered) classes += " bg-gray-50 dark:bg-black/80 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.06)]";

    return classes;
  }, [isSelected, isHovered, isUnread]);

  // Optimized event handlers (with null checks)
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!lead) return;

    // Prevent event if clicking on interactive elements
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) {
      return;
    }

    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) {
      return;
    }

    if (onLeadClick) {
      onLeadClick(lead.id);
    } else {
      onSelectLead(lead.id);
    }
  }, [onSelectLead, onLeadClick, lead]);

  const handleMouseEnter = useCallback(() => {
    if (lead) {
      onHoverLead(lead.id);
    }
  }, [onHoverLead, lead]);

  const handleMouseLeave = useCallback(() => {
    onHoverLead(null);
  }, [onHoverLead]);

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    if (!lead) return;

    e.stopPropagation();
    e.preventDefault();
    onToggleStar(lead.id);
  }, [onToggleStar, lead]);

  // Handle checkbox change - use the correct event type and prop
  const handleCheckboxChange = useCallback((checked: boolean | "indeterminate") => {
    if (lead) {
      onSelectLead(lead.id);
    }
  }, [onSelectLead, lead]);

  // Handle checkbox click to prevent row click
  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // NOW we can do conditional returns after all hooks are called
  if (!lead) {
    return <LoadingSkeleton style={style} />;
  }

  return (
    <div
      style={style}
      className={rowClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="row"
      aria-selected={isSelected}
      tabIndex={0}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center" role="gridcell">
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          onClick={handleCheckboxClick}
          aria-label={`Select lead ${lead.name}`}
        />
      </div>

      {/* Priority */}
      <div className="flex items-center justify-center" role="gridcell">
        <PriorityIcon priority={lead.priority} />
      </div>

      {/* Star */}
      <div className="flex items-center justify-center" role="gridcell">
        <StarButton
          isHotLead={lead.is_hot_lead}
          onToggleStar={handleStarClick}
        />
      </div>

      {/* Source Icon - Hidden on mobile/tablet */}
      <div
        className="hidden md:flex items-center justify-center"
        role="gridcell"
        title={(() => {
          if (!lead.source) return undefined;

          // Handle { data?: LeadSource } format
          if ('data' in lead.source) {
            return lead.source.data?.name;
          }

          // Handle direct LeadSource format
          if ('name' in lead.source) {
            return lead.source.name;
          }

          return undefined;
        })()}
      >
        <SourceIcon source={lead.source} />
      </div>

      {/* Name */}
      <div className="overflow-hidden text-ellipsis whitespace-nowrap pr-2 md:pr-4 text-sm flex items-center gap-1" role="gridcell">
        <span className="truncate">{lead.name}</span>
        {lead.is_hot_lead && <FlameIcon className="text-orange-400 flex-shrink-0" size={16} />}
      </div>

      {/* Details */}
      <div className="flex min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm" role="gridcell">
        <span className="font-medium truncate text-gray-600 dark:text-gray-300">{lead.detail}</span>
      </div>

      {/* Service - Hidden on mobile/tablet */}
      <div className="hidden md:flex items-center-safe justify-start text-left min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm px-2" role="gridcell">
        <span className="text-gray-600 dark:text-gray-400" title={lead.service?.data?.full_hierarchy || lead.service?.data?.name}>
          {lead.service?.data?.full_hierarchy || lead.service?.data?.name || '-'}
        </span>
      </div>

      {/* Labels and Attachments - Hidden on mobile/tablet */}
      <div className="hidden md:flex items-center gap-2 px-4" role="gridcell">
        <LeadLabels
          hasAttachment={lead.has_attachment}
          labels={lead.tags}
        />
      </div>

      {/* Message Count - Hidden on mobile/tablet */}
      <div className="hidden md:flex items-center justify-center gap-1" role="gridcell">
        <MessageSquare className="text-gray-500" size={14} />
        <span className="text-xs text-gray-500">12</span>
      </div>

      {/* Time - Hidden on mobile/tablet */}
      <div className="hidden md:block text-right text-xs text-gray-500" role="gridcell">
        {lead.created_at}
      </div>

      {/* Hover Actions - Hidden on mobile for a better touch experience */}
      {isHovered && (
        <div className="hidden md:block">
          <HoverActions />
        </div>
      )}
    </div>
  );
});

LeadRow.displayName = "OptimizedLeadRow";

export default LeadRow;
