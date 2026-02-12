import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { CHART_COLORS } from '@/lib/dashboard-colors';
import { CircleCheck, CircleX } from 'lucide-react';

const MAX_WORKLOAD = 30;

const STATUS_COLORS: Record<string, { label: string; variant: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive' }> = {
    new: { label: 'New', variant: 'info' },
    assigned_to_cro: { label: 'CRO', variant: 'secondary' },
    contacted: { label: 'Contacted', variant: 'primary' },
    qualified: { label: 'Qualified', variant: 'success' },
    assigned_to_advisor: { label: 'Advisor', variant: 'primary' },
    proposal: { label: 'Proposal', variant: 'warning' },
    nurturing: { label: 'Nurturing', variant: 'secondary' },
    converted: { label: 'Converted', variant: 'success' },
    won: { label: 'Won', variant: 'success' },
    lost: { label: 'Lost', variant: 'destructive' },
    unqualified: { label: 'Unqualified', variant: 'destructive' },
    requalify: { label: 'Requalify', variant: 'warning' },
};

interface Advisor {
    id: number;
    name: string;
    avatar: string | null;
    current_lead_count: number;
    conversion_rate: number;
    performance_weight: number;
    availability: boolean;
    service_lead_count: number;
    status_breakdown: Record<string, number>;
}

interface AdvisorDistributionProps {
    advisors: Advisor[];
    fairnessScore: number | null;
}

function getLoadColor(ratio: number): string {
    if (ratio < 0.5) return 'bg-emerald-500';
    if (ratio < 0.75) return 'bg-amber-500';
    return 'bg-rose-500';
}

export function AdvisorDistribution({ advisors, fairnessScore }: AdvisorDistributionProps) {
    if (advisors.length === 0) {
        return (
            <p className="py-4 text-center text-sm text-muted-foreground">
                No advisors assigned to this service.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {advisors.map((advisor) => {
                const loadRatio = advisor.current_lead_count / MAX_WORKLOAD;
                const loadPercent = Math.min(100, Math.round(loadRatio * 100));

                return (
                    <div
                        key={advisor.id}
                        className="rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                {advisor.avatar ? (
                                    <img
                                        src={advisor.avatar}
                                        alt={advisor.name}
                                        className="h-full w-full rounded-full object-cover"
                                    />
                                ) : (
                                    advisor.name.charAt(0).toUpperCase()
                                )}
                                <span
                                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${advisor.availability ? 'bg-emerald-500' : 'bg-gray-400'}`}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{advisor.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatNumber(advisor.service_lead_count)} leads in service
                                </p>
                            </div>
                        </div>

                        {/* Load bar */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="mb-2">
                                        <div className="mb-1 flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Load</span>
                                            <span className="font-medium">
                                                {advisor.current_lead_count}/{MAX_WORKLOAD}
                                            </span>
                                        </div>
                                        <Progress
                                            value={loadPercent}
                                            className="h-1.5"
                                            indicatorClassName={getLoadColor(loadRatio)}
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{loadPercent}% capacity used</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* Status breakdown badges */}
                        {Object.keys(advisor.status_breakdown).length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-1">
                                {Object.entries(advisor.status_breakdown).map(([status, count]) => {
                                    const cfg = STATUS_COLORS[status] || {
                                        label: status,
                                        variant: 'secondary' as const,
                                    };
                                    return (
                                        <Badge
                                            key={status}
                                            variant={cfg.variant}
                                            appearance="light"
                                            size="sm"
                                        >
                                            {cfg.label}: {count}
                                        </Badge>
                                    );
                                })}
                            </div>
                        )}

                        {/* Metrics row */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <span>Conv: {formatPercent(advisor.conversion_rate)}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>Conversion rate</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <span>Wt: {advisor.performance_weight.toFixed(1)}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>Performance weight</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
