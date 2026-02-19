import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LeadFilters } from '@/hooks/useLeadFilters';
import { useUsers } from '@/hooks/useUsers';
import { useServices } from '@/lib/useServices';
import { useSources } from '@/lib/useSources';
import { useStatuses } from '@/lib/useStatus';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import type { LeadPriority } from '@/types/lead';
import { usePage } from '@inertiajs/react';
import {
    endOfMonth,
    endOfWeek,
    endOfYear,
    format,
    startOfMonth,
    startOfWeek,
    startOfYear,
    subDays,
    subMonths,
} from 'date-fns';
import { CommandList } from 'cmdk';
import { CalendarIcon, CalendarRange, Check, ChevronDown, ChevronRight, ChevronsUpDown, ListFilter, Layers, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

interface LeadFilterBarProps {
    filters: LeadFilters;
    activeFilterCount: number;
    onSetFilter: <K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) => void;
    onClearFilter: (key: keyof LeadFilters) => void;
    onClearAll: () => void;
}

const PRIORITIES: { value: LeadPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'text-gray-500' },
    { value: 'medium', label: 'Medium', color: 'text-blue-500' },
    { value: 'high', label: 'High', color: 'text-orange-500' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-500' },
];

/** Responsive wrapper: Popover on desktop, bottom Drawer on mobile */
const FilterShell = memo(function FilterShell({
    open,
    onOpenChange,
    trigger,
    title,
    popoverClassName,
    popoverAlign = 'start',
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trigger: React.ReactElement;
    title: string;
    popoverClassName?: string;
    popoverAlign?: 'start' | 'center' | 'end';
    children: React.ReactNode;
}) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerTrigger asChild>{trigger}</DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader className="pb-2">
                        <DrawerTitle>{title}</DrawerTitle>
                    </DrawerHeader>
                    <div className="max-h-[60vh] overflow-y-auto px-4 pb-4">
                        {children}
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent className={popoverClassName} align={popoverAlign}>
                {children}
            </PopoverContent>
        </Popover>
    );
});

