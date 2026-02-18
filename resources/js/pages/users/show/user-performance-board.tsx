import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    useUserPerformanceBoard,
    type CroMetrics,
    type AdvisorMetrics,
    type PerformanceFilters,
} from '@/hooks/useUserPerformance';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import {
    Target,
    Gauge,
    RefreshCcw,
    Trophy,
    Clock,
    Star,
    RotateCcw,
    CalendarDays,
    Info,
    Loader2,
    XCircle,
    Users,
    ListChecks,
    AlertTriangle,
} from 'lucide-react';
import { type LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { useMemo, useState } from 'react';

interface Props {
    userId: number;
}

interface MetricCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    description: string;
    children?: React.ReactNode;
}

function MetricCard({ label, value, icon: Icon, color, bgColor, description, children }: MetricCardProps) {
    return (
        <div className="flex flex-col rounded-lg border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`rounded p-1.5 ${bgColor}`}>
                        <Icon className={`size-4 ${color}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="size-3.5 cursor-help text-muted-foreground/50" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] text-xs">
                        {description}
                    </TooltipContent>
                </Tooltip>
            </div>
            <p className="text-2xl font-semibold">{value}</p>
            {children}
        </div>
    );
}

function PerformanceFiltersBar({
    filters,
    onChange,
    services,
}: {
    filters: PerformanceFilters;
    onChange: (filters: PerformanceFilters) => void;
    services: Array<{ id: number; name: string }>;
}) {
    const dateRange: DateRange | undefined =
        filters.date_from || filters.date_to
            ? {
                  from: filters.date_from ? new Date(filters.date_from) : undefined,
                  to: filters.date_to ? new Date(filters.date_to) : undefined,
              }
            : undefined;

    const handleDateChange = (range: DateRange | undefined) => {
        onChange({
            ...filters,
            date_from: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
            date_to: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
        });
    };

    return (
        <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Date Range</Label>
                <DateRangePicker value={dateRange} onChange={handleDateChange} />
            </div>
            <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Program</Label>
                <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={filters.service_id || ''}
                    onChange={(e) =>
                        onChange({ ...filters, service_id: e.target.value ? Number(e.target.value) : undefined })
                    }
                >
                    <option value="">All Programs</option>
                    {services.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

function CroBoard({ metrics }: { metrics: CroMetrics }) {
    const capacityColor =
        metrics.capacity.percentage >= 90
            ? 'text-red-600'
            : metrics.capacity.percentage >= 70
              ? 'text-amber-600'
              : 'text-green-600';

    const capacityBgColor =
        metrics.capacity.percentage >= 90
            ? 'bg-red-50'
            : metrics.capacity.percentage >= 70
              ? 'bg-amber-50'
              : 'bg-green-50';

    return (
        <div className="grid grid-cols-2 gap-4">
            <MetricCard
                label="Total Assigned"
                value={metrics.total_assigned}
                icon={Users}
                color="text-slate-600"
                bgColor="bg-slate-50"
                description="Total number of leads assigned to this CRO."
            />
            <MetricCard
                label="QTC Ratio"
                value={`${metrics.qtc_ratio}%`}
                icon={Target}
                color="text-blue-600"
                bgColor="bg-blue-50"
                description="Qualified-to-Contacted ratio. Percentage of contacted leads that were qualified."
            />
            <MetricCard
                label="Requalification"
                value={metrics.requalification_score}
                icon={RefreshCcw}
                color="text-purple-600"
                bgColor="bg-purple-50"
                description="Leads that went through requalification and were successfully re-qualified."
            />
            <MetricCard
                label="LTS Ratio"
                value={`${metrics.lts_ratio}%`}
                icon={Trophy}
                color="text-emerald-600"
                bgColor="bg-emerald-50"
                description="Lead-to-Sale ratio. Percentage of qualified leads that resulted in a won deal."
            />
            <MetricCard
                label="OTC Open"
                value={`${metrics.otc_open_ratio}%`}
                icon={Clock}
                color="text-orange-600"
                bgColor="bg-orange-50"
                description="Percentage of assigned leads still open (not won or lost)."
            />
            <MetricCard
                label="Pending Follow-ups"
                value={metrics.pending_follow_ups}
                icon={ListChecks}
                color="text-blue-600"
                bgColor="bg-blue-50"
                description="Number of pending tasks/follow-ups assigned to this CRO."
            >
                {metrics.overdue_follow_ups > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle className="size-3" />
                        {metrics.overdue_follow_ups} overdue
                    </div>
                )}
            </MetricCard>
            <MetricCard
                label="Capacity"
                value={`${metrics.capacity.current}/${metrics.capacity.max}`}
                icon={Gauge}
                color={capacityColor}
                bgColor={capacityBgColor}
                description="Current workload vs maximum capacity."
            >
                <Progress value={metrics.capacity.percentage} className="mt-2 h-1.5" />
                <span className="mt-1 text-xs text-muted-foreground">{metrics.capacity.percentage}% utilized</span>
            </MetricCard>
            <div className="col-span-2">
                <MetricCard
                    label="Avg First Response"
                    value={metrics.first_response_time !== null ? `${metrics.first_response_time} min` : 'N/A'}
                    icon={Clock}
                    color="text-amber-600"
                    bgColor="bg-amber-50"
                    description="Average time from lead creation to first CRO contact."
                />
            </div>
        </div>
    );
}

function AdvisorBoard({ metrics }: { metrics: AdvisorMetrics }) {
    const scoreLabel =
        metrics.performance_score >= 1.5
            ? 'Excellent'
            : metrics.performance_score >= 1.2
              ? 'Good'
              : metrics.performance_score >= 0.8
                ? 'Average'
                : 'Below Average';

    const scoreColor =
        metrics.performance_score >= 1.5
            ? 'text-emerald-600'
            : metrics.performance_score >= 1.2
              ? 'text-blue-600'
              : metrics.performance_score >= 0.8
                ? 'text-amber-600'
                : 'text-red-600';

    const scoreBgColor =
        metrics.performance_score >= 1.5
            ? 'bg-emerald-50'
            : metrics.performance_score >= 1.2
              ? 'bg-blue-50'
              : metrics.performance_score >= 0.8
                ? 'bg-amber-50'
                : 'bg-red-50';

    return (
        <div className="grid grid-cols-2 gap-4">
            <MetricCard
                label="Total Assigned"
                value={metrics.total_assigned}
                icon={Users}
                color="text-slate-600"
                bgColor="bg-slate-50"
                description="Total number of leads assigned to this advisor."
            />
            <MetricCard
                label="Performance"
                value={scoreLabel}
                icon={Star}
                color={scoreColor}
                bgColor={scoreBgColor}
                description={`Performance weight: ${metrics.performance_score}. Higher weight means more lead assignments.`}
            >
                <span className="mt-1 text-xs text-muted-foreground">Weight: {metrics.performance_score}</span>
            </MetricCard>
            <MetricCard
                label="Requalify %"
                value={`${metrics.requalify_percentage}%`}
                icon={RotateCcw}
                color="text-purple-600"
                bgColor="bg-purple-50"
                description="Percentage of assigned leads sent back for requalification."
            />
            <MetricCard
                label="LTS Ratio"
                value={`${metrics.lts_ratio}%`}
                icon={Trophy}
                color="text-emerald-600"
                bgColor="bg-emerald-50"
                description="Lead-to-Sale ratio. Percentage of assigned leads that were won."
            />
            <MetricCard
                label="OTC Open"
                value={`${metrics.otc_open_ratio}%`}
                icon={Clock}
                color="text-orange-600"
                bgColor="bg-orange-50"
                description="Percentage of assigned leads still open (not won or lost)."
            />
            <MetricCard
                label="OTC Lost"
                value={`${metrics.otc_lost_ratio}%`}
                icon={XCircle}
                color="text-red-600"
                bgColor="bg-red-50"
                description="Percentage of assigned leads that were lost."
            />
            <MetricCard
                label="Pending Follow-ups"
                value={metrics.pending_follow_ups}
                icon={ListChecks}
                color="text-blue-600"
                bgColor="bg-blue-50"
                description="Number of pending tasks/follow-ups assigned to this advisor."
            >
                {metrics.overdue_follow_ups > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle className="size-3" />
                        {metrics.overdue_follow_ups} overdue
                    </div>
                )}
            </MetricCard>
            <MetricCard
                label="Avg First Response"
                value={metrics.first_response_time !== null ? `${metrics.first_response_time} min` : 'N/A'}
                icon={Clock}
                color="text-amber-600"
                bgColor="bg-amber-50"
                description="Average time from qualification to first advisor contact."
            />
            <div className="col-span-2">
                <MetricCard
                    label="Avg Lead Lifecycle"
                    value={metrics.avg_lifecycle_days !== null ? `${metrics.avg_lifecycle_days} days` : 'N/A'}
                    icon={CalendarDays}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                    description="Average number of days from lead creation to conversion for won deals."
                />
            </div>
        </div>
    );
}

export function UserPerformanceBoard({ userId }: Props) {
    const [filters, setFilters] = useState<PerformanceFilters>({});
    const { data, isLoading, isError } = useUserPerformanceBoard(userId, filters);

    const { services: sharedServices } = usePage<SharedData & { services?: Array<{ id: number; name: string }> }>().props;

    const services = useMemo(() => {
        if (sharedServices && Array.isArray(sharedServices)) return sharedServices;
        return [];
    }, [sharedServices]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Performance Board</CardTitle>
                    <CardDescription>Loading performance metrics...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isError || !data || data.role_type === 'other') {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Performance Board</CardTitle>
                <CardDescription>
                    {data.role_type === 'cro' ? 'CRO performance metrics' : 'Advisor performance metrics'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <PerformanceFiltersBar filters={filters} onChange={setFilters} services={services} />
                {data.role_type === 'cro' && <CroBoard metrics={data.metrics as CroMetrics} />}
                {data.role_type === 'advisor' && <AdvisorBoard metrics={data.metrics as AdvisorMetrics} />}
            </CardContent>
        </Card>
    );
}
