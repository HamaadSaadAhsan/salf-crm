import { useCallback } from 'react';
import { toast } from 'sonner';
import { useEcho } from '@laravel/echo-react';

interface LeadQualifiedData {
    lead_id: string;
    lead_name: string;
    qualified_by_id: number;
    qualified_by_name: string;
    lead_score?: number;
    timestamp: string;
}

interface UseLeadQualifiedListenerOptions {
    enabled?: boolean;
    onLeadQualified?: (data: LeadQualifiedData) => void;
}

export function useLeadQualifiedListener({
    enabled = true,
    onLeadQualified,
}: UseLeadQualifiedListenerOptions) {

    const handleLeadQualified = useCallback((event: LeadQualifiedData) => {
        console.log('Lead qualified event received:', event);

        // Call custom callback if provided
        if (onLeadQualified) {
            onLeadQualified(event);
        }
    }, [onLeadQualified]);

    // Subscribe to global leads channel for qualified events
    useEcho('leads', '.lead.qualified', (event: LeadQualifiedData) => {
        if (enabled) {
            handleLeadQualified(event);
        }
    });

    return null;
}
