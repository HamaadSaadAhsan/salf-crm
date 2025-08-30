import axios from "@/lib/axios"

class ApiClient {
    async get(endpoint: string, params?: Record<string, string | number | boolean>) {
        const url = `${endpoint}`
        const response = await axios.get(url, { params })
        return response.data
    }

    async post(endpoint: string, data: any) {
        const url = `${endpoint}`
        const response = await axios.post(url, data)
        return response.data
    }

    async put(endpoint: string, data: any) {
        const url = `${endpoint}`
        const response = await axios.put(url, data)
        return response.data
    }

    async delete(endpoint: string) {
        const url = `${endpoint}`
        const response = await axios.delete(url)
        return response.data
    }
}

export const api = new ApiClient()

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
}
