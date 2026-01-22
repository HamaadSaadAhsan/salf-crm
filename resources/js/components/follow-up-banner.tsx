import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Bell, PhoneMissed, UserCheck, X } from 'lucide-react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { LeadActivity } from '@/types/lead';

interface FollowUpBannerProps {
    activities: LeadActivity[];
}

export function FollowUpBanner({ activities }: FollowUpBannerProps) {
    const [dismissed, setDismissed] = useState<string[]>([]);

    // Categorize follow-ups
    const categorizedFollowUps = useMemo(() => {
        const now = new Date();
        const pending = activities.filter((activity) => {
            if (dismissed.includes(activity.id)) return false;
            if (activity.status !== 'pending') return false;
            if (activity.type !== 'follow_up') return false;

            // Check if it's due or overdue
            if (activity.due_at) {
                const dueDate = new Date(activity.due_at);
                return dueDate <= now;
            }

            return true;
        });

        // Group by category
        const missedCalls = pending.filter(
            (a) => a.metadata?.triggered_by === 'missed_call' || a.category === 'missed_call'
        );
        const contactedLeads = pending.filter(
            (a) =>
                a.metadata?.triggered_by === 'outbound_call_answered' ||
                a.subject?.toLowerCase().includes('contacted lead')
        );
        const general = pending.filter((a) => !missedCalls.includes(a) && !contactedLeads.includes(a));

        return {
            missedCalls,
            contactedLeads,
            general,
            total: pending.length,
        };
    }, [activities, dismissed]);

    const handleDismiss = (activityId: string) => {
        setDismissed((prev) => [...prev, activityId]);
    };

    const handleViewActivity = (activity: LeadActivity) => {
        if (activity.lead_id) {
            router.visit(`/leads/${activity.lead_id}`);
        }
    };

    if (categorizedFollowUps.total === 0) return null;

    return (
        <div className="space-y-2">
            {/* Missed Calls Banner */}
            {categorizedFollowUps.missedCalls.length > 0 && (
                <Alert
                    variant="default"
                    className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
                >
                    <PhoneMissed className="h-4 w-4" />
                    <AlertTitle>
                        {categorizedFollowUps.missedCalls.length} Missed Call
                        {categorizedFollowUps.missedCalls.length > 1 ? 's' : ''} Require Follow-up
                    </AlertTitle>
                    <AlertDescription>
                        You have missed calls that need attention.{' '}
                        <button
                            onClick={() => handleViewActivity(categorizedFollowUps.missedCalls[0])}
                            className="underline font-medium hover:no-underline"
                        >
                            View details
                        </button>
                    </AlertDescription>
                    <AlertAction>
                        <Button
                            size="sm"
                            variant="ghost"
                            mode="icon"
                            onClick={() => handleDismiss(categorizedFollowUps.missedCalls[0].id)}
                            aria-label="Dismiss"
                            className="h-6 w-6"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </AlertAction>
                </Alert>
            )}

            {/* Contacted Leads Banner */}
            {categorizedFollowUps.contactedLeads.length > 0 && (
                <Alert
                    variant="default"
                    className="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-50 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400"
                >
                    <UserCheck className="h-4 w-4" />
                    <AlertTitle>
                        {categorizedFollowUps.contactedLeads.length} Contacted Lead
                        {categorizedFollowUps.contactedLeads.length > 1 ? 's' : ''} Need Follow-up
                    </AlertTitle>
                    <AlertDescription>
                        You have recently contacted leads that require follow-up.{' '}
                        <button
                            onClick={() => handleViewActivity(categorizedFollowUps.contactedLeads[0])}
                            className="underline font-medium hover:no-underline"
                        >
                            View details
                        </button>
                    </AlertDescription>
                    <AlertAction>
                        <Button
                            size="sm"
                            variant="ghost"
                            mode="icon"
                            onClick={() => handleDismiss(categorizedFollowUps.contactedLeads[0].id)}
                            aria-label="Dismiss"
                            className="h-6 w-6"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </AlertAction>
                </Alert>
            )}

            {/* General Follow-ups Banner */}
            {categorizedFollowUps.general.length > 0 && (
                <Alert variant="default">
                    <Bell className="h-4 w-4" />
                    <AlertTitle>
                        {categorizedFollowUps.general.length} Pending Follow-up
                        {categorizedFollowUps.general.length > 1 ? 's' : ''}
                    </AlertTitle>
                    <AlertDescription>
                        You have pending follow-up tasks that are due.{' '}
                        <button
                            onClick={() => handleViewActivity(categorizedFollowUps.general[0])}
                            className="underline font-medium hover:no-underline"
                        >
                            View details
                        </button>
                    </AlertDescription>
                    <AlertAction>
                        <Button
                            size="sm"
                            variant="ghost"
                            mode="icon"
                            onClick={() => handleDismiss(categorizedFollowUps.general[0].id)}
                            aria-label="Dismiss"
                            className="h-6 w-6"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </AlertAction>
                </Alert>
            )}
        </div>
    );
}
