import { useState } from 'react';
import { router } from '@inertiajs/react';
import { CalendarClock, X } from 'lucide-react';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface PendingTask {
    id: number;
    title: string;
    type: string;
    priority: string;
    due_at: string | null;
    is_overdue: boolean;
    lead_id: string | null;
    lead_name: string | null;
}

interface FollowUpBannerProps {
    tasks: PendingTask[];
}

export function FollowUpBanner({ tasks }: FollowUpBannerProps) {
    const [isDismissed, setIsDismissed] = useState(false);

    if (isDismissed || !tasks || tasks.length === 0) return null;

    const overdueCount = tasks.filter((t) => t.is_overdue).length;

    const handleView = () => {
        const first = tasks[0];
        if (first?.lead_id) {
            router.visit(`/leads/${first.lead_id}`);
        }
    };

    return (
        <Alert
            variant={overdueCount > 0 ? 'warning' : 'info'}
            appearance="light"
            size="sm"
            className="items-center"
        >
            <AlertIcon>
                <CalendarClock />
            </AlertIcon>
            <AlertContent className="flex-1">
                <AlertTitle>
                    {tasks.length} pending follow-up{tasks.length > 1 ? 's' : ''}{' '}
                    {overdueCount > 0 ? 'overdue' : 'due today'}
                </AlertTitle>
                <AlertDescription>
                    {overdueCount > 0
                        ? `You have ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} that need${overdueCount === 1 ? 's' : ''} attention.`
                        : 'You have follow-up tasks due today.'}{' '}
                    <button
                        onClick={handleView}
                        className="font-medium underline hover:no-underline"
                    >
                        View details
                    </button>
                </AlertDescription>
            </AlertContent>
            <Button
                size="sm"
                variant="inverse"
                mode="icon"
                onClick={() => setIsDismissed(true)}
                aria-label="Dismiss"
                className="shrink-0 size-4"
            >
                <X className="opacity-60 hover:opacity-100 size-4" />
            </Button>
        </Alert>
    );
}
