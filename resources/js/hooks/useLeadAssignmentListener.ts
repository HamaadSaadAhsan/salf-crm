import { useCallback } from 'react';
import { toast } from 'sonner';
import { useEcho } from '@laravel/echo-react';

interface LeadAssignedData {
    lead_id: string;
    lead_name: string;
    assignee_id: number;
    assignee_name: string;
    assignment_type: 'cro' | 'advisor';
    assigned_by_id?: number;
    assigned_by_name?: string;
    timestamp: string;
}

interface UseLeadAssignmentListenerOptions {
    userId: number;
    enabled?: boolean;
    onLeadAssigned?: (data: LeadAssignedData) => void;
}

export function useLeadAssignmentListener({
    userId,
    enabled = true,
    onLeadAssigned,
}: UseLeadAssignmentListenerOptions) {

    const handleLeadAssigned = useCallback((event: LeadAssignedData) => {
        console.log('Lead assigned event received:', event);

        // Show toast notification based on assignment type
        if (event.assignment_type === 'advisor') {
            toast.success('New Qualified Lead Assigned!', {
                description: `You have been assigned to "${event.lead_name}"${event.assigned_by_name ? ` by ${event.assigned_by_name}` : ''}.`,
                duration: 8000,
                action: {
                    label: 'View Lead',
                    onClick: () => window.location.href = `/leads/${event.lead_id}`,
                },
            });
        } else if (event.assignment_type === 'cro') {
            toast.info('New Lead Assigned', {
                description: `You have been assigned to "${event.lead_name}" for initial contact.`,
                duration: 6000,
                action: {
                    label: 'View Lead',
                    onClick: () => window.location.href = `/leads/${event.lead_id}`,
                },
            });
        }

        // Call custom callback if provided
        if (onLeadAssigned) {
            onLeadAssigned(event);
        }
    }, [onLeadAssigned]);

    // Subscribe to user's private channel for lead assignments
    useEcho(`user.${userId}`, '.lead.assigned', (event: LeadAssignedData) => {
        if (enabled) {
            handleLeadAssigned(event);
        }
    });

    return null;
}
