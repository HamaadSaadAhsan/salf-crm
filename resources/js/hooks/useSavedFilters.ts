import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface SavedFilter {
    id: number;
    user_id: number;
    name: string;
    filters: Record<string, unknown>;
    is_default: boolean;
    color: string | null;
    created_at: string;
    updated_at: string;
}

interface SavedFilterPayload {
    name: string;
    filters: Record<string, unknown>;
    is_default?: boolean;
    color?: string | null;
}

const QUERY_KEY = ['saved-filters'];

export function useSavedFilters() {
    return useQuery<SavedFilter[]>({
        queryKey: QUERY_KEY,
        queryFn: () => api.get('/api/saved-filters'),
        staleTime: 5 * 60 * 1000,
    });
}

export function useSaveFilter() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: SavedFilterPayload) => api.post('/api/saved-filters', payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}

export function useUpdateSavedFilter() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...payload }: SavedFilterPayload & { id: number }) =>
            api.put(`/api/saved-filters/${id}`, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}

export function useDeleteSavedFilter() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => api.delete(`/api/saved-filters/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
    });
}
