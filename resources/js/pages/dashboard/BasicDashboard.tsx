import { DashboardOverview } from '@/hooks/useDashboard';
import { StatCard } from '@/components/dashboard/StatCard';
import { formatNumber } from '@/lib/dashboard-utils';
import { Clock, PlayCircle } from 'lucide-react';
import { router } from '@inertiajs/react';

interface BasicDashboardProps {
    data?: DashboardOverview;
    isLoading?: boolean;
}

export function BasicDashboard({ data, isLoading }: BasicDashboardProps) {
    const myTasks = data?.my_tasks || {};

    return (
        <div className="p-8 space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Welcome to your dashboard</p>
            </div>

            {/* Task Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    label="Pending Tasks"
                    value={formatNumber(myTasks.pending)}
                    icon={Clock}
                    color="yellow"
                    onClick={() => router.visit('/tasks?status=pending')}
                />
                <StatCard
                    label="In Progress"
                    value={formatNumber(myTasks.in_progress)}
                    icon={PlayCircle}
                    color="blue"
                    onClick={() => router.visit('/tasks?status=in_progress')}
                />
            </div>
        </div>
    );
}
