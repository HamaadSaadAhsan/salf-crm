import {
    Archive,
    CheckCheck,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    CommandIcon,
    Filter,
    Folder,
    Info,
    Mail,
    MoreVertical,
    Plus,
    RefreshCw,
    Search,
    Settings,
    Tag,
    Trash2,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FollowUpBanner } from '@/components/follow-up-banner';
import { useLeadFilters, type LeadFilters } from '@/hooks/useLeadFilters';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import type { Lead, LeadActivity } from '@/types/lead';
import { Deferred, Head, router, usePage } from '@inertiajs/react';
import { AnimatePresence } from 'motion/react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import OptimizedLeadRow from './components/LeadRow';
import LeadFilterBar from './components/LeadFilterBar';
import { NewLeadSheet } from './components/NewLeadSheet';
import SavedFiltersDialog from './components/SavedFiltersDialog';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Leads',
        href: '/leads',
    },
];

interface PendingDueTask {
    id: number;
    title: string;
    type: string;
    priority: string;
    due_at: string | null;
    is_overdue: boolean;
    lead_id: string | null;
    lead_name: string | null;
}

// Inertia page props interface
interface LeadsPageProps {
    leads: Lead[] | { data: Lead[] };
    data?: Lead[];
    meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
        has_more: boolean;
    };
    filters: LeadFilters;
    pendingDueTasks?: PendingDueTask[];
}

