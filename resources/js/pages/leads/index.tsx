import { ChevronDown, ChevronLeft, ChevronRight, Filter, Inbox, Plus, RefreshCw, Search, Settings } from 'lucide-react';
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
import { FollowUpBanner } from '@/components/follow-up-banner';
import { useLeadFilters, type LeadFilters } from '@/hooks/useLeadFilters';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import type { Lead } from '@/types/lead';
import { Deferred, Head, router, usePage } from '@inertiajs/react';
import { AnimatePresence } from 'motion/react';
import OptimizedLeadRow from './components/LeadRow';
import LeadFilterBar from './components/LeadFilterBar';
import { BulkActionBar } from './components/BulkActionBar';
import { NewLeadSheet } from './components/NewLeadSheet';
import SavedFiltersDialog from './components/SavedFiltersDialog';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Leads', href: '/leads' },
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

interface LeadSource {
    id: number;
    name: string;
}

interface LeadsPageProps {
    leads: Lead[] | { data: Lead[] };
    data?: Lead[];
    meta: {
        per_page: number;
        count: number;
        has_more: boolean;
        next_cursor: string | null;
        sort_by?: string;
        sort_order?: 'asc' | 'desc';
    };
    filters: LeadFilters;
    leadSources: LeadSource[];
    services: Array<{ id: number; name: string }>;
    pendingDueTasks?: PendingDueTask[];
}

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

    return { selectedItems, toggleItem, toggleAll, clearSelection, selectedCount: selectedItems.size };
};

const ALL_PAGE_SIZES = [25, 50, 100, 200];

