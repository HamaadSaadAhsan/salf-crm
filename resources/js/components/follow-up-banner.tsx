import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Bell, PhoneMissed, UserCheck, X } from 'lucide-react';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
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
                <Alert variant="warning" appearance="light" size="sm">
                    <AlertIcon>
                        <PhoneMissed />
                    </AlertIcon>
                    <AlertContent>
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
                    </AlertContent>
                    <Button
                        size="sm"
                        variant="inverse"
                        mode="icon"
                        onClick={() => handleDismiss(categorizedFollowUps.missedCalls[0].id)}
                        aria-label="Dismiss"
                        className="shrink-0 size-4"
                    >
                        <X className="opacity-60 hover:opacity-100 size-4" />
                    </Button>
                </Alert>
            )}

            {/* Contacted Leads Banner */}
            {categorizedFollowUps.contactedLeads.length > 0 && (
                <Alert variant="info" appearance="light" size="sm">
                    <AlertIcon>
                        <UserCheck />
                    </AlertIcon>
                    <AlertContent>
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
                    </AlertContent>
                    <Button
                        size="sm"
                        variant="inverse"
                        mode="icon"
                        onClick={() => handleDismiss(categorizedFollowUps.contactedLeads[0].id)}
                        aria-label="Dismiss"
                        className="shrink-0 size-4"
                    >
                        <X className="opacity-60 hover:opacity-100 size-4" />
                    </Button>
                </Alert>
            )}

            {/* General Follow-ups Banner */}
            {categorizedFollowUps.general.length > 0 && (
                <Alert variant="primary" appearance="light" size="sm">
                    <AlertIcon>
                        <Bell />
                    </AlertIcon>
                    <AlertContent>
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
                    </AlertContent>
                    <Button
                        size="sm"
                        variant="inverse"
                        mode="icon"
                        onClick={() => handleDismiss(categorizedFollowUps.general[0].id)}
                        aria-label="Dismiss"
                        className="shrink-0 size-4"
                    >
                        <X className="opacity-60 hover:opacity-100 size-4" />
                    </Button>
                </Alert>
            )}
        </div>
    );
}
