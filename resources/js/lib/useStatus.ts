// hooks/useStatus.ts
import { authApi } from '@/lib/api'; // adjust import path as needed
import { SharedData } from '@/types';
import { Status } from '@/types/lead';
import { usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Query keys for better organization
export const statusKeys = {
    all: ['statuses'] as const,
    lists: () => [...statusKeys.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...statusKeys.lists(), { filters }] as const,
    details: () => [...statusKeys.all, 'detail'] as const,
    detail: (id: number) => [...statusKeys.details(), id] as const,
};

export const useStatuses = () => {
    const { statuses } = usePage<SharedData>().props;

    return {
        statuses: statuses || [],
        loading: false,
        error: null,
        refetch: () => {},
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
                return old?.map((status) => (status.id === updatedStatus.id ? updatedStatus : status)) || [];
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
                return old?.filter((status) => status.id !== statusId) || [];
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
