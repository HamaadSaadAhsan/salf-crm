import { LeadsAPI } from '@/lib/api/leads';
import axios from '@/lib/axios';
import { Lead, LeadActivity, LeadFilters, Meta } from '@/types/lead';
import { ApiResponse } from '@/types/user';
import { router } from '@inertiajs/react';
import { InfiniteQueryObserverBaseResult } from '@tanstack/query-core';
import { keepPreviousData, QueryKey, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { toast } from 'sonner';

// CONSTANTS
const DEFAULT_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const DEFAULT_GC_TIME = 10 * 60 * 1000; // 10 minutes
const INFINITE_STALE_TIME = 5 * 60 * 1000; // 5 minutes for infinite queries
const INFINITE_GC_TIME = 15 * 60 * 1000; // 15 minutes for infinite queries

// UTILITY FUNCTIONS
const createStableQueryKey = (filters: LeadFilters) => {
    // Create a stable, deterministic query key
    const cleanFilters = Object.fromEntries(
        Object.entries(filters)
            .filter(([_, value]) => value !== undefined && value !== '' && value !== null)
            .sort(([a], [b]) => a.localeCompare(b)), // Sort keys for consistency
    );
    return ['leads', cleanFilters];
};

const createStableInfiniteQueryKey = (filters: LeadFilters) => {
    const { page: _page, ...infiniteFilters } = filters;
    const cleanFilters = Object.fromEntries(
        Object.entries(infiniteFilters)
            .filter(([_, value]) => value !== undefined && value !== '' && value !== null)
            .sort(([a], [b]) => a.localeCompare(b)),
    );
    return ['leads', 'infinite', cleanFilters];
};

// OPTIMIZED API CLIENT WITH CACHING
export function useApiClient() {
    return useMemo(() => {
        const baseURL = window.location.origin;
        return new LeadsAPI(baseURL);
    }, []);
}

// STRATEGY 1: Standard Pagination (optimized)
export function useLeads(filters: LeadFilters = {}) {
    const apiClient = useApiClient();
    const queryKey = useMemo(() => createStableQueryKey(filters), [filters]);

    return useQuery({
        queryKey,
        queryFn: async (): Promise<ApiResponse<Lead[]>> => {
            if (!apiClient) throw new Error('API client not available');
            return apiClient.getLeads(filters);
        },
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
        retry: (failureCount, error: Error) => {
            // Type assertion for custom error properties
            const customError = error as Error & { status?: number };
            if (!customError) return false;
            if (!customError.status) return false;

            if (customError?.status >= 400 && customError?.status < 500) return false;
            return failureCount < 2;
        },
        enabled: !!apiClient,
        select: useCallback(
            (data: ApiResponse<Lead[]>) => ({
                data: data?.data || [],
                meta: data?.meta || ({} as Meta),
            }),
            [],
        ),
        networkMode: 'online',
    });
}

// OPTIMIZED FILTER MANAGEMENT WITH REDUCER PATTERN
type FilterAction =
    | { type: 'UPDATE_PAGE'; payload: number }
    | { type: 'UPDATE_FILTERS'; payload: Partial<LeadFilters> }
    | { type: 'UPDATE_SEARCH'; payload: string }
    | { type: 'RESET_FILTERS' };

const filterReducer = (state: LeadFilters, action: FilterAction): LeadFilters => {
    switch (action.type) {
        case 'UPDATE_PAGE':
            return { ...state, page: action.payload };
        case 'UPDATE_FILTERS':
            return { ...state, ...action.payload, page: action.payload.page ?? 1 };
        case 'UPDATE_SEARCH':
            return { ...state, search: action.payload, page: 1 };
        case 'RESET_FILTERS':
            return { page: 1, per_page: state.per_page };
        default:
            return state;
    }
};

export const useOptimizedLeadFilters = (initialFilters: Partial<LeadFilters> = {}) => {
    const [filters, dispatch] = useReducer(filterReducer, {
        page: 1,
        per_page: 50,
        ...initialFilters,
    });

    const updatePage = useCallback((page: number) => {
        dispatch({ type: 'UPDATE_PAGE', payload: page });
    }, []);

    const updateFilters = useCallback((newFilters: Partial<LeadFilters>) => {
        dispatch({ type: 'UPDATE_FILTERS', payload: newFilters });
    }, []);

    const updateSearch = useCallback((search: string) => {
        dispatch({ type: 'UPDATE_SEARCH', payload: search });
    }, []);

    const resetFilters = useCallback(() => {
        dispatch({ type: 'RESET_FILTERS' });
    }, []);

    return useMemo(
        () => ({
            filters,
            updateFilters,
            updatePage,
            updateSearch,
            resetFilters,
        }),
        [filters, updateFilters, updatePage, updateSearch, resetFilters],
    );
};

// OPTIMIZED DEBOUNCED SEARCH WITH CLEANUP
export function useDebouncedSearch(initialValue = '', delay = 300) {
    const [searchValue, setSearchValue] = useState(initialValue);
    const [debouncedValue, setDebouncedValue] = useState(initialValue);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setDebouncedValue(searchValue);
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [searchValue, delay]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return [searchValue, debouncedValue, setSearchValue] as const;
}

// OPTIMIZED SELECTION MANAGEMENT WITH BULK OPERATIONS
export const useOptimizedSelection = () => {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [lastSelected, setLastSelected] = useState<string | null>(null);

    const toggleItem = useCallback(
        (id: string, shiftKey = false) => {
            setSelectedItems((prev) => {
                const newSet = new Set(prev);

                if (shiftKey && lastSelected) {
                    // Range selection logic would go here
                    // For now, just toggle the item
                    if (newSet.has(id)) newSet.delete(id);
                    else newSet.add(id);
                } else {
                    if (newSet.has(id)) newSet.delete(id);
                    else newSet.add(id);
                }

                return newSet;
            });
            setLastSelected(id);
        },
        [lastSelected],
    );

    const selectItems = useCallback((ids: string[]) => {
        setSelectedItems((prev) => new Set([...prev, ...ids]));
    }, []);

    const deselectItems = useCallback((ids: string[]) => {
        setSelectedItems((prev) => {
            const newSet = new Set(prev);
            ids.forEach((id: string) => newSet.delete(id));
            return newSet;
        });
    }, []);

    const toggleAll = useCallback((items: Lead[]) => {
        setSelectedItems((prev) => {
            const itemIds = items.map((item: Lead) => item.id);
            const allSelected = itemIds.every((id: string) => prev.has(id));
            return allSelected ? new Set() : new Set(itemIds);
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedItems(new Set());
        setLastSelected(null);
    }, []);

    const isSelected = useCallback((id: string) => selectedItems.has(id), [selectedItems]);

    return useMemo(
        () => ({
            selectedItems,
            toggleItem,
            selectItems,
            deselectItems,
            toggleAll,
            clearSelection,
            isSelected,
            selectedCount: selectedItems.size,
            hasSelection: selectedItems.size > 0,
        }),
        [selectedItems, toggleItem, selectItems, deselectItems, toggleAll, clearSelection, isSelected],
    );
};

// ENHANCED PERFORMANCE MONITORING
export function usePerformanceMonitor(componentName: string, enabled = import.meta.env.DEV) {
    const renderCount = useRef(0);
    const renderTimes = useRef<number[]>([]);
    const lastRenderTime = useRef(Date.now());

    useEffect(() => {
        if (!enabled) return;

        renderCount.current += 1;
        const now = Date.now();
        const renderTime = now - lastRenderTime.current;

        renderTimes.current.push(renderTime);

        // Keep only last 50 render times
        if (renderTimes.current.length > 50) {
            renderTimes.current = renderTimes.current.slice(-50);
        }

        if (renderCount.current % 10 === 0) {
            const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
            console.log(`${componentName} - Renders: ${renderCount.current}, Avg: ${avgRenderTime.toFixed(2)}ms`);

            // Warn about slow renders
            if (avgRenderTime > 16) {
                console.warn(`${componentName} is rendering slowly. Consider optimization.`);
            }
        }

        lastRenderTime.current = now;
    }, [enabled, componentName]);

    return renderCount.current;
}

// INTELLIGENT PREFETCHING STRATEGIES
export function usePrefetchStrategies(filters: LeadFilters) {
    const queryClient = useQueryClient();
    const apiClient = useApiClient();

    const prefetchNext = useCallback(() => {
        if (!apiClient) return;

        const nextPageFilters = { ...filters, page: (filters.page || 1) + 1 };
        const queryKey = createStableQueryKey(nextPageFilters);

        queryClient.prefetchQuery({
            queryKey,
            queryFn: () => apiClient.getLeads(nextPageFilters),
            staleTime: DEFAULT_STALE_TIME,
        });
    }, [queryClient, apiClient, filters]);

    const prefetchPrevious = useCallback(() => {
        if (!apiClient || (filters.page || 1) <= 1) return;

        const prevPageFilters = { ...filters, page: (filters.page || 1) - 1 };
        const queryKey = createStableQueryKey(prevPageFilters);

        queryClient.prefetchQuery({
            queryKey,
            queryFn: () => apiClient.getLeads(prevPageFilters),
            staleTime: DEFAULT_STALE_TIME,
        });
    }, [queryClient, apiClient, filters]);

    const intelligentPrefetch = useCallback(
        (direction: 'next' | 'prev' | 'both' = 'next') => {
            if (direction === 'next' || direction === 'both') {
                prefetchNext();
            }
            if (direction === 'prev' || direction === 'both') {
                prefetchPrevious();
            }
        },
        [prefetchNext, prefetchPrevious],
    );

    return {
        prefetchNext,
        prefetchPrevious,
        intelligentPrefetch,
    };
}

// OPTIMIZED SINGLE LEAD FETCH WITH BACKGROUND UPDATES
export function useLead(id: string | null) {
    const apiClient = useApiClient();

    const query = useQuery({
        queryKey: ['lead', id],
        queryFn: async () => {
            if (!id || !apiClient) return null;
            const response = await axios.get(`${apiClient.baseURL}/leads/${id}`);
            return response.data;
        },
        enabled: !!id && !!apiClient,
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        refetchOnWindowFocus: false,
        select: useCallback((data: { data?: Lead }) => data?.data || null, []),
        retry: (failureCount, error: { status?: number }) => {
            if (!error) return false;
            if (!error.status) return false;
            if (error?.status >= 400 && error?.status < 500) return false;
            return failureCount < 2;
        },
        networkMode: 'online',
    });

    return {
        lead: query.data,
        loading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
        isStale: query.isStale,
    };
}

// OPTIMISTIC LEAD UPDATES WITH ROLLBACK
interface OptimisticContext {
    previousLead: unknown;
    previousLeadsQueries: Array<[QueryKey, unknown]>;
}

interface MutationVariables {
    id: string;
    updates: Partial<Lead>;
}

export function useOptimisticLeadUpdate() {
    const queryClient = useQueryClient();
    const apiClient = useApiClient();

    return useMutation<
        unknown, // Return type of mutationFn
        Error, // Error type
        MutationVariables, // Variables type
        OptimisticContext // Context type
    >({
        mutationFn: async ({ id, updates }: MutationVariables) => {
            if (!apiClient) throw new Error('API client not available');
            const response = await axios.patch(`${apiClient.baseURL}/leads/${id}`, updates);
            return response.data;
        },
        onMutate: async ({ id, updates }: MutationVariables): Promise<OptimisticContext> => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['leads'] });
            await queryClient.cancelQueries({ queryKey: ['lead', id] });

            // Snapshot previous values
            const previousLead = queryClient.getQueryData(['lead', id]);
            const previousLeadsQueries = queryClient.getQueriesData({ queryKey: ['leads'] });

            // Optimistic update for individual lead
            queryClient.setQueryData(['lead', id], (old: unknown) => {
                // Type guard for lead data
                if (!old || typeof old !== 'object' || !('data' in old)) return old;
                const leadData = old as { data?: Lead };
                if (!leadData.data) return old;
                return { ...leadData, data: { ...leadData.data, ...updates } };
            });

            // Optimistic update for leads list queries
            queryClient.setQueriesData({ queryKey: ['leads'] }, (old: unknown) => {
                // Type guard for leads list data
                if (!old || typeof old !== 'object' || !('data' in old)) return old;
                const leadsData = old as { data?: Lead[] };
                if (!leadsData.data) return old;
                return {
                    ...leadsData,
                    data: leadsData.data.map((lead: Lead) => (lead.id === id ? { ...lead, ...updates } : lead)),
                };
            });

            // Update infinite query data
            queryClient.setQueriesData({ queryKey: ['leads', 'infinite'] }, (old: unknown) => {
                // Type guard for infinite query data
                if (!old || typeof old !== 'object' || !('pages' in old)) return old;
                const infiniteData = old as { pages?: Array<{ data?: Lead[]; meta?: Meta }> };
                if (!infiniteData.pages) return old;
                return {
                    ...infiniteData,
                    pages: infiniteData.pages.map((page: { data?: Lead[]; meta?: Meta }) => ({
                        ...page,
                        data: page.data?.map((lead: Lead) => (lead.id === id ? { ...lead, ...updates } : lead)) || [],
                    })),
                };
            });

            return { previousLead, previousLeadsQueries };
        },
        onError: (err: Error, { id }: MutationVariables, context: OptimisticContext | undefined) => {
            // Rollback optimistic updates
            if (context?.previousLead !== undefined) {
                queryClient.setQueryData(['lead', id], context.previousLead);
            }

            if (context?.previousLeadsQueries) {
                context.previousLeadsQueries.forEach(([queryKey, data]: [QueryKey, unknown]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }

            // Show error notification with actual validation message
            const axiosError = err as { response?: { data?: { message?: string } } };
            const message = axiosError.response?.data?.message || err.message || 'Something went wrong while updating the lead.';
            toast.error('Failed to update lead', {
                description: message,
            });
        },
        onSuccess: (_data: unknown, variables: MutationVariables) => {
            // Check if status was changed to qualified
            const wasQualified = variables.updates.inquiry_status === 'qualified';

            if (wasQualified) {
                toast.success('Lead Qualified Successfully!', {
                    description: 'The lead has been marked as qualified and will be automatically assigned to an advisor.',
                    duration: 6000,
                });
            } else {
                // Show generic success notification
                toast.success('Lead updated successfully', {
                    description: 'The lead has been updated with your changes.',
                });
            }
        },
        onSettled: (_data: unknown, _error: Error | null, variables: MutationVariables) => {
            // Invalidate queries for consistency
            void queryClient.invalidateQueries({ queryKey: ['lead', variables.id] });
            void queryClient.invalidateQueries({ queryKey: ['leads'] });

            // When a lead is qualified or requalified, the current user loses access
            // (lead gets reassigned to advisor/CRO), so redirect to /leads
            const statusChanged = variables.updates.inquiry_status;
            if (statusChanged === 'qualified' || statusChanged === 'requalify') {
                router.visit('/leads');
                return;
            }

            // Refresh Inertia page data to update the table and lead detail
            router.reload({
                only: ['leads', 'lead', 'meta'],
            });
        },
    });
}

// MAIN ADAPTIVE HOOK WITH SMART STRATEGY SELECTION
type AdaptiveLeadsResult = {
    leads: Lead[];
    meta: Partial<Meta>;
    hasNextPage?: boolean;
    fetchNextPage?: () => Promise<InfiniteQueryObserverBaseResult>;
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
};

// MAIN ADAPTIVE HOOK WITH SMART STRATEGY SELECTION
export function useInfiniteLeads(filters: LeadFilters = {}) {
    const apiClient = useApiClient();
    const { page: _page, ...infiniteFilters } = filters;

    const queryKey = useMemo(() => createStableInfiniteQueryKey(filters), [filters]);

    const query = useInfiniteQuery({
        queryKey,
        queryFn: async ({ pageParam = 1 }) => {
            if (!apiClient) throw new Error('API client not available');

            return await apiClient.getLeads({ ...infiniteFilters, page: pageParam });
        },
        initialPageParam: 1,

        // CRITICAL FIX: Proper getNextPageParam for your Laravel structure
        getNextPageParam: (lastPage) => {
            const meta = lastPage?.meta;

            if (!meta) {
                console.warn('❌ No meta found in API response');
                return undefined;
            }

            // Your Laravel API structure check
            if (meta.has_more && meta.current_page < meta.last_page) {
                return meta.current_page + 1;
            }

            return undefined;
        },

        getPreviousPageParam: (firstPage) => {
            const meta = firstPage?.meta;
            if (!meta) return undefined;

            if (meta.current_page > 1) {
                return meta.current_page - 1;
            }
            return undefined;
        },

        staleTime: INFINITE_STALE_TIME,
        gcTime: INFINITE_GC_TIME,
        enabled: !!apiClient,
        refetchOnWindowFocus: false,
        maxPages: 20,
        networkMode: 'online',

        retry: (failureCount, error: Error) => {
            console.error(`🔥 Query failed (attempt ${failureCount}):`, error);
            const httpError = error as Error & { status?: number };
            if (httpError?.status && httpError.status >= 400 && httpError.status < 500) return false;
            return failureCount < 2;
        },
    });

    // Log the query state for debugging
    useEffect(() => {}, [
        query.isLoading,
        query.isFetching,
        query.isFetchingNextPage,
        query.hasNextPage,
        query.data?.pages?.length,
        query.error,
        query.data?.pages,
    ]);

    return query;
}

// Updated useAdaptiveLeads - handle data transformation correctly
export function useAdaptiveLeads(filters: LeadFilters = {}, strategy: 'standard' | 'infinite' | 'virtual' = 'standard'): AdaptiveLeadsResult {
    const standardQuery = useLeads(filters);
    const infiniteQuery = useInfiniteLeads(filters);

    return useMemo(() => {
        switch (strategy) {
            case 'infinite':
            case 'virtual': {
                // Virtual uses infinite under the hood
                // Transform infinite query data here
                const allLeads = infiniteQuery.data?.pages?.flatMap((page) => page?.data || []) || [];
                const lastPage = infiniteQuery.data?.pages?.[infiniteQuery.data.pages.length - 1];

                return {
                    leads: allLeads,
                    meta: lastPage?.meta || {},
                    hasNextPage: infiniteQuery.hasNextPage,
                    fetchNextPage: infiniteQuery.fetchNextPage,
                    isLoading: infiniteQuery.isLoading,
                    isFetching: infiniteQuery.isFetching || infiniteQuery.isFetchingNextPage,
                    isError: infiniteQuery.isError,
                    error: infiniteQuery.error,
                    refetch: infiniteQuery.refetch,
                };
            }
            default:
                return {
                    leads: standardQuery.data?.data || [],
                    meta: standardQuery.data?.meta || {},
                    isLoading: standardQuery.isLoading,
                    isFetching: standardQuery.isFetching,
                    isError: standardQuery.isError,
                    error: standardQuery.error,
                    refetch: standardQuery.refetch,
                };
        }
    }, [strategy, standardQuery, infiniteQuery]);
}

// STRATEGY 3: Virtualized Data (optimized)
export function useVirtualizedLeads(filters: LeadFilters = {}) {
    const infiniteQuery = useInfiniteLeads(filters);

    return useMemo(
        () => ({
            ...infiniteQuery,
            items: infiniteQuery.data?.pages?.flatMap((page) => page?.data || []),
            totalCount: infiniteQuery.data?.pages.flatMap((page) => page?.data || []).length,
            hasMore: infiniteQuery.data?.pages.flatMap((page) => page?.meta?.has_more || false),
            isLoading: infiniteQuery.isFetchingNextPage,
            // Add virtualization helpers
            getItem: (index: number) => (infiniteQuery.data?.pages.flatMap((page) => page?.data) || [])[index],
            getItemCount: () => infiniteQuery.data?.pages.flatMap((page) => page?.data || []).length || 0,
        }),
        [infiniteQuery],
    );
}

// BULK OPERATIONS HOOK
type BulkOperationsResult = {
    bulkUpdate: ReturnType<typeof useMutation<unknown, Error, { ids: string[]; updates: Partial<Lead> }>>;
    bulkDelete: ReturnType<typeof useMutation<unknown, Error, string[]>>;
};

export function useBulkLeadOperations(): BulkOperationsResult {
    const queryClient = useQueryClient();
    const apiClient = useApiClient();

    const bulkUpdate = useMutation<unknown, Error, { ids: string[]; updates: Partial<Lead> }>({
        mutationFn: async ({ ids, updates }) => {
            if (!apiClient) throw new Error('API client not available');
            const response = await axios.patch(`${apiClient.baseURL}/leads/bulk`, {
                ids,
                updates,
            });
            return response.data;
        },
        onSuccess: (_data, { ids }) => {
            // Invalidate all leads queries after bulk operation
            void queryClient.invalidateQueries({ queryKey: ['leads'] });

            // Show success notification
            toast.success('Bulk update completed', {
                description: `Successfully updated ${ids.length} lead${ids.length > 1 ? 's' : ''}.`,
            });
        },
        onError: (err: Error, { ids }) => {
            // Show error notification
            toast.error('Bulk update failed', {
                description: err.message || `Failed to update ${ids.length} lead${ids.length > 1 ? 's' : ''}.`,
            });
        },
    });

    const bulkDelete = useMutation<unknown, Error, string[]>({
        mutationFn: async (ids) => {
            if (!apiClient) throw new Error('API client not available');
            const response = await axios.delete(`${apiClient.baseURL}/leads/bulk`, {
                data: { ids },
            });
            return response.data;
        },
        onSuccess: (_data, ids) => {
            void queryClient.invalidateQueries({ queryKey: ['leads'] });

            // Show success notification
            toast.success('Bulk delete completed', {
                description: `Successfully deleted ${ids.length} lead${ids.length > 1 ? 's' : ''}.`,
            });
        },
        onError: (err: Error, ids) => {
            // Show error notification
            toast.error('Bulk delete failed', {
                description: err.message || `Failed to delete ${ids.length} lead${ids.length > 1 ? 's' : ''}.`,
            });
        },
    });

    return {
        bulkUpdate,
        bulkDelete,
    };
}

// CREATE COMMENT MUTATION
export function useCreateComment(leadId: string | null) {
    const apiClient = useApiClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: { description: string; metadata?: { mentions?: Array<{ user_id: number; name: string }>; task_refs?: Array<{ task_id: string; title: string }> } }) => {
            if (!leadId || !apiClient) throw new Error('Lead ID and API client required');

            const response = await axios.post(`${apiClient.baseURL}/lead-activities`, {
                lead_id: leadId,
                type: 'comment',
                description: payload.description,
                metadata: payload.metadata,
            });
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-activities', 'comments', leadId] });
            void queryClient.invalidateQueries({ queryKey: ['lead-activities', 'all', leadId] });
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error('Failed to post comment', {
                description: axiosError.response?.data?.message || err.message,
            });
        },
    });
}