const StatusFilter = memo(function StatusFilter({
    value,
    onChange,
}: {
    value: string[] | undefined;
    onChange: (value: string[] | undefined) => void;
}) {
    const [open, setOpen] = useState(false);
    const { statuses: allStatuses } = useStatuses();
    const statuses = useMemo(() => allStatuses.filter((s) => !['assigned_to_advisor', 'assigned_to_cro'].includes(s.name)), [allStatuses]);
    const selected = useMemo(() => value || [], [value]);

    const toggle = useCallback(
        (statusName: string) => {
            const next = selected.includes(statusName) ? selected.filter((s) => s !== statusName) : [...selected, statusName];
            onChange(next.length > 0 ? next : undefined);
        },
        [selected, onChange],
    );

    return (
        <FilterShell
            open={open}
            onOpenChange={setOpen}
            title="Status"
            popoverClassName="w-[200px] p-0"
            trigger={
                <Button variant="outline" size="sm" className="h-8 gap-1 border-dashed">
                    Status
                    {selected.length > 0 && (
                        <Badge variant="secondary" size="xs" className="ml-1 rounded-sm">
                            {selected.length}
                        </Badge>
                    )}
                    <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                </Button>
            }
        >
            <Command>
                <CommandInput placeholder="Search statuses..." className="h-9" />
                <CommandList className="max-h-[200px] overflow-y-auto">
                    <CommandEmpty>No status found.</CommandEmpty>
                    <CommandGroup>
                        {statuses.map((status) => (
                            <CommandItem key={status.id} value={status.name} onSelect={() => toggle(status.name)} className="cursor-pointer">
                                <Check className={cn('mr-2 h-4 w-4', selected.includes(status.name) ? 'opacity-100' : 'opacity-0')} />
                                <span className="capitalize">{status.name.replace(/_/g, ' ')}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </FilterShell>
    );
});

const PriorityFilter = memo(function PriorityFilter({
    value,
    onChange,
}: {
    value: string[] | undefined;
    onChange: (value: string[] | undefined) => void;
}) {
    const [open, setOpen] = useState(false);
    const selected = useMemo(() => value || [], [value]);

    const toggle = useCallback(
        (priority: string) => {
            const next = selected.includes(priority) ? selected.filter((p) => p !== priority) : [...selected, priority];
            onChange(next.length > 0 ? next : undefined);
        },
        [selected, onChange],
    );

    return (
        <FilterShell
            open={open}
            onOpenChange={setOpen}
            title="Priority"
            popoverClassName="w-[180px] p-0"
            trigger={
                <Button variant="outline" size="sm" className="h-8 gap-1 border-dashed">
                    Priority
                    {selected.length > 0 && (
                        <Badge variant="secondary" size="xs" className="ml-1 rounded-sm">
                            {selected.length}
                        </Badge>
                    )}
                    <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                </Button>
            }
        >
            <Command>
                <CommandList>
                    <CommandGroup>
                        {PRIORITIES.map((p) => (
                            <CommandItem
                                key={p.value}
                                value={p.value}
                                onSelect={() => toggle(p.value)}
                                className="cursor-pointer"
                            >
                                <Check className={cn('mr-2 h-4 w-4', selected.includes(p.value) ? 'opacity-100' : 'opacity-0')} />
                                <span className={p.color}>{p.label}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </FilterShell>
    );
});

const AssignedToFilter = memo(function AssignedToFilter({
    value,
    selectedName,
    onChange,
    roleFilter,
}: {
    value: number | undefined;
    selectedName: string | undefined;
    onChange: (value: number | undefined, name: string | undefined) => void;
    roleFilter?: string;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const { data } = useUsers({ per_page: 50, search: search || undefined, role: roleFilter ? [roleFilter] : undefined });
    const users = data?.data || [];
    return (
        <FilterShell
            open={open}
            onOpenChange={setOpen}
            title="Assigned To"
            popoverClassName="w-[220px] p-0"
            trigger={
                <Button variant="outline" size="sm" className="h-8 gap-1 border-dashed">
                    Assigned To
                    {value && selectedName && (
                        <Badge variant="secondary" size="xs" className="ml-1 rounded-sm">
                            {selectedName}
                        </Badge>
                    )}
                    <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                </Button>
            }
        >
            <Command shouldFilter={false}>
                <CommandInput placeholder="Search users..." className="h-9" value={search} onValueChange={setSearch} />
                <CommandList className="max-h-[200px] overflow-y-auto">
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                        {users.map((user: { id: number; name: string }) => (
                            <CommandItem
                                key={user.id}
                                value={String(user.id)}
                                onSelect={() => {
                                    if (value === user.id) {
                                        onChange(undefined, undefined);
                                    } else {
                                        onChange(user.id, user.name);
                                    }
                                    setOpen(false);
                                }}
                                className="cursor-pointer"
                            >
                                <Check className={cn('mr-2 h-4 w-4', value === user.id ? 'opacity-100' : 'opacity-0')} />
                                {user.name}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </FilterShell>
    );
});

interface ServiceItem {
    id: number;
    name: string;
    parent_id: number | null;
    country_code?: string;
    country_name?: string;
}

const ServiceFilter = memo(function ServiceFilter({
    value,
    onChange,
}: {
    value: number[] | undefined;
    onChange: (value: number[] | undefined) => void;
}) {
    const [open, setOpen] = useState(false);
    const { services } = useServices();
    const selected = useMemo(() => (value || []).map(Number), [value]);
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

    const grouped = useMemo(() => {
        const parents = (services as ServiceItem[]).filter((s) => !s.parent_id);
        const childrenMap = new Map<number, ServiceItem[]>();
        for (const s of services as ServiceItem[]) {
            if (s.parent_id) {
                const list = childrenMap.get(s.parent_id) || [];
                list.push(s);
                childrenMap.set(s.parent_id, list);
            }
        }
        return { parents, childrenMap };
    }, [services]);

    // Auto-expand groups that have selected children
    useEffect(() => {
        setExpandedGroups((prev) => {
            const autoExpand = new Set(prev);
            for (const [parentId, children] of grouped.childrenMap) {
                if (children.some((c) => selected.includes(c.id))) {
                    autoExpand.add(parentId);
                }
            }
            return autoExpand.size !== prev.size ? autoExpand : prev;
        });
    }, [selected, grouped.childrenMap]);

    const toggleGroup = useCallback((parentId: number) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(parentId)) {
                next.delete(parentId);
            } else {
                next.add(parentId);
            }
            return next;
        });
    }, []);

    const toggle = useCallback(
        (serviceId: number) => {
            const next = selected.includes(serviceId) ? selected.filter((id) => id !== serviceId) : [...selected, serviceId];
            onChange(next.length > 0 ? next : undefined);
        },
        [selected, onChange],
    );

    // Toggle all children of a parent
    const toggleParentChildren = useCallback(
        (parentId: number) => {
            const children = grouped.childrenMap.get(parentId) || [];
            const childIds = children.map((c) => c.id);
            const allChildrenSelected = childIds.length > 0 && childIds.every((id) => selected.includes(id));

            let next: number[];
            if (allChildrenSelected) {
                // Deselect parent + all children
                next = selected.filter((id) => id !== parentId && !childIds.includes(id));
            } else {
                // Select parent + all children
                const toAdd = [parentId, ...childIds];
                next = [...new Set([...selected, ...toAdd])];
            }
            onChange(next.length > 0 ? next : undefined);
        },
        [selected, grouped.childrenMap, onChange],
    );

    // Calculate selection state for each parent
    const getParentState = useCallback(
        (parentId: number): 'none' | 'some' | 'all' => {
            const children = grouped.childrenMap.get(parentId) || [];
            if (children.length === 0) return selected.includes(parentId) ? 'all' : 'none';
            const childIds = children.map((c) => c.id);
            const selectedChildCount = childIds.filter((id) => selected.includes(id)).length;
            const parentSelected = selected.includes(parentId);
            if (parentSelected && selectedChildCount === childIds.length) return 'all';
            if (parentSelected || selectedChildCount > 0) return 'some';
            return 'none';
        },
        [selected, grouped.childrenMap],
    );

    // Summary label for trigger button
    const triggerLabel = useMemo(() => {
        if (selected.length === 0) return null;
        const names = selected
            .slice(0, 2)
            .map((id) => {
                const svc = (services as ServiceItem[]).find((s) => s.id === id);
                return svc?.name || '';
            })
            .filter(Boolean);
        if (selected.length > 2) return `${names.join(', ')} +${selected.length - 2}`;
        return names.join(', ');
    }, [selected, services]);

    return (
        <FilterShell
            open={open}
            onOpenChange={setOpen}
            title="Service"
            popoverClassName="w-[320px] p-0"
            trigger={
                <Button variant="outline" size="sm" className="h-8 max-w-[220px] gap-1 border-dashed">
                    <Layers className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    {selected.length > 0 ? (
                        <>
                            <span className="truncate text-xs">{triggerLabel}</span>
                            <Badge variant="primary" appearance="light" size="xs" className="ml-0.5 shrink-0">
                                {selected.length}
                            </Badge>
                        </>
                    ) : (
                        <span>Service</span>
                    )}
                    <ChevronsUpDown className="ml-auto h-3 w-3 shrink-0 opacity-50" />
                </Button>
            }
        >
            <Command>
                <CommandInput placeholder="Search services..." className="h-9" />
                <CommandList className="max-h-[340px] overflow-y-auto">
                    <CommandEmpty>
                        <div className="py-4 text-center">
                            <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No services found</p>
                        </div>
                    </CommandEmpty>
                    {grouped.parents.map((parent, index) => {
                        const children = grouped.childrenMap.get(parent.id) || [];
                        const hasChildren = children.length > 0;
                        const isExpanded = expandedGroups.has(parent.id);
                        const parentState = getParentState(parent.id);

                        return (
                            <CommandGroup key={parent.id}>
                                {index > 0 && <Separator className="mb-1" />}
                                <CommandItem
                                    value={parent.name}
                                    onSelect={() => {
                                        if (hasChildren) {
                                            toggleParentChildren(parent.id);
                                        } else {
                                            toggle(parent.id);
                                        }
                                    }}
                                    className="cursor-pointer gap-2 py-2"
                                >
                                    <Checkbox
                                        size="sm"
                                        checked={parentState === 'all' ? true : parentState === 'some' ? 'indeterminate' : false}
                                        className="pointer-events-none"
                                    />
                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                        <span className="truncate text-sm font-medium">{parent.name}</span>
                                        {hasChildren && (
                                            <Badge variant="secondary" appearance="light" size="xs" className="shrink-0 tabular-nums">
                                                {children.length}
                                            </Badge>
                                        )}
                                    </div>
                                    {hasChildren && (
                                        <button
                                            type="button"
                                            className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleGroup(parent.id);
                                            }}
                                        >
                                            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-90')} />
                                        </button>
                                    )}
                                </CommandItem>
                                {hasChildren && isExpanded && (
                                    <div className="ml-3 border-l border-border/50 pl-1">
                                        {children.map((child) => (
                                            <CommandItem
                                                key={child.id}
                                                value={`${parent.name} ${child.name}`}
                                                onSelect={() => toggle(child.id)}
                                                className="cursor-pointer gap-2 py-1.5 pl-3"
                                            >
                                                <Checkbox
                                                    size="sm"
                                                    checked={selected.includes(child.id)}
                                                    className="pointer-events-none"
                                                />
                                                <span className="truncate text-sm">{child.name}</span>
                                                {child.country_code && (
                                                    <Badge variant="outline" size="xs" className="ml-auto shrink-0 font-mono uppercase">
                                                        {child.country_code}
                                                    </Badge>
                                                )}
                                            </CommandItem>
                                        ))}
                                    </div>
                                )}
                            </CommandGroup>
                        );
                    })}
                </CommandList>
            </Command>
            {selected.length > 0 && (
                <>
                    <Separator />
                    <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs text-muted-foreground">
                            {selected.length} selected
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground"
                            onClick={() => onChange(undefined)}
                        >
                            Clear
                        </Button>
                    </div>
                </>
            )}
        </FilterShell>
    );
});

const SourceFilter = memo(function SourceFilter({
    value,
    onChange,
}: {
    value: number[] | undefined;
    onChange: (value: number[] | undefined) => void;
}) {
    const [open, setOpen] = useState(false);
    const { sources } = useSources();
    // Coerce to numbers — URL params may arrive as strings
    const selected = useMemo(() => (value || []).map(Number), [value]);

    const toggle = useCallback(
        (sourceId: number) => {
            const next = selected.includes(sourceId) ? selected.filter((id) => id !== sourceId) : [...selected, sourceId];
            onChange(next.length > 0 ? next : undefined);
        },
        [selected, onChange],
    );

    return (
        <FilterShell
            open={open}
            onOpenChange={setOpen}
            title="Source"
            popoverClassName="w-[220px] p-0"
            trigger={
                <Button variant="outline" size="sm" className="h-8 gap-1 border-dashed">
                    Source
                    {selected.length > 0 && (
                        <Badge variant="secondary" size="xs" className="ml-1 rounded-sm">
                            {selected.length}
                        </Badge>
                    )}
                    <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                </Button>
            }
        >
            <Command>
                <CommandInput placeholder="Search sources..." className="h-9" />
                <CommandList className="max-h-[200px] overflow-y-auto">
                    <CommandEmpty>No sources found.</CommandEmpty>
                    <CommandGroup>
                        {sources.map((source) => (
                            <CommandItem
                                key={source.id}
                                value={source.name}
                                onSelect={() => toggle(source.id)}
                                className="cursor-pointer"
                            >
                                <Check className={cn('mr-2 h-4 w-4', selected.includes(source.id) ? 'opacity-100' : 'opacity-0')} />
                                {source.name}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </FilterShell>
    );
});

type DatePresetKey = 'today' | 'yesterday' | 'last_7_days' | 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'custom';

interface DatePreset {
    key: DatePresetKey;
    label: string;
    shortLabel: string;
    getRange: () => { from: string; to: string };
}

const DATE_PRESETS: DatePreset[] = [
    {
        key: 'today',
        label: 'Today',
        shortLabel: 'Today',
        getRange: () => {
            const d = format(new Date(), 'yyyy-MM-dd');
            return { from: d, to: d };
        },
    },
    {
        key: 'yesterday',
        label: 'Yesterday',
        shortLabel: 'Yesterday',
        getRange: () => {
            const d = format(subDays(new Date(), 1), 'yyyy-MM-dd');
            return { from: d, to: d };
        },
    },
    {
        key: 'last_7_days',
        label: 'Last 7 days',
        shortLabel: '7d',
        getRange: () => ({
            from: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
            to: format(new Date(), 'yyyy-MM-dd'),
        }),
    },
    {
        key: 'this_week',
        label: 'This week',
        shortLabel: 'This week',
        getRange: () => ({
            from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
            to: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        }),
    },
    {
        key: 'this_month',
        label: 'This month',
        shortLabel: 'This month',
        getRange: () => ({
            from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
            to: format(new Date(), 'yyyy-MM-dd'),
        }),
    },
    {
        key: 'last_month',
        label: 'Last month',
        shortLabel: 'Last month',
        getRange: () => {
            const lastMonth = subMonths(new Date(), 1);
            return {
                from: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
                to: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
            };
        },
    },
    {
        key: 'last_3_months',
        label: 'Last 3 months',
        shortLabel: '3 months',
        getRange: () => ({
            from: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
            to: format(new Date(), 'yyyy-MM-dd'),
        }),
    },
    {
        key: 'this_year',
        label: 'This year',
        shortLabel: format(new Date(), 'yyyy'),
        getRange: () => ({
            from: format(startOfYear(new Date()), 'yyyy-MM-dd'),
            to: format(endOfYear(new Date()), 'yyyy-MM-dd'),
        }),
    },
];

function detectActivePreset(dateFrom: string | undefined, dateTo: string | undefined): DatePresetKey | null {
    if (!dateFrom || !dateTo) {
        return null;
    }
    for (const preset of DATE_PRESETS) {
        const range = preset.getRange();
        if (range.from === dateFrom && range.to === dateTo) {
            return preset.key;
        }
    }
    return 'custom';
}

function formatDateDisplay(dateStr: string): string {
    try {
        return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
        return dateStr;
    }
}

const DateRangeFilter = memo(function DateRangeFilter({
    dateFrom,
    dateTo,
    onChangeDateFrom,
    onChangeDateTo,
}: {
    dateFrom: string | undefined;
    dateTo: string | undefined;
    onChangeDateFrom: (value: string | undefined) => void;
    onChangeDateTo: (value: string | undefined) => void;
}) {
    const [open, setOpen] = useState(false);
    const hasValue = dateFrom || dateTo;
    const activePreset = detectActivePreset(dateFrom, dateTo);
    const [view, setView] = useState<'presets' | 'custom'>(activePreset === 'custom' ? 'custom' : 'presets');

    const handlePresetSelect = useCallback(
        (preset: DatePreset) => {
            const range = preset.getRange();
            onChangeDateFrom(range.from);
            onChangeDateTo(range.to);
            setView('presets');
            setOpen(false);
        },
        [onChangeDateFrom, onChangeDateTo],
    );

    const handleClear = useCallback(() => {
        onChangeDateFrom(undefined);
        onChangeDateTo(undefined);
        setOpen(false);
    }, [onChangeDateFrom, onChangeDateTo]);

    const fromDate = dateFrom ? new Date(dateFrom) : undefined;
    const toDate = dateTo ? new Date(dateTo) : undefined;

    // Trigger label
    const triggerContent = useMemo(() => {
        if (!hasValue) return null;
        if (activePreset && activePreset !== 'custom') {
            return DATE_PRESETS.find((p) => p.key === activePreset)?.shortLabel ?? null;
        }
        if (dateFrom && dateTo) {
            return `${format(new Date(dateFrom), 'MMM d')} – ${format(new Date(dateTo), 'MMM d')}`;
        }
        return dateFrom ? `From ${format(new Date(dateFrom), 'MMM d')}` : `Until ${format(new Date(dateTo!), 'MMM d')}`;
    }, [hasValue, activePreset, dateFrom, dateTo]);

    const handleOpenChange = useCallback(
        (val: boolean) => {
            setOpen(val);
            if (!val) {
                setView(activePreset === 'custom' ? 'custom' : 'presets');
            }
        },
        [activePreset],
    );

    return (
        <FilterShell
            open={open}
            onOpenChange={handleOpenChange}
            title="Date Range"
            popoverClassName="w-auto p-0"
            trigger={
                <Button variant="outline" size="sm" className="h-8 max-w-[240px] gap-1 border-dashed">
                    <CalendarRange className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    {hasValue && triggerContent ? (
                        <span className="truncate text-xs">{triggerContent}</span>
                    ) : (
                        <span>Date Range</span>
                    )}
                    <ChevronsUpDown className="ml-auto h-3 w-3 shrink-0 opacity-50" />
                </Button>
            }
        >
            {view === 'presets' ? (
                <div className="w-full md:w-[220px]">
                    <div className="px-3 pb-1 pt-3">
                        <p className="text-xs font-medium text-muted-foreground">Quick select</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 px-2 pb-1">
                        {DATE_PRESETS.map((preset) => (
                            <button
                                key={preset.key}
                                type="button"
                                className={cn(
                                    'rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent',
                                    activePreset === preset.key && 'bg-primary/10 font-medium text-primary',
                                )}
                                onClick={() => handlePresetSelect(preset)}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between px-3 py-2">
                        <button
                            type="button"
                            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                            onClick={() => setView('custom')}
                        >
                            Custom range...
                        </button>
                        {hasValue && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={handleClear}>
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="w-full md:w-auto">
                    <div className="flex items-center justify-between border-b px-3 py-2">
                        <p className="text-sm font-medium">Custom range</p>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setView('presets')}>
                            Presets
                        </Button>
                    </div>
                    {(dateFrom || dateTo) && (
                        <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
                            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs">
                                {dateFrom ? formatDateDisplay(dateFrom) : '...'}
                                <span className="mx-1.5 text-muted-foreground">to</span>
                                {dateTo ? formatDateDisplay(dateTo) : '...'}
                            </span>
                        </div>
                    )}
                    <div className="flex flex-col items-center divide-y md:flex-row md:items-start md:divide-x md:divide-y-0">
                        <div className="w-full p-3">
                            <div className="mb-1.5 text-center text-xs font-medium text-muted-foreground">Start date</div>
                            <Calendar
                                mode="single"
                                selected={fromDate}
                                onSelect={(date) => {
                                    onChangeDateFrom(date ? format(date, 'yyyy-MM-dd') : undefined);
                                }}
                                className="mx-auto"
                                initialFocus
                            />
                        </div>
                        <div className="w-full p-3">
                            <div className="mb-1.5 text-center text-xs font-medium text-muted-foreground">End date</div>
                            <Calendar
                                mode="single"
                                selected={toDate}
                                onSelect={(date) => {
                                    onChangeDateTo(date ? format(date, 'yyyy-MM-dd') : undefined);
                                }}
                                disabled={(date) => (fromDate ? date < fromDate : false)}
                                className="mx-auto"
                            />
                        </div>
                    </div>
                    {hasValue && (
                        <>
                            <Separator />
                            <div className="flex justify-end px-3 py-2">
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={handleClear}>
                                    Clear dates
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </FilterShell>
    );
});

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive';

interface FilterChipData {
    key: keyof LeadFilters;
    label: string;
    values: string[];
    rawValues: (string | number)[];
    variant: BadgeVariant;
    maxVisible: number;
}

const FILTER_VARIANT_MAP: Record<string, BadgeVariant> = {
    status: 'primary',
    priority: 'warning',
    assigned_to: 'info',
    service_id: 'success',
    source_id: 'secondary',
    date_from: 'destructive',
    date_to: 'destructive',
};

const FilterCapsule = memo(function FilterCapsule({
    chip,
    onClear,
    onRemoveValue,
}: {
    chip: FilterChipData;
    onClear: () => void;
    onRemoveValue?: (rawValue: string | number) => void;
}) {
    const visible = chip.values.slice(0, chip.maxVisible);
    const visibleRaw = chip.rawValues.slice(0, chip.maxVisible);
    const overflow = chip.values.length - chip.maxVisible;
    const isMulti = chip.rawValues.length > 1 && !!onRemoveValue;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="group inline-flex h-7 max-w-[420px] items-center overflow-hidden rounded-md transition-shadow hover:shadow-sm"
        >
            {/* Label zone */}
            <Badge
                variant={chip.variant}
                appearance="light"
                size="sm"
                className="h-full shrink-0 rounded-none border-r border-current/10 px-2 font-semibold"
            >
                {chip.label}
            </Badge>
            {/* Values zone */}
            <Badge
                variant={chip.variant}
                appearance="outline"
                size="sm"
                className="h-full min-w-0 flex-1 gap-1 rounded-none border-0 border-y px-1.5 font-normal"
            >
                {visible.map((val, i) => (
                    <span
                        key={i}
                        className={cn(
                            'inline-flex max-w-[130px] items-center gap-0.5 truncate',
                            isMulti && 'rounded-sm bg-current/5 py-px pr-0.5 pl-1.5',
                        )}
                    >
                        <span className="truncate">{val}</span>
                        {isMulti && (
                            <button
                                type="button"
                                className="ml-0.5 inline-flex shrink-0 items-center justify-center rounded-sm p-0 opacity-50 transition-opacity hover:opacity-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveValue(visibleRaw[i]);
                                }}
                                aria-label={`Remove ${val}`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </span>
                ))}
                {overflow > 0 && (
                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="shrink-0 cursor-default rounded px-1 text-[10px] font-semibold opacity-70">
                                    +{overflow}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-h-[200px] max-w-[280px] overflow-y-auto p-0">
                                <div className="px-3 pb-1 pt-2">
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                        All {chip.label.toLowerCase()} ({chip.values.length})
                                    </p>
                                </div>
                                <div className="px-3 pb-2">
                                    {chip.values.map((val, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            className={cn(
                                                'flex w-full items-center justify-between py-0.5 text-xs leading-relaxed',
                                                onRemoveValue && 'group/item rounded-sm px-1 hover:bg-accent hover:text-accent-foreground',
                                            )}
                                            onClick={() => onRemoveValue?.(chip.rawValues[i])}
                                            disabled={!onRemoveValue}
                                        >
                                            <span>{val}</span>
                                            {onRemoveValue && <X className="ml-2 h-3 w-3 shrink-0 opacity-0 group-hover/item:opacity-60" />}
                                        </button>
                                    ))}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </Badge>
            {/* Dismiss all zone */}
            <Badge
                variant={chip.variant}
                appearance="outline"
                size="sm"
                className="h-full shrink-0 cursor-pointer rounded-none border-0 border-y border-r border-l-current/10 px-1.5 opacity-60 transition-opacity hover:opacity-100"
                onClick={onClear}
                role="button"
                aria-label={`Remove all ${chip.label} filters`}
            >
                <X className="h-3.5 w-3.5" />
            </Badge>
        </motion.div>
    );
});

function useFilterChips(
    filters: LeadFilters,
    assignedToName: string | undefined,
    isSuperAdmin: boolean,
) {
    const { statuses } = useStatuses();
    const { services } = useServices();
    const { sources } = useSources();

    return useMemo(() => {
        const result: FilterChipData[] = [];

        if (filters.status && filters.status.length > 0) {
            result.push({
                key: 'status',
                label: 'Status',
                values: filters.status.map((s) => {
                    const found = statuses.find((st) => st.name === s);
                    return found ? found.name.replace(/_/g, ' ') : s;
                }),
                rawValues: [...filters.status],
                variant: FILTER_VARIANT_MAP.status,
                maxVisible: 2,
            });
        }
        if (filters.priority && filters.priority.length > 0) {
            result.push({
                key: 'priority',
                label: 'Priority',
                values: filters.priority.map((p) => PRIORITIES.find((pr) => pr.value === p)?.label || p),
                rawValues: [...filters.priority],
                variant: FILTER_VARIANT_MAP.priority,
                maxVisible: 2,
            });
        }
        if (filters.assigned_to && isSuperAdmin) {
            result.push({
                key: 'assigned_to',
                label: 'Assigned To',
                values: [assignedToName || String(filters.assigned_to)],
                rawValues: [filters.assigned_to],
                variant: FILTER_VARIANT_MAP.assigned_to,
                maxVisible: 1,
            });
        }
        if (filters.service_id && filters.service_id.length > 0) {
            result.push({
                key: 'service_id',
                label: 'Service',
                values: filters.service_id.map((id) => {
                    const svc = (services as ServiceItem[]).find((s) => s.id === Number(id));
                    return svc?.name || String(id);
                }),
                rawValues: [...filters.service_id],
                variant: FILTER_VARIANT_MAP.service_id,
                maxVisible: 2,
            });
        }
        if (filters.source_id && filters.source_id.length > 0) {
            result.push({
                key: 'source_id',
                label: 'Source',
                values: filters.source_id.map((id) => {
                    const src = sources.find((s) => s.id === Number(id));
                    return src?.name || String(id);
                }),
                rawValues: [...filters.source_id],
                variant: FILTER_VARIANT_MAP.source_id,
                maxVisible: 2,
            });
        }
        if (filters.date_from || filters.date_to) {
            const preset = detectActivePreset(filters.date_from, filters.date_to);
            if (preset && preset !== 'custom') {
                const presetLabel = DATE_PRESETS.find((p) => p.key === preset)?.label ?? '';
                result.push({
                    key: 'date_from',
                    label: 'Date',
                    values: [presetLabel],
                    rawValues: [filters.date_from ?? ''],
                    variant: FILTER_VARIANT_MAP.date_from,
                    maxVisible: 1,
                });
            } else {
                const dateValues: string[] = [];
                const dateRaw: string[] = [];
                if (filters.date_from) {
                    dateValues.push(`From ${formatDateDisplay(filters.date_from)}`);
                    dateRaw.push(filters.date_from);
                }
                if (filters.date_to) {
                    dateValues.push(`To ${formatDateDisplay(filters.date_to)}`);
                    dateRaw.push(filters.date_to);
                }
                result.push({
                    key: 'date_from',
                    label: 'Date',
                    values: dateValues,
                    rawValues: dateRaw,
                    variant: FILTER_VARIANT_MAP.date_from,
                    maxVisible: 2,
                });
            }
        }

        return result;
    }, [filters, statuses, services, sources, assignedToName, isSuperAdmin]);
}

function useRemoveFilterValue(
    onClearFilter: (key: keyof LeadFilters) => void,
    onSetFilter: <K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) => void,
) {
    return useCallback(
        (chip: FilterChipData, rawValue: string | number) => {
            // Date chips are special: one chip spans date_from + date_to
            if (chip.key === 'date_from') {
                const idx = chip.rawValues.indexOf(rawValue);
                // First rawValue = date_from, second = date_to
                if (idx === 0) {
                    onClearFilter('date_from');
                } else {
                    onClearFilter('date_to');
                }
                return;
            }

            const remaining = chip.rawValues.filter((v) => v !== rawValue);
            if (remaining.length === 0) {
                onClearFilter(chip.key);
            } else {
                onSetFilter(chip.key, remaining as LeadFilters[typeof chip.key]);
            }
        },
        [onClearFilter, onSetFilter],
    );
}

/** Desktop inline chips — hidden on mobile */
const ActiveFilterChips = memo(function ActiveFilterChips({
    chips,
    onClearFilter,
    onRemoveValue,
}: {
    chips: FilterChipData[];
    onClearFilter: (key: keyof LeadFilters) => void;
    onRemoveValue: (chip: FilterChipData, rawValue: string | number) => void;
}) {
    if (chips.length === 0) return null;

    return (
        <div className="hidden flex-wrap items-center gap-2 md:flex">
            <AnimatePresence mode="popLayout">
                {chips.map((chip) => (
                    <FilterCapsule
                        key={chip.key}
                        chip={chip}
                        onClear={() => onClearFilter(chip.key)}
                        onRemoveValue={chip.rawValues.length > 1 ? (val) => onRemoveValue(chip, val) : undefined}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
});

/** Mobile bottom drawer for active filters — visible only on small screens */
const MobileFilterDrawer = memo(function MobileFilterDrawer({
    chips,
    onClearFilter,
    onRemoveValue,
    onClearAll,
}: {
    chips: FilterChipData[];
    onClearFilter: (key: keyof LeadFilters) => void;
    onRemoveValue: (chip: FilterChipData, rawValue: string | number) => void;
    onClearAll: () => void;
}) {
    const [open, setOpen] = useState(false);
    const totalValues = chips.reduce((sum, c) => sum + c.rawValues.length, 0);

    if (chips.length === 0) return null;

    return (
        <div className="md:hidden">
            <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setOpen(true)}
            >
                <ListFilter className="h-3.5 w-3.5" />
                <span className="text-xs">Filters</span>
                <Badge variant="primary" size="sm" className="ml-0.5 h-5 min-w-5 px-1.5 text-[10px]">
                    {totalValues}
                </Badge>
            </Button>

            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerContent>
                    <DrawerHeader className="pb-2">
                        <DrawerTitle className="flex items-center justify-between">
                            <span>Active Filters</span>
                            <Badge variant="mono" size="sm">{totalValues} applied</Badge>
                        </DrawerTitle>
                    </DrawerHeader>

                    <div className="max-h-[60vh] overflow-y-auto px-4 pb-2">
                        {chips.map((chip) => (
                            <div key={chip.key} className="mb-3 last:mb-0">
                                <div className="mb-1.5 flex items-center justify-between">
                                    <Badge variant={chip.variant} appearance="light" size="sm" className="font-semibold">
                                        {chip.label}
                                    </Badge>
                                    <button
                                        type="button"
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => onClearFilter(chip.key)}
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="flex flex-col gap-1">
                                    {chip.values.map((val, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between rounded-md border px-3 py-2"
                                        >
                                            <span className="text-sm">{val}</span>
                                            {chip.rawValues.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="ml-2 rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                                    onClick={() => onRemoveValue(chip, chip.rawValues[i])}
                                                    aria-label={`Remove ${val}`}
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <DrawerFooter className="flex-row gap-2 border-t pt-3">
                        <Button variant="destructive" size="sm" className="flex-1" onClick={() => { onClearAll(); setOpen(false); }}>
                            Clear all filters
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" size="sm" className="flex-1">
                                Done
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </div>
    );
});

export default memo(function LeadFilterBar({ filters, activeFilterCount, onSetFilter, onClearFilter, onClearAll }: LeadFilterBarProps) {
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = auth.isSuperAdmin;
    const canManageTeam = !isSuperAdmin && (auth.permissions ?? []).includes('manage team agents');
    const [assignedToName, setAssignedToName] = useState<string | undefined>();

    const chips = useFilterChips(filters, assignedToName, isSuperAdmin);
    const handleRemoveValue = useRemoveFilterValue(onClearFilter, onSetFilter);

    const handleStatusChange = useCallback(
        (val: string[] | undefined) => onSetFilter('status', val),
        [onSetFilter],
    );

    const handlePriorityChange = useCallback(
        (val: string[] | undefined) => onSetFilter('priority', val),
        [onSetFilter],
    );

    const handleAssignedToChange = useCallback(
        (val: number | undefined, name: string | undefined) => {
            setAssignedToName(name);
            onSetFilter('assigned_to', val);
        },
        [onSetFilter],
    );

    const handleServiceChange = useCallback(
        (val: number[] | undefined) => onSetFilter('service_id', val),
        [onSetFilter],
    );

    const handleSourceChange = useCallback(
        (val: number[] | undefined) => onSetFilter('source_id', val),
        [onSetFilter],
    );

    const handleDateFromChange = useCallback(
        (val: string | undefined) => onSetFilter('date_from', val),
        [onSetFilter],
    );

    const handleDateToChange = useCallback(
        (val: string | undefined) => onSetFilter('date_to', val),
        [onSetFilter],
    );

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="overflow-hidden border-b"
        >
            <div className="flex flex-wrap items-center gap-2 px-4 py-2">
                <StatusFilter value={filters.status} onChange={handleStatusChange} />
                <PriorityFilter value={filters.priority} onChange={handlePriorityChange} />
                {(isSuperAdmin || canManageTeam) && (
                    <AssignedToFilter
                        value={filters.assigned_to}
                        selectedName={assignedToName}
                        onChange={handleAssignedToChange}
                        roleFilter={canManageTeam ? 'support-agent' : undefined}
                    />
                )}
                <ServiceFilter value={filters.service_id} onChange={handleServiceChange} />
                <SourceFilter value={filters.source_id} onChange={handleSourceChange} />
                <DateRangeFilter
                    dateFrom={filters.date_from}
                    dateTo={filters.date_to}
                    onChangeDateFrom={handleDateFromChange}
                    onChangeDateTo={handleDateToChange}
                />

                {/* Desktop: inline capsule chips */}
                <ActiveFilterChips chips={chips} onClearFilter={onClearFilter} onRemoveValue={handleRemoveValue} />

                {/* Mobile: drawer trigger + bottom sheet */}
                <MobileFilterDrawer chips={chips} onClearFilter={onClearFilter} onRemoveValue={handleRemoveValue} onClearAll={onClearAll} />

                <AnimatePresence>
                    {activeFilterCount > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                        >
                            <Button variant="ghost" size="sm" className="hidden h-8 text-muted-foreground md:inline-flex" onClick={onClearAll}>
                                Clear all
                                <X className="ml-1 h-3 w-3" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
});
