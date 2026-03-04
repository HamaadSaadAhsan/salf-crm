import { Badge } from '@/components/ui/badge';
import type { TicketPriorityValue } from '@/types/ticket';

const priorityConfig: Record<string, { variant: 'secondary' | 'primary' | 'warning' | 'destructive'; appearance: 'light'; label: string }> = {
    low: { variant: 'secondary', appearance: 'light', label: 'Low' },
    medium: { variant: 'primary', appearance: 'light', label: 'Medium' },
    high: { variant: 'warning', appearance: 'light', label: 'High' },
    critical: { variant: 'destructive', appearance: 'light', label: 'Critical' },
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriorityValue }) {
    const config = priorityConfig[priority] ?? { variant: 'secondary' as const, appearance: 'light' as const, label: priority };

    return (
        <Badge variant={config.variant} appearance={config.appearance} size="sm">
            {config.label}
        </Badge>
    );
}
