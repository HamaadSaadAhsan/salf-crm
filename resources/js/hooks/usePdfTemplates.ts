import axios from '@/lib/axios';
import type { LeadPdfSubmission, PdfTemplate, ScannedPdfFieldResponse } from '@/types/pdf-template';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const STALE_TIME = 2 * 60 * 1000;
const GC_TIME = 10 * 60 * 1000;

// =====================
// ADMIN: Template CRUD
// =====================

export function usePdfTemplates() {
    return useQuery<{ data: PdfTemplate[] }>({
        queryKey: ['pdf-templates'],
        queryFn: async () => {
            const response = await axios.get('/api/pdf-templates');
            return response.data;
        },
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useCreatePdfTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await axios.post('/api/pdf-templates', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
            toast.success('Template created successfully');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to create template');
        },
    });
}

export function usePdfTemplate(templateId: number | null) {
    return useQuery<{ data: PdfTemplate }>({
        queryKey: ['pdf-templates', templateId],
        queryFn: async () => {
            const response = await axios.get(`/api/pdf-templates/${templateId}`);
            return response.data;
        },
        enabled: !!templateId,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useUpdatePdfTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: number; name?: string; description?: string; service_id?: number | null; is_active?: boolean }) => {
            const response = await axios.patch(`/api/pdf-templates/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
            toast.success('Template updated successfully');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to update template');
        },
    });
}

export function useDeletePdfTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const response = await axios.delete(`/api/pdf-templates/${id}`);
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
            toast.success('Template deleted successfully');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to delete template');
        },
    });
}

export function useScanPdfTemplate() {
    return useMutation({
        mutationFn: async (templateId: number) => {
            const response = await axios.post<{ data: ScannedPdfFieldResponse }>(`/api/pdf-templates/${templateId}/scan`);
            return response.data.data;
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { error?: string } } };
            toast.error(axiosError.response?.data?.error || 'Failed to scan PDF fields');
        },
    });
}

export function useSavePdfTemplateFields() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ templateId, fields }: { templateId: number; fields: unknown[] }) => {
            const response = await axios.post(`/api/pdf-templates/${templateId}/fields`, { fields });
            return response.data;
        },
        onSuccess: (_data, variables) => {
            void queryClient.invalidateQueries({ queryKey: ['pdf-templates', variables.templateId] });
            void queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
            toast.success('Fields saved successfully');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to save fields');
        },
    });
}

// =====================
// PROCESSING: Lead PDF Submissions
// =====================

export function useLeadPdfTemplates(leadId: string | null) {
    return useQuery<{ data: PdfTemplate[] }>({
        queryKey: ['lead-pdf-templates', leadId],
        queryFn: async () => {
            const response = await axios.get(`/api/leads/${leadId}/pdf-templates`);
            return response.data;
        },
        enabled: !!leadId,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useLeadPdfSubmissions(leadId: string | null) {
    return useQuery<{ data: LeadPdfSubmission[] }>({
        queryKey: ['lead-pdf-submissions', leadId],
        queryFn: async () => {
            const response = await axios.get(`/api/leads/${leadId}/pdf-submissions`);
            return response.data;
        },
        enabled: !!leadId,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useLeadPdfSubmission(leadId: string | null, submissionId: number | null) {
    return useQuery<{ data: LeadPdfSubmission }>({
        queryKey: ['lead-pdf-submissions', leadId, submissionId],
        queryFn: async () => {
            const response = await axios.get(`/api/leads/${leadId}/pdf-submissions/${submissionId}`);
            return response.data;
        },
        enabled: !!leadId && !!submissionId,
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useCreateLeadPdfSubmission(leadId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { pdf_template_id: number; field_values: Record<string, string>; status?: string }) => {
            const response = await axios.post(`/api/leads/${leadId}/pdf-submissions`, data);
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-pdf-submissions', leadId] });
            toast.success('Submission saved');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to save submission');
        },
    });
}

export function useUpdateLeadPdfSubmission(leadId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ submissionId, ...data }: { submissionId: number; field_values: Record<string, string>; status?: string }) => {
            const response = await axios.patch(`/api/leads/${leadId}/pdf-submissions/${submissionId}`, data);
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-pdf-submissions', leadId] });
            toast.success('Submission updated');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to update submission');
        },
    });
}

export function useDeleteLeadPdfSubmission(leadId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (submissionId: number) => {
            const response = await axios.delete(`/api/leads/${leadId}/pdf-submissions/${submissionId}`);
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-pdf-submissions', leadId] });
            toast.success('Submission deleted');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to delete submission');
        },
    });
}
