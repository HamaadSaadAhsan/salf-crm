import { Badge } from '@/components/ui/badge';
import { Bug, Lightbulb } from 'lucide-react';
import type { TicketTypeValue } from '@/types/ticket';

const typeConfig: Record<string, { variant: 'destructive' | 'primary'; icon: typeof Bug; label: string }> = {
    bug_report: { variant: 'destructive', icon: Bug, label: 'Bug Report' },
    feature_request: { variant: 'primary', icon: Lightbulb, label: 'Feature Request' },
};

export function TicketTypeBadge({ type }: { type: TicketTypeValue }) {
    const config = typeConfig[type] ?? { variant: 'primary' as const, icon: Lightbulb, label: type };
    const Icon = config.icon;

    return (
        <Badge variant={config.variant} appearance="light" size="sm">
            <Icon className="size-3" />
            {config.label}
        </Badge>
    );
}
