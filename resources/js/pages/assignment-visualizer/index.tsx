import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEcho } from '@laravel/echo-react';
import axios from '@/lib/axios';
import { StatCard } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ServiceCard } from './service-card';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { BarChart3, Scale, Server, Users } from 'lucide-react';

interface VisualizerData {
    services: ServiceData[];
    summary: {
        total_services: number;
        total_advisors: number;
        overall_fairness: number;
        total_leads: number;
    };
}

interface ServiceData {
    id: number;
    name: string;
    country_code: string | null;
    country_name: string | null;
    total_leads: number;
    total_advisors: number;
    advisors: Advisor[];
    fairness_score: number | null;
    children: ChildService[];
}

interface ChildService {
    id: number;
    name: string;
    country_code: string | null;
    country_name: string | null;
    total_leads: number;
    advisors: Advisor[];
    fairness_score: number | null;
}

interface Advisor {
    id: number;
    name: string;
    avatar: string | null;
    current_lead_count: number;
    conversion_rate: number;
    performance_weight: number;
    availability: boolean;
    last_assignment_at: string | null;
    waiting_minutes: number | null;
    assignment_score: number;
    queue_position: number | null;
    service_lead_count: number;
    status_breakdown: Record<string, number>;
}

function useAssignmentVisualizer() {
    return useQuery<VisualizerData>({
        queryKey: ['assignment-visualizer'],
        queryFn: async () => {
            const response = await axios.get('/api/assignment-visualizer');
            return response.data;
        },
        staleTime: 60 * 1000,
        refetchInterval: 60 * 1000,
    });
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Management', href: '/settings/management' },
    { title: 'Assignment Visualizer', href: '/settings/management/assignment-visualizer' },
];

export default function AssignmentVisualizerPage() {
    const { data, isLoading, error } = useAssignmentVisualizer();
    const queryClient = useQueryClient();

    // Real-time: refetch when assignment queue updates via Reverb
    useEcho('leads', '.assignment-queue.updated', () => {
        queryClient.invalidateQueries({ queryKey: ['assignment-visualizer'] });
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Assignment Visualizer" />

            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        Assignment Queue Visualizer
                    </h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Monitor lead distribution across advisors per service and program.
                    </p>
                </div>

                {/* Summary Stats */}
                {isLoading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-lg" />
                        ))}
                    </div>
                ) : data ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            label="Total Services"
                            value={formatNumber(data.summary.total_services)}
                            icon={Server}
                            color="blue"
                        />
                        <StatCard
                            label="Total Advisors"
                            value={formatNumber(data.summary.total_advisors)}
                            icon={Users}
                            color="green"
                        />
                        <StatCard
                            label="Total Leads"
                            value={formatNumber(data.summary.total_leads)}
                            icon={BarChart3}
                            color="purple"
                        />
                        <StatCard
                            label="Overall Fairness"
                            value={formatPercent(data.summary.overall_fairness, 0)}
                            icon={Scale}
                            color={
                                data.summary.overall_fairness >= 80
                                    ? 'green'
                                    : data.summary.overall_fairness >= 60
                                      ? 'yellow'
                                      : 'red'
                            }
                        />
                    </div>
                ) : null}

                {/* Error state */}
                {error && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
                        Failed to load assignment data. Please try again.
                    </div>
                )}

                {/* Service Cards */}
                {isLoading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 rounded-lg" />
                        ))}
                    </div>
                ) : data?.services.length === 0 ? (
                    <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                        No services found with lead assignments.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {data?.services.map((service) => (
                            <ServiceCard key={service.id} service={service} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
