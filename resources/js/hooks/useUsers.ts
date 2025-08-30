'use client';

import {
    useQuery,
    useQueryClient,
    useMutation,
    useInfiniteQuery,
    keepPreviousData
} from '@tanstack/react-query';
import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { UsersAPI } from '@/lib/api/users';
import { UserFilters, User, UserWithRelations, PaginationMeta, UserSortField } from '@/types/user.d';
import axios from '@/lib/axios';

// STRATEGY 1: Standard Pagination (for lists < 1000 items)
export function useUsers(filters: UserFilters = {}) {
    const apiClient = useApiClient();

    // Create stable query key to prevent unnecessary re-fetches
    const queryKey = useMemo(() => {
        // Only include defined values to prevent cache misses
        const cleanFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        );
        return ['users', cleanFilters];
    }, [filters]);

    return useQuery({
        queryKey,
        queryFn: () => apiClient?.getUsers(filters),
        staleTime: 2 * 60 * 1000, // 2 minutes - increased for large lists
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData, // Keep previous data while loading
        retry: (failureCount, error: any) => {
            if (error?.status >= 400 && error?.status < 500) return false;
            return failureCount < 2; // Reduced retry count for faster feedback
        },
        enabled: !!apiClient,
        // Add select to transform data immediately
        select: useCallback((data: any) => ({
            ...data,
            data: data.data || []
        }), [])
    });
}

// STRATEGY 2: Infinite Scrolling (for lists 1000-10000 items)
export function useInfiniteUsers(filters: UserFilters = {}) {
    const apiClient = useApiClient();

    // Remove page from filters since infinite query handles pagination
    const { page, ...infiniteFilters } = filters;

    const queryKey = useMemo(() => {
        const cleanFilters = Object.fromEntries(
            Object.entries(infiniteFilters).filter(([_, value]) => value !== undefined && value !== '')
        );
        return ['users', 'infinite', cleanFilters];
    }, [infiniteFilters]);

    return useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam = 1 }) => apiClient?.getUsers({ ...infiniteFilters, page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const meta = lastPage?.meta;
            if (meta && meta.has_more && meta.current_page < meta.last_page) {
                return meta.current_page + 1;
            }
            return undefined;
        },
        getPreviousPageParam: (firstPage) => {
            const meta = firstPage?.meta;
            if (meta && meta.current_page > 1) {
                return meta.current_page - 1;
            }
            return undefined;
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        enabled: !!apiClient,
        select: useCallback((data: any) => {
            const allUsers = data.pages.flatMap((page: any) => page.data || []);
            const lastPage = data.pages[data.pages.length - 1];
            return {
                data: allUsers,
                meta: lastPage?.meta,
                hasNextPage: data.hasNextPage,
                isFetchingNextPage: data.isFetchingNextPage
            };
        }, [])
    });
}

// STRATEGY 3: Windowed/Virtual Scrolling (for lists > 10000 items)
export function useVirtualizedUsers(filters: UserFilters = {}) {
    const { data, ...rest } = useInfiniteUsers(filters);

    // Memoize the flat data array to prevent unnecessary re-renders
    const virtualizedData = useMemo(() => {
        return {
            items: data?.data || [],
            totalCount: data?.meta?.total || 0,
            hasMore: data?.hasNextPage || false,
            isLoading: rest.isFetchingNextPage
        };
    }, [data?.data, data?.meta?.total, data?.hasNextPage, rest.isFetchingNextPage]);

    return {
        ...rest,
        ...virtualizedData
    };
}

// OPTIMIZED FILTER MANAGEMENT
export const useOptimizedUserFilters = (initialFilters: UserFilters = {}) => {
    const [filters, setFilters] = useState<UserFilters>(() => ({
        page: 1,
        per_page: 50,
        sort_by: 'created_at',
        sort_order: 'desc',
        ...initialFilters
    }));

    const updatePage = useCallback((page: number) => {
        setFilters(prev => ({ ...prev, page }));
    }, []);

    const updateFilters = useCallback((newFilters: Partial<UserFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters, page: newFilters.page ?? 1 }));
    }, []);

    const updateSearch = useCallback((search: string) => {
        setFilters(prev => ({ ...prev, search, page: 1 }));
    }, []);

    const updateSort = useCallback((sort_by: UserSortField, sort_order: 'asc' | 'desc' = 'desc') => {
        setFilters(prev => ({ ...prev, sort_by, sort_order, page: 1 }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({
            page: 1,
            per_page: 50,
            sort_by: 'created_at',
            sort_order: 'desc'
        });
    }, []);

    return {
        filters,
        updateFilters,
        updatePage,
        updateSearch,
        updateSort,
        resetFilters
    };
};

// DEBOUNCED SEARCH HOOK
export function useDebouncedSearch(initialValue = '', delay = 500) {
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

    return [searchValue, debouncedValue, setSearchValue] as const;
}

// SELECTION MANAGEMENT FOR LARGE LISTS
export const useOptimizedUserSelection = () => {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const toggleItem = useCallback((id: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    }, []);

    const toggleAll = useCallback((users: UserWithRelations[]) => {
        setSelectedItems(prev =>
            prev.size === users.length ? new Set() : new Set(users.map(user => user.id))
        );
    }, []);

    const selectMultiple = useCallback((ids: string[]) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            ids.forEach(id => newSet.add(id));
            return newSet;
        });
    }, []);

    const deselectMultiple = useCallback((ids: string[]) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            ids.forEach(id => newSet.delete(id));
            return newSet;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedItems(new Set());
    }, []);

    const isSelected = useCallback((id: string) => selectedItems.has(id), [selectedItems]);

    const getSelectedUsers = useCallback((users: UserWithRelations[]) => {
        return users.filter(user => selectedItems.has(user.id));
    }, [selectedItems]);

    return {
        selectedItems,
        toggleItem,
        toggleAll,
        selectMultiple,
        deselectMultiple,
        clearSelection,
        isSelected,
        getSelectedUsers,
        selectedCount: selectedItems.size,
        hasSelection: selectedItems.size > 0
    };
};

