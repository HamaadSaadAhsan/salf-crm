import axios from '@/lib/http';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const DEFAULT_STALE_TIME = 2 * 60 * 1000;
const DEFAULT_GC_TIME = 10 * 60 * 1000;

export interface StorageAccount {
    id: number;
    provider: string;
    provider_account_email: string;
    provider_account_name: string | null;
    is_active: boolean;
    created_at: string;
}

export interface GoogleDriveFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    iconLink?: string;
    webViewLink?: string;
    thumbnailLink?: string;
    createdTime?: string;
    modifiedTime?: string;
    parents?: string[];
}

export interface LinkedGoogleDriveFile {
    id: number;
    lead_id: string;
    storage_account_id: number;
    google_file_id: string;
    file_name: string;
    mime_type: string | null;
    file_size: number | null;
    icon_link: string | null;
    web_view_link: string | null;
    thumbnail_link: string | null;
    created_at: string;
    storage_account?: {
        id: number;
        provider_account_email: string;
    };
}

export function useStorageAccounts() {
    return useQuery<{ data: StorageAccount[] }>({
        queryKey: ['storage-accounts'],
        queryFn: async () => {
            const response = await axios.get('/api/storage-accounts');
            return response.data;
        },
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useGoogleDriveFiles(
    accountId: number | null,
    folderId: string | null = null,
    query: string | null = null,
) {
    return useQuery<{ files: GoogleDriveFile[]; nextPageToken: string | null }>({
        queryKey: ['google-drive-files', accountId, folderId, query],
        queryFn: async () => {
            if (!accountId) throw new Error('Account ID required');

            const params: Record<string, string> = {};
            if (folderId) params.folder_id = folderId;
            if (query) params.query = query;

            const response = await axios.get(`/api/storage-accounts/${accountId}/files`, { params });
            return response.data;
        },
        enabled: !!accountId,
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useLeadGoogleDriveFiles(leadId: string | null) {
    return useQuery<{ data: LinkedGoogleDriveFile[] }>({
        queryKey: ['lead-google-drive-files', leadId],
        queryFn: async () => {
            if (!leadId) throw new Error('Lead ID required');
            const response = await axios.get(`/api/leads/${leadId}/google-drive-files`);
            return response.data;
        },
        enabled: !!leadId,
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useAttachGoogleDriveFile(leadId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: {
            storage_account_id: number;
            google_file_id: string;
            file_name: string;
            mime_type?: string | null;
            file_size?: number | null;
            icon_link?: string | null;
            web_view_link?: string | null;
            thumbnail_link?: string | null;
        }) => {
            if (!leadId) throw new Error('Lead ID required');
            const response = await axios.post(`/api/leads/${leadId}/google-drive-files`, payload);
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-google-drive-files', leadId] });
            toast.success('Google Drive file linked');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to link file');
        },
    });
}

export function useDetachGoogleDriveFile(leadId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (linkedFileId: number) => {
            if (!leadId) throw new Error('Lead ID required');
            const response = await axios.delete(`/api/leads/${leadId}/google-drive-files/${linkedFileId}`);
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['lead-google-drive-files', leadId] });
            toast.success('Google Drive file removed');
        },
        onError: (err: Error) => {
            const axiosError = err as Error & { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to remove file');
        },
    });
}