// INFINITE LEAD ACTIVITIES HOOKS - SEPARATE FOR COMMENTS AND ALL ACTIVITIES
export function useInfiniteLeadComments(leadId: string | null) {
    const apiClient = useApiClient();

    const queryKey = useMemo(() => ['lead-activities', 'comments', leadId], [leadId]);

    return useInfiniteQuery({
        queryKey,
        queryFn: async ({ pageParam = 1 }) => {
            if (!leadId || !apiClient) throw new Error('Lead ID and API client required');

            const response = await axios.get(`${apiClient.baseURL}/lead-activities`, {
                params: {
                    lead_id: leadId,
                    page: pageParam,
                    per_page: 10,
                    type: 'comment',
                },
            });
            return response.data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const meta = lastPage?.meta;
            if (!meta) return undefined;

            if (meta.current_page < meta.last_page) {
                return meta.current_page + 1;
            }
            return undefined;
        },
        enabled: !!leadId && !!apiClient,
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        refetchOnWindowFocus: false,
        retry: (failureCount, error: Error) => {
            const httpError = error as Error & { status?: number };
            if (httpError?.status && httpError.status >= 400 && httpError.status < 500) return false;
            return failureCount < 2;
        },
    });
}

export function useInfiniteLeadAllActivities(leadId: string | null) {
    const apiClient = useApiClient();

    const queryKey = useMemo(() => ['lead-activities', 'all', leadId], [leadId]);

    return useInfiniteQuery({
        queryKey,
        queryFn: async ({ pageParam = 1 }) => {
            if (!leadId || !apiClient) throw new Error('Lead ID and API client required');

            const response = await axios.get(`${apiClient.baseURL}/lead-activities`, {
                params: {
                    lead_id: leadId,
                    page: pageParam,
                    per_page: 10,
                },
            });
            return response.data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const meta = lastPage?.meta;
            if (!meta) return undefined;

            if (meta.current_page < meta.last_page) {
                return meta.current_page + 1;
            }
            return undefined;
        },
        enabled: !!leadId && !!apiClient,
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        refetchOnWindowFocus: false,
        retry: (failureCount, error: Error) => {
            const httpError = error as Error & { status?: number };
            if (httpError?.status && httpError.status >= 400 && httpError.status < 500) return false;
            return failureCount < 2;
        },
    });
}

