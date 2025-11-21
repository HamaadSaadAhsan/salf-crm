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
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
};

export function StatCard({ label, value, icon: Icon, color = 'blue', onClick }: StatCardProps) {
    return (
        <Card
            className={cn(
                'transition-all hover:shadow-md',
                onClick && 'cursor-pointer hover:scale-105'
            )}
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                        <p className="text-3xl font-bold mt-2">{value}</p>
                    </div>
                    <div className={cn('p-3 rounded-lg', colorClasses[color])}>
                        <Icon className="h-6 w-6" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