// PERFORMANCE MONITORING HOOK
export function usePerformanceMonitor(componentName: string, enabled = import.meta.env.VITE_APP_ENV === 'development') {
    const renderCount = useRef(0);
    const lastRenderTime = useRef(Date.now());

    if (enabled) {
        renderCount.current += 1;
        const now = Date.now();
        const timeSinceLastRender = now - lastRenderTime.current;

        if (renderCount.current % 10 === 0) {
            console.log(`${componentName} render #${renderCount.current}, avg time: ${timeSinceLastRender}ms`);
        }

        lastRenderTime.current = now;
    }

    return renderCount.current;
}

// PREFETCHING STRATEGIES
export function useUserPrefetchStrategies(filters: UserFilters) {
    const queryClient = useQueryClient();
    const apiClient = useApiClient();

    // Prefetch next page
    const prefetchNext = useCallback(() => {
        if (apiClient) {
            const nextPageFilters = { ...filters, page: (filters.page || 1) + 1 };
            queryClient.prefetchQuery({
                queryKey: ['users', nextPageFilters],
                queryFn: () => apiClient.getUsers(nextPageFilters),
                staleTime: 5 * 60 * 1000
            });
        }
    }, [queryClient, apiClient, filters]);

    // Prefetch previous page
    const prefetchPrevious = useCallback(() => {
        if (apiClient && (filters.page || 1) > 1) {
            const prevPageFilters = { ...filters, page: (filters.page || 1) - 1 };
            queryClient.prefetchQuery({
                queryKey: ['users', prevPageFilters],
                queryFn: () => apiClient.getUsers(prevPageFilters),
                staleTime: 5 * 60 * 1000
            });
        }
    }, [queryClient, apiClient, filters]);

    // Prefetch user details
    const prefetchUserDetails = useCallback((userId: number) => {
        if (apiClient) {
            queryClient.prefetchQuery({
                queryKey: ['users', userId],
                queryFn: () => apiClient.getUser(userId),
                staleTime: 10 * 60 * 1000
            });
        }
    }, [queryClient, apiClient]);

    // Prefetch user services
    const prefetchUserServices = useCallback((userId: number) => {
        if (apiClient) {
            queryClient.prefetchQuery({
                queryKey: ['users', userId, 'services'],
                queryFn: () => apiClient.getUserServices(userId),
                staleTime: 5 * 60 * 1000
            });
        }
    }, [queryClient, apiClient]);

    // Intelligent prefetching based on user behavior
    const intelligentPrefetch = useCallback((direction: 'next' | 'prev' | 'both' = 'next') => {
        if (direction === 'next' || direction === 'both') {
            prefetchNext();
        }
        if (direction === 'prev' || direction === 'both') {
            prefetchPrevious();
        }
    }, [prefetchNext, prefetchPrevious]);

    return {
        prefetchNext,
        prefetchPrevious,
        prefetchUserDetails,
        prefetchUserServices,
        intelligentPrefetch
    };
}

// USER STATISTICS HOOK
export function useUserStats(filters: UserFilters = {}) {
    const apiClient = useApiClient();

    const queryKey = useMemo(() => {
        const cleanFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        );
        return ['users', 'stats', cleanFilters];
    }, [filters]);

    return useQuery({
        queryKey,
        queryFn: () => apiClient?.getUserStats(filters),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        enabled: !!apiClient,
    });
}

// SINGLE USER HOOK
export function useUser(userId: number) {
    const apiClient = useApiClient();

    return useQuery({
        queryKey: ['users', userId],
        queryFn: () => apiClient?.getUser(userId),
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        enabled: !!apiClient && !!userId,
    });
}

// USER SERVICES HOOK
export function useUserServices(userId: number) {
    const apiClient = useApiClient();

    return useQuery({
        queryKey: ['users', userId, 'services'],
        queryFn: () => apiClient?.getUserServices(userId),
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        enabled: !!apiClient && !!userId,
    });
}

