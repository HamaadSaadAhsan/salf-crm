// hooks/useServices.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { authApi } from '@/lib/api'; // adjust import path as needed
import { Service } from '@/types/lead';

// Query keys for better organization
export const serviceKeys = {
  all: ['services'] as const,
  lists: () => [...serviceKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...serviceKeys.lists(), { filters }] as const,
  details: () => [...serviceKeys.all, 'detail'] as const,
  detail: (id: number) => [...serviceKeys.details(), id] as const,
};

export const useServices = (filters?: {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}) => {
  const query = useQuery({
    queryKey: serviceKeys.lists(),
    queryFn: async () => await authApi.getServices(filters),
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
    services: query.data?.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  };
};

// Hook for creating a new service
export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newService: Omit<Service, 'id'>): Promise<Service> => {
      const response = await authApi.createService(newService);
      return response;
    },
    onSuccess: (newService) => {
      // Update the services list in cache
      queryClient.setQueryData<Service[]>(serviceKeys.lists(), (old) => {
        return old ? [...old, newService] : [newService];
      });

      // Or invalidate to refetch
      // queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
    },
    onError: (error) => {
      console.error('Error creating service:', error);
    },
  });
};

// Hook for updating a service
export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Service> & { id: number }): Promise<Service> => {
      const response = await authApi.updateService(id, updateData);
      return response;
    },
    onSuccess: (updatedService) => {
      // Update the specific service in cache
      queryClient.setQueryData<Service[]>(serviceKeys.lists(), (old) => {
        return old?.map(service =>
          service.id === updatedService.id ? updatedService : service
        ) || [];
      });
    },
    onError: (error) => {
      console.error('Error updating service:', error);
    },
  });
};

// Hook for deleting a service
export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: number): Promise<void> => {
      await authApi.deleteService(serviceId);
    },
    onSuccess: (_, serviceId) => {
      // Remove the service from cache
      queryClient.setQueryData<Service[]>(serviceKeys.lists(), (old) => {
        return old?.filter(service => service.id !== serviceId) || [];
      });
    },
    onError: (error) => {
      console.error('Error deleting service:', error);
    },
  });
};

// Hook for getting a single service
export const useService = (serviceId: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: serviceKeys.detail(serviceId),
    queryFn: async (): Promise<Service> => {
      try {
        const response = await authApi.getService(serviceId);
        return response;
      } catch (error) {
        console.error(`Error fetching service ${serviceId}:`, error);
        throw error;
      }
    },
    enabled: (options?.enabled ?? true) && !!serviceId,
    staleTime: 5 * 60 * 1000,
  });
};