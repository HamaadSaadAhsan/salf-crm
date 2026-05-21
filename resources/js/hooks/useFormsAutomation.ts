import axios from '@/lib/http';
import { router } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ───────────────────────────── Program schema ─────────────────────────────

export interface SchemaField {
    path: string;
    key: string;
    label: string;
}

export interface SchemaSection {
    key: string;
    label: string;
    fields: SchemaField[];
}

export interface ProgramSchema {
    sections: SchemaSection[];
    has_mappings: boolean;
}

export function useProgramSchema(programId: number | null) {
    return useQuery<ProgramSchema>({
        queryKey: ['forms-program-schema', programId],
        queryFn: async () => {
            const response = await axios.get(`/api/forms/programs/${programId}/schema`);
            return response.data;
        },
        enabled: !!programId,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

// ───────────────────────────── Template page preview ─────────────────────────────

export function useTemplatePage(templateId: number | null, page: number | null) {
    return useQuery<string>({
        queryKey: ['forms-template-page', templateId, page],
        queryFn: async () => {
            const response = await axios.get(`/api/forms/templates/${templateId}/pages/${page}`, {
                responseType: 'blob',
            });
            return URL.createObjectURL(response.data as Blob);
        },
        enabled: !!templateId && !!page,
        staleTime: 60 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

// ───────────────────────────── Templates ─────────────────────────────

export function useSyncInventory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (templateId: number) => {
            const response = await axios.post(`/api/forms/templates/${templateId}/sync`);
            return response.data;
        },
        onSuccess: (data) => {
            void queryClient.invalidateQueries({ queryKey: ['forms-programs'] });
            toast.success(data.message ?? 'Inventory synced successfully');
        },
        onError: (err: Error & { response?: { data?: { error?: string } } }) => {
            toast.error(err.response?.data?.error ?? 'Failed to sync inventory');
        },
    });
}

export interface FieldMappingRow {
    field_name: string;
    field_type: string;
    page: number | null;
    export_values: string[] | null;
    canonical_path: string;
    value_for_truthy: string;
    transform: string;
    notes: string;
}

export function useGetMappings(templateId: number) {
    return useQuery<{ data: FieldMappingRow[] }>({
        queryKey: ['forms-mappings', templateId],
        queryFn: async () => {
            const response = await axios.get(`/api/forms/templates/${templateId}/mappings`);
            return response.data;
        },
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

export function useSaveMappings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ templateId, mappings }: { templateId: number; mappings: FieldMappingRow[] }) => {
            const response = await axios.put(`/api/forms/templates/${templateId}/mappings`, { mappings });
            return response.data;
        },
        onSuccess: (data, variables) => {
            void queryClient.invalidateQueries({ queryKey: ['forms-mappings', variables.templateId] });
            void queryClient.invalidateQueries({ queryKey: ['forms-programs'] });
            toast.success(data.message ?? 'Mappings saved');
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            toast.error(err.response?.data?.message ?? 'Failed to save mappings');
        },
    });
}

// ───────────────────────────── Applications ─────────────────────────────

export function useCreateApplication() {
    return useMutation({
        mutationFn: async (data: {
            program_id: number;
            main_applicant_name?: string;
            main_applicant_passport?: string;
            data: Record<string, unknown>;
        }) => {
            const response = await axios.post('/api/forms/applications', data);
            return response.data;
        },
        onSuccess: (data) => {
            toast.success('Application created');
            if (data.redirect) {
                router.visit(data.redirect as string);
            }
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            toast.error(err.response?.data?.message ?? 'Failed to create application');
        },
    });
}

export function useUpdateApplication() {
    return useMutation({
        mutationFn: async ({
            applicationId,
            ...payload
        }: {
            applicationId: number;
            main_applicant_name?: string;
            main_applicant_passport?: string;
            data?: Record<string, unknown>;
            status?: string;
        }) => {
            const response = await axios.put(`/api/forms/applications/${applicationId}`, payload);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Application updated');
            router.reload();
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            toast.error(err.response?.data?.message ?? 'Failed to update application');
        },
    });
}

export function useDeleteApplication() {
    return useMutation({
        mutationFn: async (applicationId: number) => {
            const response = await axios.delete(`/api/forms/applications/${applicationId}`);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Application deleted');
            router.visit('/settings/management/forms/applications');
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            toast.error(err.response?.data?.message ?? 'Failed to delete application');
        },
    });
}

export function useGenerateApplicationForms() {
    return useMutation({
        mutationFn: async (applicationId: number) => {
            const response = await axios.post(`/api/forms/applications/${applicationId}/generate`);
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(data.message ?? 'Generation queued');
            router.reload();
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            toast.error(err.response?.data?.message ?? 'Failed to queue generation');
        },
    });
}

export interface Generation {
    id: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    file_count: number;
    output_path: string | null;
    generation_log: Array<{ template_code: string; status: string; filled_field_count?: number; error?: string }> | null;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    generated_by: { id: number; name: string } | null;
}

export function useApplicationGenerations(applicationId: number, enabled = true) {
    return useQuery<{ data: Generation[] }>({
        queryKey: ['forms-generations', applicationId],
        queryFn: async () => {
            const response = await axios.get(`/api/forms/applications/${applicationId}/generations`);
            return response.data;
        },
        enabled,
        staleTime: 10_000,
        refetchInterval: (query) => {
            const data = query.state.data as { data: Generation[] } | undefined;
            const hasRunning = data?.data?.some((g) => g.status === 'pending' || g.status === 'running');
            return hasRunning ? 5000 : false;
        },
    });
}
