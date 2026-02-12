import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AdvisorDistribution } from './advisor-distribution';
import { formatNumber } from '@/lib/dashboard-utils';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';

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

interface ChildService {
    id: number;
    name: string;
    country_code: string | null;
    country_name: string | null;
    total_leads: number;
    advisors: Advisor[];
    fairness_score: number | null;
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

function FairnessDot({ score }: { score: number | null }) {
    if (score === null) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <span className="inline-block h-2.5 w-2.5 ml-2 rounded-full bg-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent>No data</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    let colorClass = 'bg-emerald-500';
    let label = 'Balanced';
    if (score < 60) {
        colorClass = 'bg-rose-500';
        label = 'Unbalanced';
    } else if (score < 80) {
        colorClass = 'bg-amber-500';
        label = 'Moderate';
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ml-2 ${colorClass}`} />
                </TooltipTrigger>
                <TooltipContent>
                    Fairness: {score.toFixed(0)}% ({label})
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function ServiceCard({ service }: { service: ServiceData }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <Card>
            <CardHeader
                className="cursor-pointer select-none border-0"
                onClick={() => setIsExpanded((prev) => !prev)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                            <CardTitle className="text-base">{service.name}</CardTitle>
                            {service.country_name && (
                                <p className="text-xs text-muted-foreground">
                                    {service.country_name}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <FairnessDot score={service.fairness_score} />
                        <Badge variant="secondary" appearance="light" size="sm">
                            {formatNumber(service.total_leads)} leads
                        </Badge>
                        <Badge variant="info" appearance="light" size="sm">
                            <Users className="mr-1 h-3 w-3" />
                            {service.total_advisors}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="space-y-4 pt-0">
                    {/* Parent service advisors (direct assignments) */}
                    {service.advisors.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                                Direct Assignments
                            </h4>
                            <AdvisorDistribution
                                advisors={service.advisors}
                                fairnessScore={service.fairness_score}
                            />
                        </div>
                    )}

                    {/* Child services */}
                    {service.children.length > 0 && (
                        <div className="space-y-3">
                            {service.children.map((child) => (
                                <ChildServiceSection key={child.id} service={child} />
                            ))}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}

function ChildServiceSection({ service }: { service: ChildService }) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="rounded-md border bg-muted/30 p-3">
            <div
                className="flex cursor-pointer items-center justify-between"
                onClick={() => setIsExpanded((prev) => !prev)}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <h5 className="text-sm font-medium">{service.name}</h5>
                    {service.country_name && (
                        <span className="text-xs text-muted-foreground">
                            ({service.country_name})
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <FairnessDot score={service.fairness_score} />
                    <Badge variant="secondary" appearance="light" size="sm">
                        {formatNumber(service.total_leads)} leads
                    </Badge>
                    <Badge variant="info" appearance="light" size="sm">
                        <Users className="mr-1 h-3 w-3" />
                        {service.advisors.length}
                    </Badge>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-3">
                    <AdvisorDistribution
                        advisors={service.advisors}
                        fairnessScore={service.fairness_score}
                    />
                </div>
            )}
        </div>
    );
}