// LEAD NOTES - Fetch notes (type='note') with pagination
export function useLeadNotes(leadId: string | null, page: number = 1, perPage: number = 12) {
    const apiClient = useApiClient();

    return useQuery({
        queryKey: ['lead-notes', leadId, page, perPage],
        queryFn: async () => {
            if (!leadId || !apiClient) throw new Error('Lead ID and API client required');

            const response = await axios.get(`${apiClient.baseURL}/lead-activities`, {
                params: {
                    lead_id: leadId,
                    type: 'note',
                    exclude_system: 1,
                    page,
                    per_page: perPage,
                },
            });
            return response.data;
        },
        enabled: !!leadId && !!apiClient,
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        refetchOnWindowFocus: false,
    });
}

// LEAD ACTIVITIES - Latest 5 for overview
export function useLeadActivitiesLatest(leadId: string | null, limit: number = 5) {
    const apiClient = useApiClient();

    return useQuery({
        queryKey: ['lead-activities', 'latest', leadId, limit],
        queryFn: async () => {
            if (!leadId || !apiClient) throw new Error('Lead ID and API client required');

            const response = await axios.get(`${apiClient.baseURL}/lead-activities`, {
                params: {
                    lead_id: leadId,
                    per_page: limit,
                    page: 1,
                },
            });
            return response.data;
        },
        enabled: !!leadId && !!apiClient,
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        refetchOnWindowFocus: false,
        select: (data) => data?.data || [],
    });
}

