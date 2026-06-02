import { ArrowDown, ArrowUp, LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer, ReferenceLine } from 'recharts';

interface StatMetricCardProps {
    title: string;
    value: string | number;
    delta?: number;
    lastValue?: string | number;
    lastLabel?: string;
    positive?: boolean;
    isLoading?: boolean;
    icon?: LucideIcon;
    showActions?: boolean;
    sparkData?: Array<{ value: number }>;
    sparkColor?: string;
    iconColor?: string;
}

function formatNumber(n: number | string): string {
    if (typeof n === 'string') return n;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return n.toLocaleString();
    return n.toString();
}

export function StatMetricCard({
    title,
    value,
    delta,
    lastValue,
    lastLabel = 'Vs last month',
    positive = true,
    isLoading = false,
    icon: Icon,
    sparkData,
    sparkColor = 'hsl(217, 91%, 60%)',
    iconColor = 'text-primary',
}: StatMetricCardProps) {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-lg" />
                    </div>
                    <Skeleton className="mt-4 h-[56px] w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    const gradientId = `spark-${title.replace(/\s/g, '')}`;

    return (
        <Card>
            <CardContent className="p-0">
                {/* Main content area */}
                <div className="p-5 pb-0">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                            <p className="text-[13px] font-medium text-muted-foreground tracking-wide uppercase">
                                {title}
                            </p>
                            <div className="flex items-baseline gap-2.5">
                                <span className="text-[28px] font-semibold tracking-tight leading-none text-foreground">
                                    {typeof value === 'number' ? formatNumber(value) : value}
                                </span>
                                {delta !== undefined && (
                                    <Badge
                                        variant={positive ? 'success' : 'destructive'}
                                        appearance="light"
                                        className="text-[11px] px-1.5 py-0.5"
                                    >
                                        {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                        {Math.abs(delta).toFixed(1)}%
                                    </Badge>
                                )}
                            </div>
                        </div>
                        {Icon && (
                            <div className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-lg',
                                'bg-muted/60',
                            )}>
                                <Icon className={cn('h-5 w-5', iconColor)} />
                            </div>
                        )}
                    </div>

                    {lastValue !== undefined && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            {lastLabel}:{' '}
                            <span className="font-medium text-foreground">
                                {typeof lastValue === 'number' ? formatNumber(lastValue) : lastValue}
                            </span>
                        </p>
                    )}
                </div>

                {/* Sparkline - bleeds to card edges */}
                {sparkData && sparkData.length >= 1 ? (
                    <div className="mt-3 h-[56px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparkData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={sparkColor} stopOpacity={0.15} />
                                        <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={sparkColor}
                                    strokeWidth={1.5}
                                    strokeDasharray={sparkData.length < 3 ? '0' : '4 2'}
                                    fill={`url(#${gradientId})`}
                                    dot={sparkData.length <= 7 ? { r: 2.5, fill: sparkColor, strokeWidth: 0 } : false}
                                    activeDot={{ r: 4, fill: sparkColor, strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-5" />
                )}
            </CardContent>
        </Card>
    );
}
