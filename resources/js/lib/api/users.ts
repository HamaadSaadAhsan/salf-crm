// lib/api/users.ts
import { UserFilters, User, UserWithRelations, UserListResponse, UserStats, ServiceAssignmentData } from '@/types/user.d';
import axios from "@/lib/axios"
export class UsersAPI {
  public baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Convert headers to a plain object if needed
    let headers: Record<string, string> = {};
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else if (options.headers) {
      headers = options.headers as Record<string, string>;
    }

    const response = await axios({
      url,
      method: options.method || 'GET',
      headers,
      data: options.body,
      // ...other axios config if needed
    });

    return response.data;
  }

  // GET /api/users - List users with filters
  async getUsers(filters: UserFilters = {}): Promise<UserListResponse> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(`${key}[]`, String(v)));
        } else {
          params.append(key, String(value));
        }
      }
    });

    const query = params.toString();
    return this.request<UserListResponse>(`/users${query ? `?${query}` : ''}`);
  }

  // GET /api/users/{id} - Get single user
  async getUser(id: number): Promise<UserWithRelations> {
    return this.request<UserWithRelations>(`/users/${id}`);
  }

  // POST /api/users - Create user
  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: string[];
    service_ids?: number[];
    service_assignment_data?: ServiceAssignmentData;
  }): Promise<UserWithRelations> {
    return this.request<UserWithRelations>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PATCH /api/users/{id} - Update user
  async updateUser(id: number, updates: Partial<User>): Promise<UserWithRelations> {
    return this.request<UserWithRelations>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // DELETE /api/users/{id} - Delete user
  async deleteUser(id: number): Promise<void> {
    return this.request<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // GET /api/users/{id}/services - Get user's services
  async getUserServices(id: number): Promise<any> {
    return this.request(`/users/${id}/services`);
  }

  // POST /api/users/{userId}/services/{serviceId} - Assign service to user
  async assignUserToService(
    userId: number,
    serviceId: number,
    data: ServiceAssignmentData = {}
  ): Promise<any> {
    return this.request(`/users/${userId}/services/${serviceId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // DELETE /api/users/{userId}/services/{serviceId} - Unassign service from user
  async unassignUserFromService(userId: number, serviceId: number): Promise<void> {
    return this.request<void>(`/users/${userId}/services/${serviceId}`, {
      method: 'DELETE',
    });
  }

  // PATCH /api/users/{userId}/services/{serviceId} - Update service assignment
  async updateUserServiceAssignment(
    userId: number,
    serviceId: number,
    data: ServiceAssignmentData
  ): Promise<any> {
    return this.request(`/users/${userId}/services/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // GET /api/users/stats - Get user statistics
  async getUserStats(filters: UserFilters = {}): Promise<UserStats> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(`${key}[]`, String(v)));
        } else {
          params.append(key, String(value));
        }
      }
    });

    const query = params.toString();
    return this.request<UserStats>(`/users/stats${query ? `?${query}` : ''}`);
  }

  // POST /api/users/bulk/assign-services - Bulk assign services
  async bulkAssignServices(
    userIds: number[],
    serviceIds: number[],
    data: ServiceAssignmentData = {}
  ): Promise<any> {
    return this.request('/users/bulk/assign-services', {
      method: 'POST',
      body: JSON.stringify({
        user_ids: userIds,
        service_ids: serviceIds,
        assignment_data: data,
      }),
    });
  }

  // PATCH /api/users/bulk/update - Bulk update users
  async bulkUpdateUsers(userIds: number[], updates: Partial<User>): Promise<any> {
    return this.request('/users/bulk/update', {
      method: 'PATCH',
      body: JSON.stringify({
        user_ids: userIds,
        updates,
      }),
    });
  }

  // DELETE /api/users/bulk/delete - Bulk delete users
  async bulkDeleteUsers(userIds: number[]): Promise<void> {
    return this.request<void>('/users/bulk/delete', {
      method: 'DELETE',
      body: JSON.stringify({
        user_ids: userIds,
      }),
    });
  }

  // GET /api/users/export - Export users
  async exportUsers(filters: UserFilters = {}, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(`${key}[]`, String(v)));
        } else {
          params.append(key, String(value));
        }
      }
    });

    params.append('format', format);
    const query = params.toString();

    const response = await fetch(`${this.baseURL}/users/export${query ? `?${query}` : ''}`);

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  // POST /api/users/import - Import users
  async importUsers(file: File, options: {
    update_existing?: boolean;
    assign_default_role?: string;
    default_service_ids?: number[];
  } = {}): Promise<{
    imported: number;
    updated: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    const response = await fetch(`${this.baseURL}/users/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Import failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // POST /api/users/{id}/resend-verification - Resend email verification
  async resendEmailVerification(id: number): Promise<void> {
    return this.request<void>(`/users/${id}/resend-verification`, {
      method: 'POST',
    });
  }

  // POST /api/users/{id}/reset-password - Reset user password
  async resetUserPassword(id: number): Promise<{ temporary_password: string }> {
    return this.request<{ temporary_password: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
    });
  }

  // GET /api/users/{id}/activity - Get user activity log
  async getUserActivity(id: number, limit: number = 50): Promise<any[]> {
    return this.request<any[]>(`/users/${id}/activity?limit=${limit}`);
  }

  // GET /api/users/{id}/leads - Get user's leads
  async getUserLeads(id: number, filters: any = {}): Promise<any> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const query = params.toString();
    return this.request(`/users/${id}/leads${query ? `?${query}` : ''}`);
  }

  // PUT /api/users/{id}/roles - Update user roles
  async updateUserRoles(id: number, roleIds: number[]): Promise<UserWithRelations> {
    return this.request<UserWithRelations>(`/users/${id}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ role_ids: roleIds }),
    });
  }

  // GET /api/users/search - Advanced user search
  async searchUsers(query: string, options: {
    fields?: string[];
    limit?: number;
    include_inactive?: boolean;
  } = {}): Promise<UserWithRelations[]> {
    const params = new URLSearchParams();
    params.append('q', query);

    if (options.fields) {
      params.append('fields', options.fields.join(','));
    }
    if (options.limit) {
      params.append('limit', String(options.limit));
    }
    if (options.include_inactive) {
      params.append('include_inactive', '1');
    }

    return this.request<UserWithRelations[]>(`/users/search?${params.toString()}`);
  }
}
