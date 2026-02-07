import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface LeadFilters {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string[];
    priority?: string[];
    assigned_to?: number;
    service_id?: number[];
    source_id?: number[];
    date_from?: string;
    date_to?: string;
}

interface UseLeadFiltersReturn {
    filters: LeadFilters;
    searchInput: string;
    setSearchInput: (value: string) => void;
    setFilter: <K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) => void;
    clearFilter: (key: keyof LeadFilters) => void;
    clearAll: () => void;
    applyFilters: (overrides?: Partial<LeadFilters>) => void;
    activeFilterCount: number;
}

const FILTER_KEYS: (keyof LeadFilters)[] = [
    'status',
    'priority',
    'assigned_to',
    'service_id',
    'source_id',
    'date_from',
    'date_to',
];

function cleanFilters(filters: LeadFilters): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') {
            continue;
        }
        if (Array.isArray(value) && value.length === 0) {
            continue;
        }
        // Skip default pagination values to keep URL clean
        if (key === 'page' && value === 1) {
            continue;
        }
        if (key === 'per_page' && value === 25) {
            continue;
        }
        cleaned[key] = value;
    }
    return cleaned;
}

export function useLeadFilters(): UseLeadFiltersReturn {
    const pageProps = usePage<{ filters: LeadFilters }>().props;
    const serverFilters = useMemo(() => pageProps.filters || {}, [pageProps.filters]);

    const [localFilters, setLocalFilters] = useState<LeadFilters>(serverFilters);
    const [searchInput, setSearchInputState] = useState(serverFilters.search || '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const filtersRef = useRef<LeadFilters>(localFilters);

    // Keep ref in sync with latest state
    filtersRef.current = localFilters;

    // Sync local state from server props (handles browser back/forward, initial load, external navigation)
    useEffect(() => {
        setLocalFilters(serverFilters);
        setSearchInputState(serverFilters.search || '');
    }, [serverFilters]);

    const navigate = useCallback((filters: LeadFilters) => {
        const cleaned = cleanFilters(filters);
        router.get('/leads', cleaned as Record<string, string>, {
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    const setFilter = useCallback(
        <K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) => {
            const next = { ...filtersRef.current, [key]: value, page: 1 };
            setLocalFilters(next);
            navigate(next);
        },
        [navigate],
    );

    const clearFilter = useCallback(
        (key: keyof LeadFilters) => {
            const next = { ...filtersRef.current, page: 1 };
            delete next[key];
            setLocalFilters(next);
            navigate(next);
        },
        [navigate],
    );

    const clearAll = useCallback(() => {
        const next: LeadFilters = {
            page: 1,
            per_page: filtersRef.current.per_page,
        };
        setLocalFilters(next);
        setSearchInputState('');
        navigate(next);
    }, [navigate]);

    const applyFilters = useCallback(
        (overrides?: Partial<LeadFilters>) => {
            const next: LeadFilters = { ...filtersRef.current, ...overrides };
            if (!overrides?.page) {
                next.page = 1;
            }
            setLocalFilters(next);
            navigate(next);
        },
        [navigate],
    );

    const setSearchInput = useCallback(
        (value: string) => {
            setSearchInputState(value);

            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(() => {
                const next = { ...filtersRef.current, search: value || undefined, page: 1 };
                setLocalFilters(next);
                navigate(next);
            }, 300);
        },
        [navigate],
    );

    const activeFilterCount = useMemo(() => {
        let count = 0;
        for (const key of FILTER_KEYS) {
            const val = localFilters[key];
            if (val !== undefined && val !== null && val !== '') {
                if (Array.isArray(val) && val.length === 0) {
                    continue;
                }
                count++;
            }
        }
        return count;
    }, [localFilters]);

    return {
        filters: localFilters,
        searchInput,
        setSearchInput,
        setFilter,
        clearFilter,
        clearAll,
        applyFilters,
        activeFilterCount,
    };
}
