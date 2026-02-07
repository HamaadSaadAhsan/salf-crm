import { useCallback } from 'react';
import { toast } from 'sonner';
import { useEcho } from '@laravel/echo-react';
import { router } from '@inertiajs/react';

interface LeadRequalifiedData {
    lead_id: string;
    lead_name: string;
    requalified_by_id: number;
    requalified_by_name: string;
    original_advisor_id?: number;
    original_advisor_name?: string;
    reason: string;
    timestamp: string;
}

interface UseLeadRequalifiedListenerOptions {
    userId: number;
    enabled?: boolean;
    onLeadRequalified?: (data: LeadRequalifiedData) => void;
}

export function useLeadRequalifiedListener({
    userId,
    enabled = true,
    onLeadRequalified,
}: UseLeadRequalifiedListenerOptions) {
    const handleLeadRequalified = useCallback((event: LeadRequalifiedData) => {
        console.log('Lead requalified event received:', event);

        // Play urgent notification sound
        try {
            const audio = new Audio('/sounds/urgent.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch {
            // Ignore audio errors
        }

        // Show urgent toast notification
        toast.warning('Lead Sent Back for Requalification', {
            description: `"${event.lead_name}" sent back by ${event.requalified_by_name}.${event.reason ? ` Reason: ${event.reason}` : ''}`,
            duration: 15000,
            action: {
                label: 'View Lead',
                onClick: () => (window.location.href = `/leads/${event.lead_id}`),
            },
        });

        // Reload current page props so dashboard data refreshes
        router.reload({ only: ['data'] });

        // Call custom callback if provided
        if (onLeadRequalified) {
            onLeadRequalified(event);
        }
    }, [onLeadRequalified]);

    // Subscribe to user's private channel for requalification events
    useEcho(`user.${userId}`, '.lead.requalified', (event: LeadRequalifiedData) => {
        if (enabled) {
            handleLeadRequalified(event);
        }
    });

    return null;
}