// MAIN HOOK SELECTOR BASED ON LIST SIZE
export function useAdaptiveUsers(
    filters: UserFilters = {},
    strategy: 'standard' | 'infinite' | 'virtual' = 'standard'
) {
    const standardQuery = useUsers(filters);
    const infiniteQuery = useInfiniteUsers(filters);
    const virtualQuery = useVirtualizedUsers(filters);

    switch (strategy) {
        case 'infinite':
            return {
                ...infiniteQuery,
                users: infiniteQuery.data?.data || [] as UserWithRelations[],
                meta: infiniteQuery.data?.meta as PaginationMeta
            };
        case 'virtual':
            return {
                ...virtualQuery,
                users: virtualQuery.items as UserWithRelations[],
                meta: { total: virtualQuery.totalCount } as PaginationMeta
            };
        default:
            return {
                ...standardQuery,
                users: standardQuery.data?.data || [] as UserWithRelations[],
                meta: standardQuery.data?.meta as PaginationMeta
            };
    }
}

// API CLIENT HOOK
export function useApiClient() {

    return useMemo(() => {
        const baseURL = window.location.origin;
        return new UsersAPI(baseURL);
    }, []);
}

// OPTIMISTIC UPDATES FOR LARGE LISTS
export function useOptimisticUserUpdate() {
    const queryClient = useQueryClient();
    const apiClient = useApiClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<User> }) => {
            const response = await axios.patch(
                `${apiClient?.baseURL}/users/${id}`,
                updates
            );
            return response.data;
        },
        onMutate: async ({ id, updates }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['users'] });

            // Get all current user queries
            const previousData = queryClient.getQueriesData({ queryKey: ['users'] });

            // Optimistically update all queries that contain this user
            queryClient.setQueriesData(
                { queryKey: ['users'] },
                (oldData: any) => {
                    if (!oldData) return oldData;

                    // Handle different data structures (standard vs infinite)
                    if (oldData.pages) {
                        // Infinite query structure
                        return {
                            ...oldData,
                            pages: oldData.pages.map((page: any) => ({
                                ...page,
                                data: page.data?.map((user: UserWithRelations) =>
                                    user.id === id ? { ...user, ...updates } : user
                                )
                            }))
                        };
                    } else if (oldData.data) {
                        // Standard query structure
                        return {
                            ...oldData,
                            data: oldData.data.map((user: UserWithRelations) =>
                                user.id === id ? { ...user, ...updates } : user
                            )
                        };
                    }

                    return oldData;
                }
            );

            // Also update single user cache
            queryClient.setQueryData(['users', id], (oldData: any) => {
                return oldData ? { ...oldData, ...updates } : oldData;
            });

            return { previousData };
        },
        onError: (err, variables, context) => {
            // Rollback optimistic updates
            if (context?.previousData) {
                context.previousData.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },
        onSettled: () => {
            // Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

// SERVICE ASSIGNMENT MUTATIONS
export function useUserServiceMutations() {
    const queryClient = useQueryClient();
    const apiClient = useApiClient();

    const assignService = useMutation({
        mutationFn: async ({ userId, serviceId, data }: {
            userId: number;
            serviceId: number;
            data: any
        }) => {
            return apiClient?.assignUserToService(userId, serviceId, data);
        },
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: ['users', userId, 'services'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const unassignService = useMutation({
        mutationFn: async ({ userId, serviceId }: { userId: number; serviceId: number }) => {
            return apiClient?.unassignUserFromService(userId, serviceId);
        },
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: ['users', userId, 'services'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const updateServiceAssignment = useMutation({
        mutationFn: async ({ userId, serviceId, data }: {
            userId: number;
            serviceId: number;
            data: any
        }) => {
            return apiClient?.updateUserServiceAssignment(userId, serviceId, data);
        },
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: ['users', userId, 'services'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    return {
        assignService,
        unassignService,
        updateServiceAssignment
    };
}

// BULK OPERATIONS HOOK
export function useBulkUserOperations() {
    const queryClient = useQueryClient();
    const apiClient = useApiClient();

    const bulkAssignServices = useMutation({
        mutationFn: async ({ userIds, serviceIds, data }: {
            userIds: number[];
            serviceIds: number[];
            data?: any
        }) => {
            return apiClient?.bulkAssignServices(userIds, serviceIds, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const bulkUpdateUsers = useMutation({
        mutationFn: async ({ userIds, updates }: {
            userIds: number[];
            updates: Partial<User>
        }) => {
            return apiClient?.bulkUpdateUsers(userIds, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const bulkDeleteUsers = useMutation({
        mutationFn: async (userIds: number[]) => {
            return apiClient?.bulkDeleteUsers(userIds);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    return {
        bulkAssignServices,
        bulkUpdateUsers,
        bulkDeleteUsers
    };
}