// LEAD ACTIVITIES - Month summary with server-side pagination
export interface MonthGroup {
    month: string;
    month_label: string;
    total: number;
    loaded: number;
    has_more: boolean;
    activities: LeadActivity[];
}

export interface MonthSummaryResponse {
    data: MonthGroup[];
    meta: {
        total_months: number;
        total_activities: number;
    };
}

export function useLeadActivitiesMonthSummary(leadId: string | null, perMonth: number = 5) {
    const apiClient = useApiClient();

    return useQuery<MonthSummaryResponse>({
        queryKey: ['lead-activities', 'month-summary', leadId, perMonth],
        queryFn: async () => {
            if (!leadId || !apiClient) throw new Error('Lead ID and API client required');

            const response = await axios.get(`${apiClient.baseURL}/leads/${leadId}/activities/month-summary`, {
                params: { per_month: perMonth },
            });
            return response.data;
        },
        enabled: !!leadId && !!apiClient,
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        refetchOnWindowFocus: false,
    });
}

// Fetch more activities for a specific month
export function useLoadMoreMonthActivities(leadId: string | null) {
    const apiClient = useApiClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ month, page }: { month: string; page: number }) => {
            if (!leadId || !apiClient) throw new Error('Lead ID and API client required');

            const response = await axios.get(`${apiClient.baseURL}/lead-activities`, {
                params: {
                    lead_id: leadId,
                    month,
                    page,
                    per_page: 5,
                },
            });
            return { month, data: response.data };
        },
        onSuccess: () => {
            // Invalidate to refresh the month summary
            void queryClient.invalidateQueries({ queryKey: ['lead-activities', 'month-summary', leadId] });
        },
    });
}

