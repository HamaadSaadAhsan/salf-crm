import { LucideIcon } from 'lucide-react';
import { StatMetricCard } from '@/components/dashboard/StatMetricCard';
import { formatNumber, formatPercent } from '@/lib/dashboard-utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface SummaryCardItem {
    title: string;
    value: number | string;
    format?: 'number' | 'percent' | 'days' | 'raw';
    icon?: LucideIcon;
    iconColor?: string;
    sparkData?: Array<{ value: number }>;
    sparkColor?: string;
}

interface ReportSummaryCardsProps {
    items: SummaryCardItem[];
    isLoading?: boolean;
    columns?: 2 | 3 | 4;
}

function formatValue(value: number | string, fmt?: string): string {
    if (typeof value === 'string') return value;
    switch (fmt) {
        case 'percent':
            return formatPercent(value);
        case 'days':
            return `${value.toFixed(1)}d`;
        case 'number':
            return formatNumber(value);
        default:
            return typeof value === 'number' ? formatNumber(value) : String(value);
    }
}

export function ReportSummaryCards({ items, isLoading = false, columns = 4 }: ReportSummaryCardsProps) {
    const gridCols = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    };

    if (isLoading) {
        return (
            <div className={`grid gap-4 ${gridCols[columns]}`}>
                {Array.from({ length: items.length || columns }).map((_, i) => (
                    <StatMetricCard key={i} title="" value="" isLoading />
                ))}
            </div>
        );
    }

    return (
        <div className={`grid gap-4 ${gridCols[columns]}`}>
            {items.map((item) => (
                <StatMetricCard
                    key={item.title}
                    title={item.title}
                    value={formatValue(item.value, item.format)}
                    icon={item.icon}
                    iconColor={item.iconColor}
                    sparkData={item.sparkData}
                    sparkColor={item.sparkColor}
                />
            ))}
        </div>
    );
}
