import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface DashboardOverview {
    role: string;
    kpis?: {
        total_leads?: number;
        leads_delta?: number;
        last_month_leads?: number;
        program_sales?: {
            cbi: { created: number; qualified: number; won: number };
            rbi: { created: number; qualified: number; won: number };
            skilled: { created: number; qualified: number; won: number };
        };
        avg_lead_score?: number;
        best_lead_source?: {
            name: string;
            conversion_rate: number;
            total_leads: number;
        } | null;
        ltq_rate?: number;
        qts_rate?: number;
        avg_lifecycle_days?: number;
        system_adoption_rate?: number;
        avg_leads_per_advisor_per_day?: number;
        // Legacy fields for other dashboards
        conversion_rate?: number;
        qualified_leads?: number;
        converted_leads?: number;
    };
    my_leads?: {
        assigned?: number;
        pending_qualification?: number;
        qualified_today?: number;
        qualified_assigned?: number;
        in_proposal?: number;
        converted_today?: number;
    };
    my_tasks?: {
        today?: number;
        overdue?: number;
        pending?: number;
        in_progress?: number;
    };
    my_performance?: {
        conversion_rate?: number;
        qualification_rate?: number;
        task_completion_accuracy?: number;
        total_activities?: number;
    };
    response_times?: {
        avg_first_response?: number | null;
        avg_qualification?: number | null;
        avg_conversion?: number | null;
    };
    lifecycle?: {
        average_days?: number;
    };
    team_performance?: Record<string, unknown>;
    hot_leads?: Array<unknown>;
    upcoming_meetings?: Array<unknown>;
}

export function useDashboardOverview() {
    return useQuery<DashboardOverview>({
        queryKey: ['dashboard', 'overview'],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/overview');
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    });
}

export function useConversionMetrics(params?: {
    dimension?: string;
    start_date?: string;
    end_date?: string;
}) {
    return useQuery({
        queryKey: ['metrics', 'conversion', params],
        queryFn: async () => {
            const response = await axios.get('/api/metrics/conversion', { params });
            return response.data;
        },
        staleTime: 60 * 60 * 1000, // 1 hour
        enabled: !!params,
    });
}

export function useBusinessPerformance(params?: {
    period?: string;
    date?: string;
}) {
    return useQuery({
        queryKey: ['metrics', 'business-performance', params],
        queryFn: async () => {
            const response = await axios.get('/api/metrics/business-performance', { params });
            return response.data;
        },
        staleTime: 60 * 60 * 1000, // 1 hour
    });
}

export function useDepartmentHandoff(params?: {
    from?: string;
    to?: string;
    start_date?: string;
    end_date?: string;
}) {
    return useQuery({
        queryKey: ['metrics', 'department-handoff', params],
        queryFn: async () => {
            const response = await axios.get('/api/metrics/department-handoff', { params });
            return response.data;
        },
        staleTime: 60 * 60 * 1000, // 1 hour
    });
}

export function useSystemAdoption(params?: {
    start_date?: string;
    end_date?: string;
}) {
    return useQuery({
        queryKey: ['metrics', 'system-adoption', params],
        queryFn: async () => {
            const response = await axios.get('/api/metrics/system-adoption', { params });
            return response.data;
        },
        staleTime: 60 * 60 * 1000, // 1 hour
    });
}

export function useUserPerformance(params?: {
    user_id?: number;
    start_date?: string;
    end_date?: string;
}) {
    return useQuery({
        queryKey: ['metrics', 'user-performance', params],
        queryFn: async () => {
            const response = await axios.get('/api/metrics/user-performance', { params });
            return response.data;
        },
        staleTime: 60 * 60 * 1000, // 1 hour
    });
}

export function useDailyMetrics(params?: {
    start_date?: string;
    end_date?: string;
}) {
    return useQuery({
        queryKey: ['metrics', 'daily', params],
        queryFn: async () => {
            const response = await axios.get('/api/metrics/daily', { params });
            return response.data;
        },
        staleTime: 60 * 60 * 1000, // 1 hour
    });
}

