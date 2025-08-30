// Inertia v2 Compatible VirtualizedLeadsList Component
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { FixedSizeList as List, ListChildComponentProps } from "react-window"
import InfiniteLoader from "react-window-infinite-loader"
import AutoSizer from "react-virtualized-auto-sizer"
import { Loader2 } from "lucide-react"

import { useAdaptiveLeads } from "@/hooks/useLead"
import OptimizedLeadRow from "../pages/leads/components/LeadRow"

// Configuration constants
const ITEM_HEIGHT = 50
const OVERSCAN_COUNT = 5
const THRESHOLD = 15 // Increased threshold for better UX

interface VirtualizedLeadsListProps {
  filters: any
  selectedItems: Set<string>
  hoveredLead: string | null
  onToggleItem: (id: string) => void
  onHover: (id: string | null) => void
  onToggleStar: (id: string) => void
  onLeadClick: (id: string) => void
}

// Enhanced virtual row component
const VirtualLeadRow = ({ index, style, data }: ListChildComponentProps) => {
  const {
    leads,
    selectedItems,
    hoveredLead,
    onToggleItem,
    onHover,
    onToggleStar,
    onLeadClick,
    isItemLoaded
  } = data

  // Check if an item is actually loaded (not just marked as loading)
  const isLoaded = isItemLoaded(index)
  const lead = leads[index]

  if (!isLoaded || !lead) {
    // Show loading skeleton for unloaded items
    return (
      <div style={style} className="flex items-center px-4 py-3 border-b">
        <div className="flex space-x-4 animate-pulse w-full">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="w-32 h-4 bg-gray-200 rounded"></div>
          <div className="flex-1 h-4 bg-gray-200 rounded"></div>
          <div className="w-16 h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const rowData = {
    leads,
    selectedLeads: selectedItems,
    hoveredLead,
    onSelectLead: onToggleItem,
    onHoverLead: onHover,
    onToggleStar,
    onLeadClick,
  }

  return (
    <OptimizedLeadRow
      index={index}
      style={style}
      data={rowData}
    />
  )
}

// Fixed the virtualized leads list
export const VirtualizedLeadsList: React.FC<VirtualizedLeadsListProps> = ({
                                                                            filters,
                                                                            selectedItems,
                                                                            hoveredLead,
                                                                            onToggleItem,
                                                                            onHover,
                                                                            onToggleStar,
                                                                            onLeadClick,
                                                                          }) => {
  // Use infinite strategy specifically for virtual scrolling
  const {
    leads,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    error
  } = useAdaptiveLeads(filters, 'infinite')

  // Track loading states properly
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const infiniteLoaderRef = useRef<InfiniteLoader>(null)

  // Calculate total item count correctly
  const itemCount = useMemo(() => {
    const currentCount = leads.length
    // If we have more pages, add buffer items for smooth scrolling
    return hasNextPage ? currentCount + 20 : currentCount
  }, [leads.length, hasNextPage])

  // Fixed: Only consider items loaded if they actually exist in the lead array
  const isItemLoaded = useCallback((index: number) => {
    return index < leads.length && !!leads[index]
  }, [leads])

  // Fixed: Proper load more implementation
  const loadMoreItems = useCallback(async (startIndex: number, stopIndex: number) => {
    // Prevent multiple simultaneous loads
    if (isLoadingMore || isFetching || !hasNextPage) {
      return Promise.resolve()
    }

    console.log(`Loading items ${startIndex}-${stopIndex}, current leads: ${leads.length}`)

    setIsLoadingMore(true)

    try {
      if (fetchNextPage) {
        await fetchNextPage()
      }
    } catch (error) {
      console.error('Failed to load more items:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, isFetching, hasNextPage, fetchNextPage, leads.length])

  // Reset infinite loader when filters change
  useEffect(() => {
    if (infiniteLoaderRef.current) {
      infiniteLoaderRef.current.resetloadMoreItemsCache()
    }
  }, [filters])

  // Memoize the data passed to each row
  const itemData = useMemo(() => ({
    leads,
    selectedItems,
    hoveredLead,
    onToggleItem,
    onHover,
    onToggleStar,
    onLeadClick,
    isItemLoaded
  }), [
    leads,
    selectedItems,
    hoveredLead,
    onToggleItem,
    onHover,
    onToggleStar,
    onLeadClick,
    isItemLoaded
  ])

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <span>Error loading leads: {error.message}</span>
      </div>
    )
  }

  // Initial loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading leads...</span>
      </div>
    )
  }

  // Empty state
  if (itemCount === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No leads found
      </div>
    )
  }

  return (
    <div className="h-screen w-full relative">
      <AutoSizer>
        {({ height, width }) => (
          <InfiniteLoader
            ref={infiniteLoaderRef}
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={loadMoreItems}
            threshold={THRESHOLD}
            minimumBatchSize={20} // Load in batches of 20
          >
            {({ onItemsRendered, ref }) => (
              <List
                ref={ref}
                height={height}
                width={width}
                itemCount={itemCount}
                itemSize={ITEM_HEIGHT}
                itemData={itemData}
                onItemsRendered={onItemsRendered}
                overscanCount={OVERSCAN_COUNT}
                className="virtual-scroll-container"
              >
                {VirtualLeadRow}
              </List>
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>

      {/* Loading indicator */}
      {(isFetching || isLoadingMore) && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center py-2 backdrop-blur-sm border-t">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm ">Loading more leads...</span>
        </div>
      )}
    </div>
  )
}

// Fixed Smart leads list with better strategy selection
interface SmartLeadsListProps {
  filters: any
  selectedItems: Set<string>
  hoveredLead: string | null
  onToggleItem: (id: string) => void
  onHover: (id: string | null) => void
  onToggleStar: (id: string) => void
  onLeadClick: (id: string) => void
}

export const SmartLeadsList: React.FC<SmartLeadsListProps> = (props) => {
  // Always use virtualized component for SmartLeadsList
  return <VirtualizedLeadsList {...props} />
}

export default VirtualizedLeadsList

// Additional fix: Update the useInfiniteLeads hook to handle the data structure better
// Add this to your useLead.ts file:

/*
export function useInfiniteLeads(filters: LeadFilters = {}) {
    const apiClient = useApiClient();
    const { page, ...infiniteFilters } = filters;

    const queryKey = useMemo(() => createStableInfiniteQueryKey(filters), [filters]);

    const query = useInfiniteQuery({
        queryKey,
        queryFn: async ({ pageParam = 1 }) => {
            if (!apiClient) throw new Error('API client not available');
            console.log(`Fetching page ${pageParam} with filters:`, infiniteFilters);
            const result = await apiClient.getLeads({ ...infiniteFilters, page: pageParam });
            console.log(`Received ${result.data?.length || 0} leads for page ${pageParam}`);
            return result;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const meta = lastPage?.meta;
            console.log('getNextPageParam:', meta);
            if (meta?.has_more && meta.current_page < meta.last_page) {
                return meta.current_page + 1;
            }
            return undefined;
        },
        getPreviousPageParam: (firstPage) => {
            const meta = firstPage?.meta;
            if (!meta) return undefined;
            if (meta?.current_page > 1) {
                return meta.current_page - 1;
            }
            return undefined;
        },
        staleTime: INFINITE_STALE_TIME,
        gcTime: INFINITE_GC_TIME,
        enabled: !!apiClient,
        refetchOnWindowFocus: false,
        // Fixed: Better data transformation
        select: useCallback((data: any) => {
            console.log('select callback - data.pages:', data.pages.length);
            const allLeads = data.pages.flatMap((page: any) => page?.data || []);
            const lastPage = data.pages[data.pages.length - 1];
            console.log(`Total leads after select: ${allLeads.length}`);
            return {
                data: allLeads,
                meta: lastPage?.meta,
                hasNextPage: !!data.hasNextPage,
                isFetchingNextPage: data.isFetchingNextPage,
                pages: data.pages
            };
        }, []),
        maxPages: 20, // Increased from 10
        networkMode: 'online',
    });

    return query;
}
*/
