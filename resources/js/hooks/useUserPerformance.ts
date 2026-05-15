import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/http';

export interface CroMetrics {
    qtc_ratio: number;
    capacity: {
        current: number;
        max: number;
        percentage: number;
    };
    requalification_score: number;
    lts_ratio: number;
    total_assigned: number;
    otc_open_ratio: number;
    otc_lost_ratio: number;
    pending_follow_ups: number;
    overdue_follow_ups: number;
    first_response_time: number | null;
}

export interface AdvisorMetrics {
    performance_score: number;
    requalify_percentage: number;
    lts_ratio: number;
    total_assigned: number;
    otc_open_ratio: number;
    otc_lost_ratio: number;
    pending_follow_ups: number;
    overdue_follow_ups: number;
    first_response_time: number | null;
    avg_lifecycle_days: number | null;
}

export interface PerformanceBoardData {
    role_type: 'cro' | 'advisor' | 'other';
    metrics: CroMetrics | AdvisorMetrics;
}

export interface PerformanceFilters {
    date_from?: string;
    date_to?: string;
    service_id?: number;
}

export function useUserPerformanceBoard(userId: number, filters: PerformanceFilters = {}) {
    return useQuery<PerformanceBoardData>({
        queryKey: ['users', userId, 'performance-board', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            if (filters.service_id) params.append('service_id', String(filters.service_id));

            const query = params.toString();
            const response = await axios.get(`/api/users/${userId}/performance-board${query ? `?${query}` : ''}`);
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!userId,
    });
}