export interface LeadsOverviewData {
    chart_data: Array<{
        period: string;
        deals: number;
    }>;
    statistics: {
        closed_deals: number;
        closed_deals_change: string;
        pipeline_value: number;
        pipeline_value_formatted: string;
        pipeline_change: string;
        conversion_rate: number;
        conversion_change: string;
    };
}

export function useLeadsOverview(period: 'day' | 'week' | 'month' | 'year' = 'day') {
    return useQuery<LeadsOverviewData>({
        queryKey: ['dashboard', 'leads-overview', period],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/leads-overview', {
                params: { period },
            });
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export interface LeadAnalyticsData {
    chart_data: Array<{
        period: string;
        leads: number;
    }>;
    total_leads: number;
    growth_percentage: number;
}

export function useLeadAnalytics(period: '5D' | '2W' | '1M' | '6M' = '5D') {
    return useQuery<LeadAnalyticsData>({
        queryKey: ['dashboard', 'lead-analytics', period],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/lead-analytics', {
                params: { period },
            });
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export interface RevenuePipelineData {
    pipeline_data: Array<{
        stage: string;
        count: number;
        value: number;
        color: string;
    }>;
    total_value: number;
    average_deal_value: number;
}

export function useRevenuePipeline() {
    return useQuery<RevenuePipelineData>({
        queryKey: ['dashboard', 'revenue-pipeline'],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/revenue-pipeline');
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export interface LeadLifecycleFunnelData {
    funnel_data: Array<{
        stage: string;
        count: number;
        percentage: number;
        conversion_rate: number | null;
        color: string;
    }>;
    period_days: number;
    overall_conversion_rate: number;
}

export function useLeadLifecycleFunnel(period: 7 | 14 | 30 | 60 | 90 = 30) {
    return useQuery<LeadLifecycleFunnelData>({
        queryKey: ['dashboard', 'lifecycle-funnel', period],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/lifecycle-funnel', {
                params: { period },
            });
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export interface LeadDistributionData {
    distribution_data: Array<{
        name: string;
        count: number;
        percentage: number;
    }>;
    total_leads: number;
    dimension: string;
}

export function useLeadDistribution(dimension: 'source' | 'service' | 'status' = 'source') {
    return useQuery<LeadDistributionData>({
        queryKey: ['dashboard', 'lead-distribution', dimension],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/lead-distribution', {
                params: { dimension },
            });
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export interface ActivityHeatmapData {
    heatmap_data: Array<{
        day: string;
        hour: number;
        count: number;
        intensity: number;
    }>;
    period_days: number;
    total_activities: number;
    max_count: number;
}

export function useActivityHeatmap(period: 7 | 14 | 30 = 30) {
    return useQuery<ActivityHeatmapData>({
        queryKey: ['dashboard', 'activity-heatmap', period],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/activity-heatmap', {
                params: { period },
            });
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export interface ConversionByServiceData {
    conversion_data: Array<{
        service: string;
        total_leads: number;
        converted_leads: number;
        conversion_rate: number;
    }>;
    period_days: number;
}

export function useConversionByService(period: 7 | 14 | 30 | 60 | 90 = 30) {
    return useQuery<ConversionByServiceData>({
        queryKey: ['dashboard', 'conversion-by-service', period],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/conversion-by-service', {
                params: { period },
            });
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export interface ActivityTimelineData {
    timeline_data: Array<{
        date: string;
        total_activities: number;
        activity_types: Record<string, number>;
        activities: Array<{
            id: number;
            type: string;
            description: string;
            lead_name: string;
            user_name: string;
            created_at: string;
        }>;
    }>;
    type_summary: Array<{
        type: string;
        count: number;
    }>;
    period_days: number;
    total_activities: number;
}

export function useActivityTimeline(period: 7 | 14 | 30 = 7, userId?: number) {
    return useQuery<ActivityTimelineData>({
        queryKey: ['dashboard', 'activity-timeline', period, userId],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/activity-timeline', {
                params: { period, user_id: userId },
            });
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export interface LeadSourcePerformanceData {
    source_performance: Array<{
        source_id: number;
        source_name: string;
        total_leads: number;
        converted_leads: number;
        qualified_leads: number;
        lost_leads: number;
        conversion_rate: number;
        qualification_rate: number;
        loss_rate: number;
        avg_lead_score: number;
        avg_response_time_minutes: number;
        quality_score: number;
        estimated_roi: number;
    }>;
    period_days: number;
    total_leads: number;
    total_converted: number;
    overall_conversion_rate: number;
    best_source: any;
    worst_source: any;
}

export function useLeadSourcePerformance(period: 7 | 14 | 30 | 60 | 90 = 30) {
    return useQuery<LeadSourcePerformanceData>({
        queryKey: ['dashboard', 'lead-source-performance', period],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/lead-source-performance', {
                params: { period },
            });
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export interface ProgramPerformanceData {
    program_performance: Array<{
        program_name: string;
        program_code: string;
        total_leads: number;
        converted_leads: number;
        qualified_leads: number;
        lost_leads: number;
        active_leads: number;
        conversion_rate: number;
        qualification_rate: number;
        loss_rate: number;
        active_rate: number;
        avg_conversion_days: number;
        avg_response_time_minutes: number;
    }>;
    program_trends: Record<string, number>;
    period_days: number;
    total_leads: number;
    total_converted: number;
    overall_conversion_rate: number;
    best_program: any;
    programs_count: number;
}

export function useProgramPerformance(period: 7 | 14 | 30 | 60 | 90 | 180 | 365 = 90) {
    return useQuery<ProgramPerformanceData>({
        queryKey: ['dashboard', 'program-performance', period],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/program-performance', {
                params: { period },
            });
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export interface TaskCompletionAnalysisData {
    overall_metrics: {
        total_tasks: number;
        completed_tasks: number;
        overdue_tasks: number;
        accuracy_rate: number;
        on_time_rate: number;
    };
    accuracy_trend: Array<{
        week: string;
        period: string;
        total_tasks: number;
        completed_tasks: number;
        accuracy_rate: number;
    }>;
    task_type_breakdown: Array<{
        type: string;
        total_tasks: number;
        completed_tasks: number;
        overdue_tasks: number;
        completion_rate: number;
        overdue_rate: number;
    }>;
    overdue_analysis: Array<{
        priority: string;
        overdue_count: number;
        avg_days_overdue: number;
    }>;
    period_days: number;
    user_filtered: boolean;
}

export function useTaskCompletionAnalysis(period: 7 | 14 | 30 | 60 | 90 = 30, userId?: number) {
    return useQuery<TaskCompletionAnalysisData>({
        queryKey: ['dashboard', 'task-completion-analysis', period, userId],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/task-completion-analysis', {
                params: { period, user_id: userId },
            });
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export interface LeadLifecycleAnalysisData {
    stage_breakdown: Array<{
        stage: string;
        total_leads: number;
        avg_days_to_contact: number;
        avg_days_to_qualify: number;
        avg_days_to_convert: number;
    }>;
    bottlenecks: Array<{
        stage: string;
        expected_days: number;
        actual_avg_days: number;
        delay_days: number;
        leads_stuck: number;
        severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
    stage_durations: Array<{
        stage: string;
        avg_days: number;
    }>;
    velocity_metrics: {
        total_leads: number;
        converted_leads: number;
        avg_lifecycle_days: number;
        conversion_velocity: number;
    };
    period_days: number;
}

export function useLeadLifecycleAnalysis(period: 7 | 14 | 30 | 60 | 90 | 180 = 90) {
    return useQuery<LeadLifecycleAnalysisData>({
        queryKey: ['dashboard', 'lead-lifecycle-analysis', period],
        queryFn: async () => {
            const response = await axios.get('/api/dashboard/lead-lifecycle-analysis', {
                params: { period },
            });
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });
}
