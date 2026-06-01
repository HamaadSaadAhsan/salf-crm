import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreGaugeCardProps {
    title: string;
    score: number;
    maxScore?: number;
    delta?: number;
    lastValue?: string | number;
    lastLabel?: string;
    positive?: boolean;
    isLoading?: boolean;
    icon?: LucideIcon;
    iconColor?: string;
}

function getScoreColor(score: number, max: number): string {
    const pct = score / max;
    if (pct >= 0.7) return '#22c55e';
    if (pct >= 0.4) return '#f59e0b';
    return '#ef4444';
}

function ArcGauge({ score, maxScore, color }: { score: number; maxScore: number; color: string }) {
    const pct = Math.min(Math.max(score / maxScore, 0), 1);

    // Fixed compact semicircle: viewBox 0 0 120 64
    // Center at (60, 60), radius 44, strokeWidth 5
    // Arc spans from 180° to 0° (left to right along top)
    const cx = 60, cy = 60, r = 44, sw = 5;

    const toXY = (deg: number) => ({
        x: cx + r * Math.cos((deg * Math.PI) / 180),
        y: cy + r * Math.sin((deg * Math.PI) / 180),
    });

    const bgS = toXY(180);
    const bgE = toXY(0);
    const bgPath = `M ${bgS.x.toFixed(2)} ${bgS.y.toFixed(2)} A ${r} ${r} 0 0 1 ${bgE.x.toFixed(2)} ${bgE.y.toFixed(2)}`;

    const fgEndDeg = 180 - pct * 180;
    const fgE = toXY(fgEndDeg);
    const large = pct > 0.5 ? 1 : 0;
    const fgPath =
        pct <= 0.005
            ? ''
            : pct >= 0.995
                ? bgPath
                : `M ${bgS.x.toFixed(2)} ${bgS.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${fgE.x.toFixed(2)} ${fgE.y.toFixed(2)}`;

    return (
        // viewBox height 64 — arc top is at cy-r = 60-44 = 16, minus half stroke = 13.5
        // We crop at y=12 via the viewBox, showing only the arc portion
        <svg
            viewBox="0 12 120 52"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
        >
            <path
                d={bgPath}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.12}
                strokeWidth={sw}
                strokeLinecap="round"
            />
            {fgPath && (
                <path
                    d={fgPath}
                    fill="none"
                    stroke={color}
                    strokeWidth={sw}
                    strokeLinecap="round"
                />
            )}
        </svg>
    );
}

export function ScoreGaugeCard({
    title,
    score,
    maxScore = 100,
    delta,
    lastValue,
    lastLabel = 'Vs last month',
    positive = true,
    isLoading = false,
    icon: Icon,
    iconColor = 'text-primary',
}: ScoreGaugeCardProps) {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-20" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-lg" />
                    </div>
                    <Skeleton className="mt-4 h-[56px] w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    const color = getScoreColor(score, maxScore);

    return (
        <Card>
            <CardContent className="p-0">
                <div className="p-5 pb-0">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                            <p className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
                                {title}
                            </p>
                            <div className="flex items-baseline gap-2.5">
                                <span className="text-[28px] font-semibold tracking-tight leading-none tabular-nums">
                                    {Math.round(score)}
                                </span>
                                <span className="text-sm text-muted-foreground">/ {maxScore}</span>
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60">
                                <Icon className={cn('h-5 w-5', iconColor)} />
                            </div>
                        )}
                    </div>

                    {lastValue !== undefined && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            {lastLabel}:{' '}
                            <span className="font-medium text-foreground">{lastValue}</span>
                        </p>
                    )}
                </div>

                {/* Arc gauge — same slot & height as sparkline, strictly clipped */}
                <div className="mt-3 h-[56px] overflow-hidden">
                    <ArcGauge score={score} maxScore={maxScore} color={color} />
                </div>
            </CardContent>
        </Card>
    );
}
