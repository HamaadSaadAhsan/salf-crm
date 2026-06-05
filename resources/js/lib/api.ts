import axios from '@/lib/http';

class ApiClient {
    async get<T = unknown>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
        const url = `${endpoint}`;
        const response = await axios.get<T>(url, { params });
        return response.data;
    }

    async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
        const url = `${endpoint}`;
        const response = await axios.post<T>(url, data);
        return response.data;
    }

    async put<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
        const url = `${endpoint}`;
        const response = await axios.put<T>(url, data);
        return response.data;
    }

    async delete<T = unknown>(endpoint: string): Promise<T> {
        const url = `${endpoint}`;
        const response = await axios.delete<T>(url);
        return response.data;
    }
}

export const api = new ApiClient();

// Helper functions for specific endpoints
export const authApi = {
    getCalls: () => api.get('/calls'),
    createCall: (callData: any) => api.post('/calls', callData),
    updateCall: (id: string, data: any) => api.put(`/calls/${id}`, data),
    getContacts: () => api.get('/contacts'),
    createContact: (contactData: any) => api.post('/contacts', contactData),
    getUsers: (userData: any) => api.get('/contacts', userData),
    getServices: (filters?: any) => api.get('/services', filters),
    getService: (id: number) => api.get(`/services/${id}`),
    createService: (data: any) => api.post('/services', data),
    updateService: (id: number, data: any) => api.put(`/services/${id}`, data),
    deleteService: (id: number) => api.delete(`/services/${id}`),
    getStatuses: (filters?: any) => api.get('/statuses', filters),
    getStatus: (id: number) => api.get(`/statuses/${id}`),
    createStatus: (data: any) => api.post('/statuses', data),
    updateStatus: (id: number, data: any) => api.put(`/statuses/${id}`, data),
    deleteStatus: (id: number) => api.delete(`/statuses/${id}`),
};
