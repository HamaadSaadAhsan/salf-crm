import {
    Archive,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    CommandIcon,
    Folder,
    Info,
    Mail,
    MoreVertical,
    RefreshCw,
    Search,
    Settings,
    Tag,
    Trash2,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LeadDetailDialog } from '@/components/lead-detail-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import type { Lead } from '@/types/lead';
import { Head, router, usePage } from '@inertiajs/react';
import OptimizedLeadRow from './components/LeadRow';

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

// Inertia page props interface
interface LeadsPageProps {
    leads: Lead[] | { data: Lead[] } | any;
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
    filters: {
        page?: number;
        per_page?: number;
        search?: string;
        status?: string;
        priority?: string;
        assigned_to?: number;
    };
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
const ActionButtons = React.memo(({ selectedCount, onRefresh }: { selectedCount: number; onRefresh: () => void }) => {
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
            <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
            </Button>
        </div>
    );
});
ActionButtons.displayName = 'ActionButtons';

// Memoized pagination controls
const PaginationControls = React.memo(({ meta, onPagination }: { meta: LeadsPageProps['meta']; onPagination: (direction: string) => void }) => {
    const handlePrev = useCallback(() => onPagination('prev'), [onPagination]);
    const handleNext = useCallback(() => onPagination('next'), [onPagination]);

    return (
        <div className="ml-4 flex">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handlePrev} disabled={meta.current_page === 1}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleNext} disabled={!meta.has_more}>
                <ChevronRight className="h-4 w-4" />
            </Button>
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
                    'mx-auto flex max-w-4xl flex-1 items-center rounded-full border px-4 py-2 shadow-sm',
                    inputRef.current && inputRef.current === document.activeElement && 'border-primary shadow-md',
                ),
            [inputRef],
        );

        return (
            <div className={inputClassName}>
                <Search className="text-primary-background h-5 w-5" />
                <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Search Leads"
                    value={searchInput}
                    onChange={handleChange}
                    className="flex-1 border-none bg-transparent px-2 text-sm shadow-none outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none dark:bg-transparent"
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
    const pageProps = usePage<LeadsPageProps & { [key: string]: any }>().props;

    // Handle both direct array and nested data structure
    const leads = useMemo(() => 
        Array.isArray(pageProps.leads)
            ? pageProps.leads
            : (pageProps.leads?.data || pageProps.data || [])
    , [pageProps.leads, pageProps.data]);

    const meta = useMemo(() => pageProps.meta || {
        current_page: 1,
        per_page: 25,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
        has_more: false
    }, [pageProps.meta]);

    const filters = useMemo(() => pageProps.filters || {}, [pageProps.filters]);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [searchInput, setSearchInput] = useState(filters.search || '');
    const [isMac, setIsMac] = useState(false);
    const [selectAllChecked, setSelectAllChecked] = useState(false);

    // Selection management
    const { selectedItems, toggleItem, toggleAll, clearSelection, selectedCount } = useSelection();

    // Hover state
    const [hoveredLead, setHoveredLead] = useState<string | null>(null);

    // Lead detail dialog state
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

    // Detect Mac
    useEffect(() => {
        setIsMac(/Mac|iPhone|iPod|iPad/.test(navigator.userAgent));
    }, []);

    // Memoized handlers to prevent unnecessary re-renders
    const handleDialogChange = useCallback((value: boolean) => {
        setIsDetailDialogOpen(value);
        if (!value) {
            setTimeout(() => setSelectedLeadId(null), 300);
        }
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
                router.get(
                    '/leads',
                    {
                        ...filters,
                        page: newPage,
                    },
                    {
                        preserveState: true,
                        preserveScroll: true,
                    },
                );
            }
        },
        [meta, filters],
    );

    const handleRefresh = useCallback(() => {
        router.reload({
            only: ['leads', 'meta'],
        });
        clearSelection();
    }, [clearSelection]);

    const handleSearchChange = useCallback(
        (value: string) => {
            setSearchInput(value);

            // Debounce search
            const timeoutId = setTimeout(() => {
                router.get(
                    '/leads',
                    {
                        ...filters,
                        search: value || undefined,
                        page: 1,
                    },
                    {
                        preserveState: true,
                        preserveScroll: true,
                    },
                );
            }, 300);

            return () => clearTimeout(timeoutId);
        },
        [filters],
    );

    const handleLeadClick = useCallback((leadId: string) => {
        setSelectedLeadId(leadId);
        setIsDetailDialogOpen(true);
    }, []);

    const handlePreviousLead = useCallback(() => {
        if (!selectedLeadId || !Array.isArray(leads)) return;
        const currentIndex = leads.findIndex((l: Lead) => l.id === selectedLeadId);
        if (currentIndex > 0) {
            setSelectedLeadId(leads[currentIndex - 1].id);
        }
    }, [leads, selectedLeadId]);

    const handleNextLead = useCallback(() => {
        if (!selectedLeadId || !Array.isArray(leads)) return;
        const currentIndex = leads.findIndex((l: Lead) => l.id === selectedLeadId);
        if (currentIndex < leads.length - 1) {
            setSelectedLeadId(leads[currentIndex + 1].id);
        }
    }, [leads, selectedLeadId]);

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
            <div className="flex h-screen flex-col overflow-hidden font-sans">
                {/* Header */}
                <header className="flex h-16 items-center border-b bg-primary-foreground px-4">
                    <SearchInput searchInput={searchInput} onSearchChange={handleSearchChange} isMac={isMac} inputRef={searchInputRef} />
                    <div className="ml-4 flex items-center gap-2">
                        <Button className="cursor-pointer" variant="ghost" size="icon">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Main Content */}
                    <div className="flex-1 overflow-hidden p-4">
                        <div className="flex h-full flex-col rounded-lg shadow-sm dark:border">
                            {/* Toolbar */}
                            <div className="flex items-center justify-between px-4 py-2">
                                <div className="flex items-center">
                                    <div className="mr-2 flex items-center">
                                        <Checkbox checked={selectAllChecked} onCheckedChange={handleSelectAll} />
                                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                            <ChevronDown className="h-3 w-3" />
                                        </Button>
                                        {selectedCount > 0 && <span className="ml-2 text-sm">{selectedCount} selected</span>}
                                    </div>

                                    <ActionButtons selectedCount={selectedCount} onRefresh={handleRefresh} />
                                </div>

                                <div className="flex items-center text-xs text-gray-500">
                                    <span>
                                        {meta.from || 0}–{meta.to || 0} of {meta.total || 0}
                                    </span>
                                    <PaginationControls meta={meta} onPagination={handlePagination} />
                                </div>
                            </div>

                            {/* Leads List */}
                            <div className="flex-1 overflow-hidden">
                                <div className="h-full overflow-y-auto">
                                    {!Array.isArray(leads) || leads.length === 0 ? (
                                        <div className="flex items-center justify-center py-8">
                                            {!Array.isArray(leads) ? 'Loading...' : 'No leads found'}
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
                            <div className="flex items-center justify-between border-t p-2 text-xs">
                                <div className="flex items-center gap-4">
                                    <span>Page size: {meta.per_page}</span>
                                    {selectedCount > 0 && <span>{selectedCount} selected</span>}
                                </div>
                                <div className="flex items-center">
                                    <span>Last activity: 17 minutes ago</span>
                                    <button className="ml-2 text-blue-600 hover:underline">Details</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lead Detail Dialog */}
                <LeadDetailDialog
                    isOpen={isDetailDialogOpen}
                    onOpenChangeAction={handleDialogChange}
                    leadId={selectedLeadId}
                    onPrevious={handlePreviousLead}
                    onNext={handleNextLead}
                    hasPrevious={selectedLeadId && Array.isArray(leads) ? leads.findIndex((l: Lead) => l.id === selectedLeadId) > 0 : false}
                    hasNext={selectedLeadId && Array.isArray(leads) ? leads.findIndex((l: Lead) => l.id === selectedLeadId) < leads.length - 1 : false}
                />
            </div>
        </AppLayout>
    );
}
