import { DashboardOverview } from '@/hooks/useDashboard';
import { StatCard } from '@/components/dashboard/StatCard';
import { formatNumber } from '@/lib/dashboard-utils';
import { ClipboardList, CalendarPlus, Handshake, FileSignature, CreditCard, Trophy } from 'lucide-react';
import { router } from '@inertiajs/react';

interface ProcessingDashboardProps {
    data?: DashboardOverview;
    isLoading?: boolean;
}

const STAGE_CONFIG: Record<string, { label: string; icon: typeof ClipboardList; color: 'blue' | 'green' | 'yellow' | 'purple' | 'red' }> = {
    meeting: { label: 'Meeting', icon: Handshake, color: 'yellow' },
    contract_signed: { label: 'Contract Signed', icon: FileSignature, color: 'blue' },
    initial_payment: { label: 'Initial Payment', icon: CreditCard, color: 'purple' },
    won: { label: 'Won', icon: Trophy, color: 'green' },
};

export function ProcessingDashboard({ data }: ProcessingDashboardProps) {
    const leadsToProcess = data?.leads_to_process;
    const byStage = leadsToProcess?.by_stage ?? {};

    return (
        <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:space-y-8 lg:p-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Processing Dashboard</h1>
                <p className="text-muted-foreground">Leads ready for processing</p>
            </div>

            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    label="Total Leads to Process"
                    value={formatNumber(leadsToProcess?.total)}
                    icon={ClipboardList}
                    color="blue"
                    onClick={() => router.visit('/leads')}
                />
                <StatCard
                    label="Updated Today"
                    value={formatNumber(leadsToProcess?.new_today)}
                    icon={CalendarPlus}
                    color="green"
                />
            </div>

            {/* Breakdown by stage */}
            {Object.keys(byStage).length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">By Advisor Stage</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(byStage).map(([stage, count]) => {
                            const config = STAGE_CONFIG[stage] ?? { label: stage, icon: ClipboardList, color: 'blue' as const };
                            return (
                                <StatCard
                                    key={stage}
                                    label={config.label}
                                    value={formatNumber(count)}
                                    icon={config.icon}
                                    color={config.color}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