// Simple selection management
const useSelection = () => {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const toggleItem = useCallback((id: string) => {
        setSelectedItems((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const toggleAll = useCallback((items: Lead[]) => {
        setSelectedItems((prev) => {
            const itemIds = items.map((item) => item.id);
            const allSelected = itemIds.every((id) => prev.has(id));
            return allSelected ? new Set() : new Set(itemIds);
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedItems(new Set());
    }, []);

    return {
        selectedItems,
        toggleItem,
        toggleAll,
        clearSelection,
        selectedCount: selectedItems.size,
    };
};

// Memoized action buttons to prevent re-renders
const ActionButtons = React.memo(({ selectedCount, onRefresh, onMarkAllAsRead }: { selectedCount: number; onRefresh: () => void; onMarkAllAsRead: () => void }) => {
    const handleRefreshClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            onRefresh();
        },
        [onRefresh],
    );

    if (selectedCount > 0) {
        return (
            <div className="flex items-center gap-1">
                {[Archive, Info, Trash2, Mail, Clock, Folder, Tag, MoreVertical].map((Icon, i) => (
                    <Button variant="ghost" key={i} size="icon" className="h-8 w-8 cursor-pointer">
                        <Icon className="h-4 w-4" />
                    </Button>
                ))}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleRefreshClick} className="rounded transition-colors duration-75">
                <RefreshCw className="h-4 w-4" />
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={onMarkAllAsRead}>
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Mark all as read
                    </DropdownMenuItem>
                    <div className="px-2 py-1.5 text-xs text-muted-foreground select-none">
                        Select leads to see more actions
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
});
ActionButtons.displayName = 'ActionButtons';

// Memoized pagination controls
const ALL_PAGE_SIZES = [25, 50, 100, 200];

const PaginationControls = React.memo(({ meta, onPagination, onPageSizeChange }: { meta: LeadsPageProps['meta']; onPagination: (direction: string) => void; onPageSizeChange: (size: number) => void }) => {
    const handlePrev = useCallback(() => onPagination('prev'), [onPagination]);
    const handleNext = useCallback(() => onPagination('next'), [onPagination]);

    const formatNumber = (num: number) => num.toLocaleString();

    // Only show page sizes that make sense given the total
    const pageSizes = useMemo(() => {
        const total = meta.total || 0;
        const sizes = ALL_PAGE_SIZES.filter((size, i) => {
            if (i === 0) return true;
            return total > ALL_PAGE_SIZES[i - 1];
        });
        if (!sizes.includes(meta.per_page)) {
            sizes.push(meta.per_page);
            sizes.sort((a, b) => a - b);
        }
        return sizes;
    }, [meta.total, meta.per_page]);

    return (
        <div className="flex items-center">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1">
                        <span>{formatNumber(meta.from || 0)}</span>–<span>{formatNumber(meta.to || 0)}</span>
                        <span className="mx-0.5">of</span>
                        <span>{formatNumber(meta.total || 0)}</span>
                        <ChevronDown className="h-3 w-3 ml-0.5" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {pageSizes.map((size) => (
                        <DropdownMenuItem
                            key={size}
                            onSelect={() => onPageSizeChange(size)}
                            className={meta.per_page === size ? 'bg-accent' : ''}
                        >
                            {size} per page
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            <div className="ml-2 flex">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handlePrev} disabled={meta.current_page === 1}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleNext} disabled={!meta.has_more}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
});
PaginationControls.displayName = 'PaginationControls';

// Memoized search input
const SearchInput = React.memo(
    ({
        searchInput,
        onSearchChange,
        isMac,
        inputRef,
    }: {
        searchInput: string;
        onSearchChange: (value: string) => void;
        isMac: boolean;
        inputRef: React.RefObject<HTMLInputElement | null>;
    }) => {
        const handleChange = useCallback(
            (e: React.ChangeEvent<HTMLInputElement>) => {
                onSearchChange(e.target.value);
            },
            [onSearchChange],
        );

        const inputClassName = useMemo(
            () =>
                cn(
                    'mx-auto flex max-w-4xl flex-1 items-center rounded-full border bg-muted/50 px-4 py-2 shadow-sm transition-all duration-200',
                    inputRef.current && inputRef.current === document.activeElement && 'border-primary bg-background shadow-md',
                ),
            [inputRef],
        );

        return (
            <div className={inputClassName}>
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Search Leads"
                    value={searchInput}
                    onChange={handleChange}
                    className="flex-1 border-none bg-transparent px-2 text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
                />

                <div className="ml-2 flex items-center-safe justify-center-safe gap-1">
                    <kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 select-none">
                        {isMac ? <CommandIcon size={10} /> : <span className="text-xs">Ctrl</span>}
                    </kbd>
                    <kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 select-none">
                        K
                    </kbd>
                </div>
            </div>
        );
    },
);
SearchInput.displayName = 'SearchInput';

// Main leads interface using Inertia
export default function LeadsInterface() {

    const pageProps = usePage<LeadsPageProps & Record<string, unknown>>().props;

    // Handle both direct array and nested data structure
    const leads = useMemo(
        () => (Array.isArray(pageProps.leads) ? pageProps.leads : pageProps.leads?.data || pageProps.data || []),
        [pageProps.leads, pageProps.data],
    );

    const meta = useMemo(
        () =>
            pageProps.meta || {
                current_page: 1,
                per_page: 25,
                total: 0,
                last_page: 1,
                from: null,
                to: null,
                has_more: false,
            },
        [pageProps.meta],
    );

    // Use centralized filter management
    const {
        filters,
        searchInput,
        setSearchInput,
        setFilter,
        clearFilter,
        clearAll,
        applyFilters,
        activeFilterCount,
    } = useLeadFilters();

    const searchInputRef = useRef<HTMLInputElement>(null);
    const [isMac, setIsMac] = useState(false);
    const [selectAllChecked, setSelectAllChecked] = useState(false);
    const [isNewLeadSheetOpen, setIsNewLeadSheetOpen] = useState(false);
    const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
    const [showFilterBar, setShowFilterBar] = useState(true);

    const pendingDueTasks = pageProps.pendingDueTasks || [];

    // Calculate most recent activity from all leads
    const lastActivity = useMemo<{ text: string; activity: LeadActivity | null }>(() => {
        if (!Array.isArray(leads) || leads.length === 0) {
            return { text: 'No recent activity', activity: null };
        }

        let mostRecentActivity: LeadActivity | null = null;
        let mostRecentTime: Date | null = null;
        const now = new Date();

        for (const lead of leads) {
            const activities = lead.activities?.data || [];

            for (const activity of activities) {
                try {
                    const activityTime = parseISO(activity.created_at);

                    if (activityTime <= now) {
                        if (!mostRecentTime || activityTime > mostRecentTime) {
                            mostRecentTime = activityTime;
                            mostRecentActivity = activity;
                        }
                    }
                } catch {
                    continue;
                }
            }
        }

        if (!mostRecentActivity || !mostRecentTime) {
            return { text: 'No recent activity', activity: null };
        }

        try {
            const text = formatDistanceToNow(mostRecentTime, { addSuffix: true });
            return { text, activity: mostRecentActivity };
        } catch {
            return { text: 'No recent activity', activity: null };
        }
    }, [leads]);

    // Selection management
    const { selectedItems, toggleItem, toggleAll, clearSelection, selectedCount } = useSelection();

    // Hover state
    const [hoveredLead, setHoveredLead] = useState<string | null>(null);

    // Detect Mac
    useEffect(() => {
        setIsMac(/Mac|iPhone|iPod|iPad/.test(navigator.userAgent));
    }, []);

    const handleSelectAll = useCallback(() => {
        if (Array.isArray(leads)) {
            toggleAll(leads);
        }
    }, [toggleAll, leads]);

    const handleHover = useCallback((leadId: string | null) => {
        setHoveredLead(leadId);
    }, []);

    const handleToggleStar = useCallback((leadId: string) => {
        console.log('Toggle star for:', leadId);
    }, []);

    const handlePagination = useCallback(
        (direction: string) => {
            const currentPage = meta.current_page;
            let newPage = currentPage;

            if (direction === 'prev' && currentPage > 1) {
                newPage = currentPage - 1;
            } else if (direction === 'next' && meta.has_more) {
                newPage = currentPage + 1;
            }

            if (newPage !== currentPage) {
                applyFilters({ page: newPage });
            }
        },
        [meta, applyFilters],
    );

    const handleRefresh = useCallback(() => {
        router.reload({
            only: ['leads', 'meta'],
        });
        clearSelection();
    }, [clearSelection]);

    const handleMarkAllAsRead = useCallback(() => {
        console.log('Mark all as read');
    }, []);

    const handlePageSizeChange = useCallback(
        (size: number) => {
            applyFilters({ per_page: size, page: 1 });
        },
        [applyFilters],
    );

    const handleLeadClick = useCallback((leadId: string) => {
        router.visit(`/leads/${leadId}`);
    }, []);

    const handleApplyPreset = useCallback(
        (presetFilters: LeadFilters) => {
            applyFilters(presetFilters);
        },
        [applyFilters],
    );

    useEffect(() => {
        const leadsLength = Array.isArray(leads) ? leads.length : 0;
        setSelectAllChecked(selectedCount === leadsLength && leadsLength > 0);
    }, [selectedCount, leads]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyboard = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyboard);
        return () => document.removeEventListener('keydown', handleKeyboard);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Leads" />
            <div className="flex flex-col font-sans">
                {/* Lead Grid Header */}
                <header className="flex h-16 items-center border-b bg-background px-4">
                    <SearchInput searchInput={searchInput} onSearchChange={setSearchInput} isMac={isMac} inputRef={searchInputRef} />
                    <div className="ml-4 flex items-center gap-2">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setIsNewLeadSheetOpen(true)}
                            className="mr-2"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Lead
                        </Button>
                        <Button
                            variant={showFilterBar ? 'secondary' : 'ghost'}
                            size="icon"
                            className="cursor-pointer relative"
                            onClick={() => setShowFilterBar(!showFilterBar)}
                        >
                            <Filter className="h-5 w-5" />
                            {activeFilterCount > 0 && (
                                <Badge
                                    variant="primary"
                                    size="xs"
                                    shape="circle"
                                    className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px]"
                                >
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>
                        <Button
                            className="cursor-pointer"
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSettingsDialogOpen(true)}
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                    </div>
                </header>

                {/* Filter Bar */}
                <AnimatePresence>
                    {showFilterBar && (
                        <LeadFilterBar
                            filters={filters}
                            activeFilterCount={activeFilterCount}
                            onSetFilter={setFilter}
                            onClearFilter={clearFilter}
                            onClearAll={clearAll}
                        />
                    )}
                </AnimatePresence>

                <div className="flex flex-1">
                    {/* Main Content */}
                    <div className="flex-1 p-4">
                        {/* Follow-up Banner */}
                        <Deferred data="pendingDueTasks" fallback={null}>
                            {pendingDueTasks.length > 0 && (
                                <div className="mb-4">
                                    <FollowUpBanner tasks={pendingDueTasks} />
                                </div>
                            )}
                        </Deferred>

                        <div className="flex flex-col rounded-lg border bg-background shadow-sm">
                            {/* Toolbar */}
                            <div className="flex items-center justify-between border-b px-4 py-2">
                                <div className="flex items-center">
                                    <div className="mr-2 flex items-center">
                                        <Checkbox checked={selectAllChecked} onCheckedChange={handleSelectAll} />
                                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                            <ChevronDown className="h-3 w-3" />
                                        </Button>
                                        {selectedCount > 0 && <span className="ml-2 text-sm">{selectedCount} selected</span>}
                                    </div>

                                    <ActionButtons selectedCount={selectedCount} onRefresh={handleRefresh} onMarkAllAsRead={handleMarkAllAsRead} />
                                </div>

                                <PaginationControls meta={meta} onPagination={handlePagination} onPageSizeChange={handlePageSizeChange} />
                            </div>

                            {/* Leads List */}
                            <div>
                                <div>
                                    {!Array.isArray(leads) || leads.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                            <Search className="mb-3 h-10 w-10 opacity-30" />
                                            <span className="text-sm">
                                                {!Array.isArray(leads) ? 'Loading...' : 'No leads found'}
                                            </span>
                                            {activeFilterCount > 0 && (
                                                <Button variant="ghost" size="sm" className="mt-2 text-primary" onClick={clearAll}>
                                                    Clear all filters
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {leads.map((lead: Lead, index: number) => (
                                                <OptimizedLeadRow
                                                    key={lead.id}
                                                    index={index}
                                                    data={{
                                                        leads,
                                                        selectedLeads: selectedItems,
                                                        hoveredLead,
                                                        onSelectLead: toggleItem,
                                                        onHoverLead: handleHover,
                                                        onToggleStar: handleToggleStar,
                                                        onLeadClick: handleLeadClick,
                                                    }}
                                                    style={{}}
                                                />
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Status bar */}
                            <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-4">
                                    <span>Page size: {meta.per_page}</span>
                                    {selectedCount > 0 && <span>{selectedCount} selected</span>}
                                    {activeFilterCount > 0 && (
                                        <span>{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active</span>
                                    )}
                                </div>
                                <div className="flex items-center">
                                    {lastActivity.activity ? (
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button type="button" className="cursor-help text-xs hover:underline">
                                                        Last activity: {lastActivity.text}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs z-50">
                                                    <div className="space-y-1">
                                                        <div className="font-semibold">{lastActivity.activity.subject}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Type: {lastActivity.activity.type}
                                                        </div>
                                                        {lastActivity.activity.description && (
                                                            <div className="text-xs">{lastActivity.activity.description}</div>
                                                        )}
                                                        {lastActivity.activity.user && (
                                                            <div className="text-xs text-muted-foreground">
                                                                By: {'data' in lastActivity.activity.user && lastActivity.activity.user.data
                                                                    ? lastActivity.activity.user.data.name
                                                                    : 'name' in lastActivity.activity.user
                                                                        ? lastActivity.activity.user.name
                                                                        : 'Unknown'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ) : (
                                        <span className="text-xs">Last activity: {lastActivity.text}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <NewLeadSheet
                open={isNewLeadSheetOpen}
                onOpenChange={setIsNewLeadSheetOpen}
            />

            <SavedFiltersDialog
                open={isSettingsDialogOpen}
                onOpenChange={setIsSettingsDialogOpen}
                currentFilters={filters}
                onApplyPreset={handleApplyPreset}
            />
        </AppLayout>
    );
}
