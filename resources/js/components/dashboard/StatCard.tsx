import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
    onClick?: () => void;
}

const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400',
    yellow: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400',
};

export function StatCard({ label, value, icon: Icon, color = 'blue', onClick }: StatCardProps) {
    return (
        <Card
            className={cn(
                'ring-1 ring-transparent transition-all duration-200 hover:shadow-md hover:ring-border',
                onClick && 'cursor-pointer',
            )}
            onClick={onClick}
        >
            <CardContent className="flex items-center gap-4 p-5">
                <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', colorClasses[color])}>
                    <Icon className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-1 truncate text-2xl font-semibold tabular-nums leading-tight">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
