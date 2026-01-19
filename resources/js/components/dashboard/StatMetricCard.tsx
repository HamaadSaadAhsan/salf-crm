import {
    ArrowDown,
    ArrowUp,
    MoreHorizontal,
    Pin,
    Settings,
    Share2,
    Trash,
    TriangleAlert,
    LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardToolbar,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

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
    icon: _icon,
    showActions = false,
}: StatMetricCardProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="border-0">
                    <CardTitle className="text-muted-foreground text-sm font-medium">
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-4 w-32" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="border-0">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                    {title}
                </CardTitle>
                {showActions && (
                    <CardToolbar>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="dim"
                                    size="sm"
                                    mode="icon"
                                    className="-me-1.5"
                                >
                                    <MoreHorizontal />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="bottom">
                                <DropdownMenuItem>
                                    <Settings />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <TriangleAlert /> Add Alert
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Pin /> Pin to Dashboard
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Share2 /> Share
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive">
                                    <Trash />
                                    Remove
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardToolbar>
                )}
            </CardHeader>
            <CardContent className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-medium text-foreground tracking-tight">
                        {typeof value === 'number' ? formatNumber(value) : value}
                    </span>
                    {delta !== undefined && (
                        <Badge
                            variant={positive ? 'success' : 'destructive'}
                            appearance="light"
                        >
                            {delta > 0 ? <ArrowUp /> : <ArrowDown />}
                            {Math.abs(delta).toFixed(1)}%
                        </Badge>
                    )}
                </div>
                {lastValue !== undefined && (
                    <div className="text-xs text-muted-foreground mt-2 border-t pt-2.5">
                        {lastLabel}:{' '}
                        <span className="font-medium text-foreground">
                            {typeof lastValue === 'number'
                                ? formatNumber(lastValue)
                                : lastValue}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
