import { useDashboardOverview } from '@/hooks/useDashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { CRODashboard } from './CRODashboard';
import { AdvisorDashboard } from './AdvisorDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { BasicDashboard } from './BasicDashboard';

export default function Dashboard() {
    const { data, isLoading, error } = useDashboardOverview();

    if (error) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load dashboard data. Please try refreshing the page.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Render role-specific dashboard
    const role = data?.role;

    if (role === 'super-admin') {
        return <SuperAdminDashboard data={data} isLoading={isLoading} />;
    }

    if (role === 'manager') {
        return <ManagerDashboard data={data} isLoading={isLoading} />;
    }

    if (role === 'cro') {
        return <CRODashboard data={data} isLoading={isLoading} />;
    }

    if (role === 'advisor') {
        return <AdvisorDashboard data={data} isLoading={isLoading} />;
    }

    return <BasicDashboard data={data} isLoading={isLoading} />;
}
