// hooks/useStatus.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { authApi } from '@/lib/api'; // adjust import path as needed
import { Status } from '@/types/lead';

// Query keys for better organization
export const statusKeys = {
  all: ['statuses'] as const,
  lists: () => [...statusKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...statusKeys.lists(), { filters }] as const,
  details: () => [...statusKeys.all, 'detail'] as const,
  detail: (id: number) => [...statusKeys.details(), id] as const,
};

export const useStatuses = (filters?: {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}) => {
  const query = useQuery({
    queryKey: statusKeys.lists(),
    queryFn: async () => await authApi.getStatuses(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 2;
    },
    enabled: !!authApi,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    statuses: query.data?.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  };
};

// Hook for creating a new service
export const useCreateStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newStatus: Omit<Status, 'id'>): Promise<Status> => {
      const response = await authApi.createStatus(newStatus);
      return response;
    },
    onSuccess: (newStatus) => {
      // Update the statuses list in cache
      queryClient.setQueryData<Status[]>(statusKeys.lists(), (old) => {
        return old ? [...old, newStatus] : [newStatus];
      });

      // Or invalidate to refetch
      // queryClient.invalidateQueries({ queryKey: statusKeys.lists() });
    },
    onError: (error) => {
      console.error('Error creating status:', error);
    },
  });
};

// Hook for updating a status
export const useUpdateStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Status> & { id: number }): Promise<Status> => {
      const response = await authApi.updateStatus(id, updateData);
      return response;
    },
    onSuccess: (updatedStatus) => {
      // Update the specific status in cache
      queryClient.setQueryData<Status[]>(statusKeys.lists(), (old) => {
        return old?.map(status =>
            status.id === updatedStatus.id ? updatedStatus : status
        ) || [];
      });
    },
    onError: (error) => {
      console.error('Error updating status:', error);
    },
  });
};

// Hook for deleting a status
export const useDeleteStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (statusId: number): Promise<void> => {
      await authApi.deleteStatus(statusId);
    },
    onSuccess: (_, statusId) => {
      // Remove the status from cache
      queryClient.setQueryData<Status[]>(statusKeys.lists(), (old) => {
        return old?.filter(status => status.id !== statusId) || [];
      });
    },
    onError: (error) => {
      console.error('Error deleting status:', error);
    },
  });
};

// Hook for getting a single status
export const useStatus = (statusId: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: statusKeys.detail(statusId),
    queryFn: async (): Promise<Status> => {
      try {
        const response = await authApi.getStatus(statusId);
        return response;
      } catch (error) {
        console.error(`Error fetching status ${statusId}:`, error);
        throw error;
      }
    },
    enabled: (options?.enabled ?? true) && !!statusId,
    staleTime: 5 * 60 * 1000,
  });
};
