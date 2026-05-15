import axios from '@/lib/http';
import { WorkflowResponse, WorkflowsResponse } from '@/types/workflow';

const apiClient = axios;

export class WorkflowService {
    static async getWorkflows(page: number = 1, search?: string, status?: string): Promise<WorkflowsResponse> {
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            if (search && search.trim()) {
                params.append('search', search.trim());
            }
            if (status && status !== 'all') {
                params.append('status', status);
            }

            const response = await apiClient.get(`/api/workflows?${params.toString()}`);
            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    static async getWorkflow(id: number): Promise<WorkflowResponse> {
        try {
            const response = await apiClient.get(`/api/workflows/${id}`);
            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    static async createWorkflow(workflowData: any): Promise<WorkflowResponse> {
        try {
            const response = await apiClient.post('/api/workflows', workflowData);
            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    static async updateWorkflow(id: number, workflowData: any): Promise<WorkflowResponse> {
        try {
            const response = await apiClient.put(`/api/workflows/${id}`, workflowData);
            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    static async deleteWorkflow(id: number): Promise<{ success: boolean; message: string }> {
        try {
            const response = await apiClient.delete(`/api/workflows/${id}`);
            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    static async activateWorkflow(id: number): Promise<WorkflowResponse> {
        try {
            const response = await apiClient.patch(`/api/workflows/${id}/activate`);
            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    static async pauseWorkflow(id: number): Promise<WorkflowResponse> {
        try {
            const response = await apiClient.put(`/api/workflows/${id}`, {
                status: 'paused',
            });
            return response.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    static async duplicateWorkflow(id: number): Promise<WorkflowResponse> {
        try {
            const originalWorkflow = await this.getWorkflow(id);
            const duplicatedData = {
                name: `${originalWorkflow.data.name} (Copy)`,
                description: originalWorkflow.data.description,
                status: 'draft' as const,
                metadata: originalWorkflow.data.metadata,
                steps: originalWorkflow.data.steps.map((step, index) => ({
                    temp_id: `step_${index + 1}`,
                    step_type: step.step_type,
                    service: step.service,
                    operation: step.operation,
                    order: step.order,
                    configuration: step.configuration,
                    enabled: step.enabled,
                    field_mappings: step.field_mappings || [],
                })),
                connections: [], // You might need to reconstruct connections based on your step structure
            };

            return await this.createWorkflow(duplicatedData);
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    private static handleError(error: any): Error {
        if (error.response?.data?.message) {
            return new Error(error.response.data.message);
        }

        if (error.message) {
            return new Error(error.message);
        }

        return new Error('An unexpected error occurred');
    }
}