// LEAD FILES - Fetch, upload, delete files via Spatie Media Library
export interface LeadFile {
    id: number;
    name: string;
    file_name: string;
    mime_type: string;
    size: number;
    human_readable_size: string;
    url: string;
    thumb_url: string | null;
    created_at: string;
    custom_properties: {
        uploaded_by?: number;
        uploaded_by_name?: string;
        folder_id?: number;
    };
    folder_id: number | null;
}

export interface LeadFolder {
    id: number;
    name: string;
    created_at: string;
}

export function useLeadFiles(leadId: string | null) {
    return useQuery<{ data: LeadFile[] }>({
        queryKey: ['lead-files', leadId],
        queryFn: async () => {
            if (!leadId) throw new Error('Lead ID required');
            const response = await axios.get(`/api/leads/${leadId}/files`);
            return response.data;
        },
        enabled: !!leadId,
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useUploadLeadFiles(leadId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ files, folderId }: { files: File[]; folderId?: number | null }) => {
            if (!leadId) throw new Error('Lead ID required');

            const formData = new FormData();
            files.forEach((file) => formData.append('files[]', file));
            if (folderId) {
                formData.append('folder_id', String(folderId));
            }

            const response = await axios.post(`/api/leads/${leadId}/files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-files', leadId] });
            toast.success('Files uploaded successfully');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
            const message = axiosError.response?.data?.message || 'Failed to upload files';
            toast.error(message);
        },
    });
}

export function useRenameLeadFile(leadId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ mediaId, name }: { mediaId: number; name: string }) => {
            if (!leadId) throw new Error('Lead ID required');
            const response = await axios.patch(`/api/leads/${leadId}/files/${mediaId}/rename`, { name });
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-files', leadId] });
            toast.success('File renamed');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to rename file');
        },
    });
}

export function useDeleteLeadFile(leadId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (mediaId: number) => {
            if (!leadId) throw new Error('Lead ID required');
            const response = await axios.delete(`/api/leads/${leadId}/files/${mediaId}`);
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-files', leadId] });
            toast.success('File deleted');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to delete file');
        },
    });
}

// LEAD FOLDERS - Fetch, create, rename, delete folders
export function useLeadFolders(leadId: string | null) {
    return useQuery<{ data: LeadFolder[] }>({
        queryKey: ['lead-folders', leadId],
        queryFn: async () => {
            if (!leadId) throw new Error('Lead ID required');
            const response = await axios.get(`/api/leads/${leadId}/folders`);
            return response.data;
        },
        enabled: !!leadId,
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useCreateLeadFolder(leadId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (name: string) => {
            if (!leadId) throw new Error('Lead ID required');
            const response = await axios.post(`/api/leads/${leadId}/folders`, { name });
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-folders', leadId] });
            toast.success('Folder created');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to create folder');
        },
    });
}

export function useRenameLeadFolder(leadId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ folderId, name }: { folderId: number; name: string }) => {
            if (!leadId) throw new Error('Lead ID required');
            const response = await axios.patch(`/api/leads/${leadId}/folders/${folderId}/rename`, { name });
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-folders', leadId] });
            toast.success('Folder renamed');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to rename folder');
        },
    });
}

export function useDeleteLeadFolder(leadId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (folderId: number) => {
            if (!leadId) throw new Error('Lead ID required');
            const response = await axios.delete(`/api/leads/${leadId}/folders/${folderId}`);
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-folders', leadId] });
            void queryClient.invalidateQueries({ queryKey: ['lead-files', leadId] });
            toast.success('Folder deleted');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to delete folder');
        },
    });
}

export function useMoveFileToFolder(leadId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ mediaId, folderId }: { mediaId: number; folderId: number | null }) => {
            if (!leadId) throw new Error('Lead ID required');
            const response = await axios.patch(`/api/leads/${leadId}/files/${mediaId}/move`, {
                folder_id: folderId,
            });
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-files', leadId] });
            toast.success('File moved');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to move file');
        },
    });
}

// BACKWARD COMPATIBILITY - Keep the original hook for any other components using it
export function useInfiniteLeadActivities(leadId: string | null, filters: { type?: string } = {}) {
    const apiClient = useApiClient();

    const queryKey = useMemo(() => ['lead-activities', leadId, filters], [leadId, filters]);

    return useInfiniteQuery({
        queryKey,
        queryFn: async ({ pageParam = 1 }) => {
            if (!leadId || !apiClient) throw new Error('Lead ID and API client required');

            const cleanFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '' && value !== null),
            );

            const response = await axios.get(`${apiClient.baseURL}/lead-activities`, {
                params: {
                    lead_id: leadId,
                    page: pageParam,
                    per_page: 10,
                    ...cleanFilters,
                },
            });
            return response.data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const meta = lastPage?.meta;
            if (!meta) return undefined;

            if (meta.current_page < meta.last_page) {
                return meta.current_page + 1;
            }
            return undefined;
        },
        enabled: !!leadId && !!apiClient,
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        refetchOnWindowFocus: false,
        retry: (failureCount, error: Error) => {
            const httpError = error as Error & { status?: number };
            if (httpError?.status && httpError.status >= 400 && httpError.status < 500) return false;
            return failureCount < 2;
        },
    });
}
