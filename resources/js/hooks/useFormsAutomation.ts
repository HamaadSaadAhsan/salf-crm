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
            const response = await axios.get<ProgramSchema>(`/api/forms/programs/${programId}/schema`);
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
            // Use native fetch — the custom http client always calls response.json(), which
            // fails on binary PNG responses. We need response.blob() here.
            const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
            const csrfToken = match ? decodeURIComponent(match[1]) : '';

            const res = await fetch(`/api/forms/templates/${templateId}/pages/${page}`, {
                credentials: 'include',
                headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': csrfToken },
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const blob = await res.blob();
            return URL.createObjectURL(blob);
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
            const response = await axios.post<{ message?: string }>(`/api/forms/templates/${templateId}/sync`);
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
    is_suggested?: boolean;
}

export function useGetMappings(templateId: number) {
    return useQuery<{ data: FieldMappingRow[] }>({
        queryKey: ['forms-mappings', templateId],
        queryFn: async () => {
            const response = await axios.get<{ data: FieldMappingRow[] }>(`/api/forms/templates/${templateId}/mappings`);
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
            const response = await axios.put<{ message?: string }>(`/api/forms/templates/${templateId}/mappings`, { mappings });
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
            const response = await axios.post<{ redirect?: string }>('/api/forms/applications', data);
            return response.data;
        },
        onSuccess: (data) => {
            toast.success('Application created');
            if (data.redirect) {
                router.visit(data.redirect);
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
            const response = await axios.put<{ message?: string }>(`/api/forms/applications/${applicationId}`, payload);
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
            const response = await axios.delete<{ message?: string }>(`/api/forms/applications/${applicationId}`);
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
            const response = await axios.post<{ message?: string }>(`/api/forms/applications/${applicationId}/generate`);
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
            const response = await axios.get<{ data: Generation[] }>(`/api/forms/applications/${applicationId}/generations`);
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

// ───────────────────────────── Lead-scoped hooks ─────────────────────────────

export interface LeadProgram {
    id: number;
    name: string;
    code: string;
    country_code: string | null;
}

export interface LeadApplication {
    id: number;
    application_code: string;
    status: string;
    main_applicant_name: string | null;
    main_applicant_passport: string | null;
    data: Record<string, unknown>;
    generations_count: number;
    program: { id: number; name: string; code: string };
    created_at: string;
    updated_at: string;
}

export function useLeadPrograms(leadId: string) {
    return useQuery<{ data: LeadProgram[] }>({
        queryKey: ['lead-forms-programs', leadId],
        queryFn: async () => {
            const response = await axios.get<{ data: LeadProgram[] }>(`/api/leads/${leadId}/forms/programs`);
            return response.data;
        },
        staleTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

export function useLeadApplications(leadId: string) {
    return useQuery<{ data: LeadApplication[] }>({
        queryKey: ['lead-forms-applications', leadId],
        queryFn: async () => {
            const response = await axios.get<{ data: LeadApplication[] }>(`/api/leads/${leadId}/forms/applications`);
            return response.data;
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });
}

export function useCreateLeadApplication(leadId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: {
            program_id: number;
            main_applicant_name?: string;
            main_applicant_passport?: string;
            data: Record<string, unknown>;
        }) => {
            const response = await axios.post<{ data: { id: number; application_code: string } }>(`/api/leads/${leadId}/forms/applications`, payload);
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-forms-applications', leadId] });
            toast.success('Application created');
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            toast.error(err.response?.data?.message ?? 'Failed to create application');
        },
    });
}

export function useUpdateLeadApplication(leadId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ applicationId, ...payload }: { applicationId: number; main_applicant_name?: string; main_applicant_passport?: string; data?: Record<string, unknown>; status?: string }) => {
            const response = await axios.put<{ message?: string }>(`/api/leads/${leadId}/forms/applications/${applicationId}`, payload);
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-forms-applications', leadId] });
            toast.success('Application saved');
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            toast.error(err.response?.data?.message ?? 'Failed to save application');
        },
    });
}

export function useDeleteLeadApplication(leadId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (applicationId: number) => {
            const response = await axios.delete<{ message?: string }>(`/api/leads/${leadId}/forms/applications/${applicationId}`);
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-forms-applications', leadId] });
            toast.success('Application deleted');
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            toast.error(err.response?.data?.message ?? 'Failed to delete application');
        },
    });
}

export function useGenerateLeadApplicationForms(leadId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (applicationId: number) => {
            const response = await axios.post<{ message?: string }>(`/api/leads/${leadId}/forms/applications/${applicationId}/generate`);
            return response.data;
        },
        onSuccess: (data, applicationId) => {
            toast.success(data.message ?? 'Generation queued');
            void queryClient.invalidateQueries({ queryKey: ['lead-forms-generations', applicationId] });
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            toast.error(err.response?.data?.message ?? 'Failed to queue generation');
        },
    });
}

export function useLeadApplicationGenerations(leadId: string, applicationId: number | null, enabled = true) {
    return useQuery<{ data: Generation[] }>({
        queryKey: ['lead-forms-generations', applicationId],
        queryFn: async () => {
            const response = await axios.get<{ data: Generation[] }>(`/api/leads/${leadId}/forms/applications/${applicationId}/generations`);
            return response.data;
        },
        enabled: enabled && !!applicationId,
        staleTime: 10_000,
        refetchInterval: (query) => {
            const data = query.state.data as { data: Generation[] } | undefined;
            const hasRunning = data?.data?.some((g) => g.status === 'pending' || g.status === 'running');
            return hasRunning ? 5000 : false;
        },
    });
}

export function useLeadProgramSchema(leadId: string, programId: number | null) {
    return useQuery<ProgramSchema>({
        queryKey: ['lead-forms-program-schema', leadId, programId],
        queryFn: async () => {
            const response = await axios.get<ProgramSchema>(`/api/forms/programs/${programId}/schema`);
            return response.data;
        },
        enabled: !!programId,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}
