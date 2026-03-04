import { Badge } from '@/components/ui/badge';
import type { TicketStatusValue } from '@/types/ticket';

const statusConfig: Record<string, { variant: 'primary' | 'warning' | 'success' | 'secondary'; appearance: 'light'; label: string }> = {
    open: { variant: 'primary', appearance: 'light', label: 'Open' },
    in_progress: { variant: 'warning', appearance: 'light', label: 'In Progress' },
    resolved: { variant: 'success', appearance: 'light', label: 'Resolved' },
    closed: { variant: 'secondary', appearance: 'light', label: 'Closed' },
};

export function TicketStatusBadge({ status }: { status: TicketStatusValue }) {
    const config = statusConfig[status] ?? { variant: 'secondary' as const, appearance: 'light' as const, label: status };

    return (
        <Badge variant={config.variant} appearance={config.appearance} size="sm">
            {config.label}
        </Badge>
    );
}
