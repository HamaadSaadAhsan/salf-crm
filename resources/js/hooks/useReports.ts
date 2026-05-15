import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/http';

export interface ReportFilters {
    date_from?: string;
    date_to?: string;
    office_id?: number;
    zone_id?: number;
    service_id?: number[];
    source_id?: number[];
    user_id?: number;
    group_by?: 'day' | 'week' | 'month';
}

export interface ReportSummary {
    total_leads?: number;
    won_leads?: number;
    lost_leads?: number;
    qualified_leads?: number;
    new_leads?: number;
    conversion_rate?: number;
    qualification_rate?: number;
    total_won?: number;
    total_qualified?: number;
    total_offices?: number;
    total_agents?: number;
    total_reps?: number;
    total_sources?: number;
    total_services?: number;
    total_lost?: number;
    overall_conversion_rate?: number;
    overall_qualification_rate?: number;
    avg_conversion_days?: number;
    best_source?: Record<string, unknown> | null;
    top_reason?: Record<string, unknown> | null;
}

export interface TrendDataPoint {
    period: string;
    count: number;
}

export interface ReportData<T = Record<string, unknown>[]> {
    summary: ReportSummary;
    chart_data: TrendDataPoint[] | T;
    table_data: T | Record<string, unknown>;
}

export interface OfficeRow {
    office_id: number;
    office_name: string;
    total_leads: number;
    won_leads: number;
    lost_leads: number;
    qualified_leads: number;
    conversion_rate: number;
}

export interface AgentRow {
    user_id: number;
    agent_name: string;
    total_leads: number;
    qualified_leads: number;
    won_leads: number;
    lost_leads: number;
    qualification_rate: number;
    avg_response_time_minutes: number;
}

export interface SalesRepRow {
    user_id: number;
    rep_name: string;
    total_leads: number;
    won_leads: number;
    lost_leads: number;
    in_pipeline: number;
    conversion_rate: number;
    avg_conversion_days: number;
}

export interface SourceRow {
    source_id: number;
    source_name: string;
    total_leads: number;
    won_leads: number;
    lost_leads: number;
    qualified_leads: number;
    conversion_rate: number;
    qualification_rate: number;
}

export interface ServiceRow {
    service_id: number;
    service_name: string;
    total_leads: number;
    won_leads: number;
    lost_leads: number;
    qualified_leads: number;
    conversion_rate: number;
}

export interface LossReasonRow {
    reason: string;
    count: number;
    percentage: number;
}

const STALE_TIME = 5 * 60 * 1000;

function buildParams(filters: ReportFilters): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.office_id) params.office_id = filters.office_id;
    if (filters.zone_id) params.zone_id = filters.zone_id;
    if (filters.service_id?.length) params.service_id = filters.service_id;
    if (filters.source_id?.length) params.source_id = filters.source_id;
    if (filters.user_id) params.user_id = filters.user_id;
    if (filters.group_by) params.group_by = filters.group_by;
    return params;
}

export function useLeadsOverallReport(filters: ReportFilters) {
    return useQuery<ReportData>({
        queryKey: ['reports', 'leads-overall', filters],
        queryFn: async () => {
            const response = await axios.get('/api/reports/leads-overall', { params: buildParams(filters) });
            return response.data;
        },
        staleTime: STALE_TIME,
    });
}

export function useLeadsByOfficeReport(filters: ReportFilters) {
    return useQuery<ReportData<OfficeRow[]>>({
        queryKey: ['reports', 'leads-by-office', filters],
        queryFn: async () => {
            const response = await axios.get('/api/reports/leads-by-office', { params: buildParams(filters) });
            return response.data;
        },
        staleTime: STALE_TIME,
    });
}

export function useLeadsBySupportAgentReport(filters: ReportFilters) {
    return useQuery<ReportData<AgentRow[]>>({
        queryKey: ['reports', 'leads-by-support-agent', filters],
        queryFn: async () => {
            const response = await axios.get('/api/reports/leads-by-support-agent', { params: buildParams(filters) });
            return response.data;
        },
        staleTime: STALE_TIME,
    });
}

export function useLeadsBySalesRepReport(filters: ReportFilters) {
    return useQuery<ReportData<SalesRepRow[]>>({
        queryKey: ['reports', 'leads-by-sales-rep', filters],
        queryFn: async () => {
            const response = await axios.get('/api/reports/leads-by-sales-rep', { params: buildParams(filters) });
            return response.data;
        },
        staleTime: STALE_TIME,
    });
}

export function useLeadsBySourceReport(filters: ReportFilters) {
    return useQuery<ReportData<SourceRow[]>>({
        queryKey: ['reports', 'leads-by-source', filters],
        queryFn: async () => {
            const response = await axios.get('/api/reports/leads-by-source', { params: buildParams(filters) });
            return response.data;
        },
        staleTime: STALE_TIME,
    });
}

export function useLeadsByServiceReport(filters: ReportFilters) {
    return useQuery<ReportData<ServiceRow[]>>({
        queryKey: ['reports', 'leads-by-service', filters],
        queryFn: async () => {
            const response = await axios.get('/api/reports/leads-by-service', { params: buildParams(filters) });
            return response.data;
        },
        staleTime: STALE_TIME,
    });
}

export function useLeadsConversionReport(filters: ReportFilters) {
    return useQuery<ReportData>({
        queryKey: ['reports', 'leads-conversion', filters],
        queryFn: async () => {
            const response = await axios.get('/api/reports/leads-conversion', { params: buildParams(filters) });
            return response.data;
        },
        staleTime: STALE_TIME,
    });
}

export function useLeadsLostReport(filters: ReportFilters) {
    return useQuery<ReportData>({
        queryKey: ['reports', 'leads-lost', filters],
        queryFn: async () => {
            const response = await axios.get('/api/reports/leads-lost', { params: buildParams(filters) });
            return response.data;
        },
        staleTime: STALE_TIME,
    });
}
