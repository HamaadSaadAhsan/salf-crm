import { ApiResponse, Lead, LeadFilters, LeadStats } from '@/types/lead';
import axios from "@/lib/axios"

export class LeadsAPI {
  public readonly baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Import axios at the top of your file: import axios, { AxiosRequestConfig } from 'axios';
    const url = `${this.baseURL}/${endpoint}`;

    // Map RequestInit to AxiosRequestConfig
    const axiosConfig: any = {
      url,
      method: options.method || 'GET',
      data: options.body,
      // You can add more mappings if needed (e.g., credentials, params, etc.)
    };

    try {
      const response = await axios(axiosConfig);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || `HTTP error! status: ${error.response.status}`);
      }
      throw new Error(error.message || 'Unknown error');
    }
  }

  async getLeads(filters: LeadFilters = {}): Promise<ApiResponse<Lead[]>> {
    const searchParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(`${key}[]`, v.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/leads${queryString ? `?${queryString}` : ''}`;

    return this.request<Lead[]>(endpoint);
  }

  async getLead(id: string): Promise<ApiResponse<Lead>> {
    return this.request<Lead>(`/leads/${id}`);
  }

  async getLeadsStats(filters: Partial<LeadFilters> = {}): Promise<ApiResponse<LeadStats>> {
    const searchParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/leads/stats${queryString ? `?${queryString}` : ''}`;

    return this.request<LeadStats>(endpoint);
  }

  async exportLeads(filters: LeadFilters, format: 'csv' | 'xlsx' | 'json' = 'csv') {
    return this.request('/leads/export', {
      method: 'POST',
      body: JSON.stringify({ ...filters, format }),
    });
  }

  // Real-time methods for cache invalidation
  async invalidateCache(leadId?: string) {
    // This would trigger cache invalidation on the server
    return this.request('/leads/cache/invalidate', {
      method: 'POST',
      body: JSON.stringify({ lead_id: leadId }),
    });
  }
}