const PaginationControls = React.memo(({
    meta,
    canPrev,
    canNext,
    onPagination,
    onPageSizeChange,
}: {
    meta: LeadsPageProps['meta'];
    canPrev: boolean;
    canNext: boolean;
    onPagination: (direction: string) => void;
    onPageSizeChange: (size: number) => void;
}) => {
    const handlePrev = useCallback(() => onPagination('prev'), [onPagination]);
    const handleNext = useCallback(() => onPagination('next'), [onPagination]);

    return (
        <div className="flex items-center gap-0.5">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <span>{meta.per_page} per page</span>
                        <ChevronDown className="ml-0.5 h-3 w-3" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {ALL_PAGE_SIZES.map((size) => (
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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrev} disabled={!canPrev}>
                <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNext} disabled={!canNext}>
                <ChevronRight className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
});
PaginationControls.displayName = 'PaginationControls';

export default function LeadsInterface() {
    const { auth, ...pageProps } = usePage<LeadsPageProps & Record<string, unknown> & { auth: { permissions?: string[]; isSuperAdmin?: boolean } }>().props;

    const serverLeads = useMemo(
        () => (Array.isArray(pageProps.leads) ? pageProps.leads : pageProps.leads?.data || pageProps.data || []),
        [pageProps.leads, pageProps.data],
    );

    const serverMeta = useMemo(
        () =>
            pageProps.meta || {
                per_page: 25,
                count: 0,
                has_more: false,
                next_cursor: null,
            },
        [pageProps.meta],
    );

    // Keep stale leads visible while new request is in-flight — prevents flash/replace
    const [leads, setLeads] = useState<Lead[]>(serverLeads);
    const [meta, setMeta] = useState(serverMeta);
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);

    useEffect(() => {
        setLeads(serverLeads);
        setMeta(serverMeta);
    }, [serverLeads, serverMeta]);

    useEffect(() => {
        const removeStart = router.on('start', (event) => {
            const url = event.detail.visit.url.toString();
            if (url.includes('/leads')) setIsLoadingLeads(true);
        });
        const removeFinish = router.on('finish', () => setIsLoadingLeads(false));
        return () => { removeStart(); removeFinish(); };
    }, []);

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

    const canCreateLead = (auth.permissions ?? []).includes('create leads');
    const canEditLeads = (auth.permissions ?? []).includes('edit leads');
    const isSuperAdmin = auth.isSuperAdmin ?? false;

    const searchInputRef = useRef<HTMLInputElement>(null);
    const [isMac, setIsMac] = useState(false);
    const [selectAllChecked, setSelectAllChecked] = useState(false);
    const [isNewLeadSheetOpen, setIsNewLeadSheetOpen] = useState(false);
    const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
    const [showFilterBar, setShowFilterBar] = useState(true);

    const pendingDueTasks = pageProps.pendingDueTasks || [];

    const { selectedItems, toggleItem, toggleAll, clearSelection, selectedCount } = useSelection();

    useEffect(() => {
        setIsMac(/Mac|iPhone|iPod|iPad/.test(navigator.userAgent));
    }, []);

    const handleSelectAll = useCallback(() => {
        if (Array.isArray(leads)) toggleAll(leads);
    }, [toggleAll, leads]);

    // Keyset pagination keeps a stack of the cursors used to reach each page so
    // the user can step backwards without page numbers or a total count.
    const cursorHistory = useRef<(string | undefined)[]>([undefined]);
    const [pageIndex, setPageIndex] = useState(0);

    // Any change to the underlying filters/sort/page-size restarts pagination.
    const filterSignature = useMemo(() => {
        const { cursor: _cursor, ...rest } = filters;
        void _cursor;
        return JSON.stringify(rest);
    }, [filters]);

    useEffect(() => {
        cursorHistory.current = [undefined];
        setPageIndex(0);
    }, [filterSignature]);

    const handlePagination = useCallback(
        (direction: string) => {
            if (direction === 'next') {
                if (!meta.has_more || !meta.next_cursor) return;
                cursorHistory.current = cursorHistory.current.slice(0, pageIndex + 1);
                cursorHistory.current.push(meta.next_cursor);
                setPageIndex((i) => i + 1);
                applyFilters({ cursor: meta.next_cursor });
            } else if (direction === 'prev') {
                if (pageIndex === 0) return;
                const prevIndex = pageIndex - 1;
                setPageIndex(prevIndex);
                applyFilters({ cursor: cursorHistory.current[prevIndex] });
            }
        },
        [meta, pageIndex, applyFilters],
    );

    const canPrev = pageIndex > 0;
    const canNext = meta.has_more;

    const handleRefresh = useCallback(() => {
        router.reload({ only: ['leads', 'meta'] });
        clearSelection();
    }, [clearSelection]);

    const handlePageSizeChange = useCallback(
        (size: number) => applyFilters({ per_page: size }),
        [applyFilters],
    );

    const handleLeadClick = useCallback((leadId: string) => {
        const lead = Array.isArray(leads) ? leads.find((l) => l.id === leadId) : undefined;
        if (lead) router.visit(lead.urls.show);
    }, [leads]);

    const handleApplyPreset = useCallback(
        (presetFilters: LeadFilters) => applyFilters(presetFilters),
        [applyFilters],
    );

    useEffect(() => {
        const leadsLength = Array.isArray(leads) ? leads.length : 0;
        setSelectAllChecked(selectedCount === leadsLength && leadsLength > 0);
    }, [selectedCount, leads]);

    useEffect(() => {
        const handleKeyboard = (e: KeyboardEvent) => {
            if ((e.key === 'K' || e.key === 'k') && e.shiftKey && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                e.stopPropagation();
                searchInputRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyboard);
        return () => document.removeEventListener('keydown', handleKeyboard);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs} fullHeight collapseSidebar>
            <Head title="Leads" />

            <div className="flex h-full flex-col overflow-hidden">
                {/* Mail-style toolbar */}
                <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-1.5">
                    {/* Search — flex-1 like mail */}
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search leads..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="h-8 rounded-lg border-muted bg-muted/40 pl-9 text-sm focus-visible:bg-background"
                        />
                        <div className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 items-center gap-1 sm:flex">
                            <kbd className="inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground select-none">
                                {isMac ? '⌘' : 'Ctrl'}
                            </kbd>
                            <kbd className="inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground select-none">
                                ⇧
                            </kbd>
                            <kbd className="inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground select-none">
                                K
                            </kbd>
                        </div>
                    </div>

                    {/* Actions */}
                    <Button variant="ghost" mode="icon" size="sm" className="shrink-0" onClick={handleRefresh} title="Refresh">
                        <RefreshCw className="size-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        mode="icon"
                        size="sm"
                        className={cn('relative shrink-0', showFilterBar && 'bg-accent')}
                        onClick={() => setShowFilterBar(!showFilterBar)}
                        title="Toggle filters"
                    >
                        <Filter className="size-4" />
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

                    {canCreateLead && (
                        <Button
                            variant="primary"
                            size="sm"
                            className="shrink-0 gap-1.5"
                            onClick={() => setIsNewLeadSheetOpen(true)}
                        >
                            <Plus className="size-4" />
                            <span className="hidden sm:inline">New Lead</span>
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        mode="icon"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setIsSettingsDialogOpen(true)}
                        title="Saved filters"
                    >
                        <Settings className="size-4" />
                    </Button>
                </div>

                {/* Bulk actions bar (replaces filter bar when items selected) */}
                <AnimatePresence mode="wait">
                    {selectedCount > 0 ? (
                        <BulkActionBar
                            key="bulk"
                            selectedIds={Array.from(selectedItems)}
                            selectedCount={selectedCount}
                            onClearSelection={clearSelection}
                            isSuperAdmin={isSuperAdmin}
                            canEdit={canEditLeads}
                        />
                    ) : showFilterBar ? (
                        <LeadFilterBar
                            key="filters"
                            filters={filters}
                            activeFilterCount={activeFilterCount}
                            onSetFilter={setFilter}
                            onClearFilter={clearFilter}
                            onClearAll={clearAll}
                        />
                    ) : null}
                </AnimatePresence>

                {/* Follow-up banner */}
                <Deferred data="pendingDueTasks" fallback={<div className="h-12 shrink-0 animate-pulse border-b bg-muted" />}>
                    {pendingDueTasks.length > 0 && (
                        <div className="shrink-0 border-b">
                            <FollowUpBanner tasks={pendingDueTasks} />
                        </div>
                    )}
                </Deferred>

                {/* Loading bar */}
                {isLoadingLeads && (
                    <div className="h-0.5 shrink-0 overflow-hidden bg-primary/20">
                        <div className="h-full animate-pulse bg-primary/60" />
                    </div>
                )}

                {/* Select-all + pagination toolbar */}
                <div className="flex shrink-0 items-center justify-between border-b border-border/30 px-2 py-1">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center px-1">
                            <Checkbox checked={selectAllChecked} onCheckedChange={handleSelectAll} className="size-4" />
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                        </div>
                        {selectedCount > 0 && (
                            <span className="text-xs text-muted-foreground">{selectedCount} selected</span>
                        )}
                    </div>

                    <PaginationControls meta={meta} canPrev={canPrev} canNext={canNext} onPagination={handlePagination} onPageSizeChange={handlePageSizeChange} />
                </div>

                {/* Leads list — scrollable */}
                <div className={cn('flex-1 overflow-y-auto transition-opacity duration-150', isLoadingLeads && 'pointer-events-none opacity-50')}>
                    {!Array.isArray(leads) || leads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                            <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
                                <Inbox className="size-6 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm font-medium text-foreground/70">
                                {!Array.isArray(leads) ? 'Loading...' : 'No leads found'}
                            </p>
                            {activeFilterCount > 0 && Array.isArray(leads) && leads.length === 0 && (
                                <Button variant="ghost" size="sm" className="mt-3 text-primary" onClick={clearAll}>
                                    Clear all filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        leads.map((lead: Lead, index: number) => (
                            <OptimizedLeadRow
                                key={lead.id}
                                index={index}
                                data={{
                                    leads,
                                    selectedLeads: selectedItems,
                                    onSelectLead: toggleItem,
                                    onLeadClick: handleLeadClick,
                                }}
                                style={{}}
                            />
                        ))
                    )}
                </div>

                {/* Status bar */}
                {Array.isArray(leads) && leads.length > 0 && (
                    <div className="flex shrink-0 items-center justify-between border-t border-border/40 px-3 py-1.5">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                                {(Array.isArray(leads) ? leads.length : 0).toLocaleString()}
                                {meta.has_more ? '+' : ''} leads
                            </span>
                            {selectedCount > 0 && (
                                <span className="hidden sm:inline">{selectedCount} selected</span>
                            )}
                            {activeFilterCount > 0 && (
                                <span className="hidden sm:inline">
                                    {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                                </span>
                            )}
                        </div>
                        <PaginationControls meta={meta} canPrev={canPrev} canNext={canNext} onPagination={handlePagination} onPageSizeChange={handlePageSizeChange} />
                    </div>
                )}
            </div>

            <NewLeadSheet
                open={isNewLeadSheetOpen}
                onOpenChange={setIsNewLeadSheetOpen}
                leadSources={pageProps.leadSources ?? []}
                services={pageProps.services ?? []}
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
