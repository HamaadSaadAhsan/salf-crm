import { useEcho } from '@laravel/echo-react';
import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';
import { callNotes } from '@/routes/api/asterisk';
import { update as updateLead } from '@/routes/leads';

export interface InboundCallData {
    event: 'ring' | 'connect' | 'disconnect' | 'hangup';
    caller: string;
    exten: string;
    uniqueid: string;
    linkedid?: string;
    lead?: {
        id: string;
        name: string;
        email?: string;
        phone: string;
        city?: string;
        country?: string;
        service?: { id: number; name: string };
        assigned_to?: { id: number; name: string };
        inquiry_status: string;
        priority: string;
        detail?: string;
        budget?: any;
        tags?: any;
        lead_score?: number;
        last_activity_at?: string;
    };
    timestamp: string;
}

export interface ActiveCall extends InboundCallData {
    startTime: Date;
    duration: number;
}

export function useInboundCalls() {
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [callHistory, setCallHistory] = useState<InboundCallData[]>([]);

    // Subscribe to inbound call events using useEcho hook
    useEcho('inbound-calls', '.inbound.call', (data: InboundCallData) => {
        console.log('Inbound call event received:', data);

        // Update call history
        setCallHistory((prev) => [data, ...prev.slice(0, 49)]);

        // Handle different call events
        switch (data.event) {
            case 'ring':
                handleRingEvent(data);
                break;
            case 'connect':
                handleConnectEvent(data);
                break;
            case 'disconnect':
            case 'hangup':
                handleDisconnectEvent(data);
                break;
        }
    });

    const handleRingEvent = (data: InboundCallData) => {
        const newCall: ActiveCall = {
            ...data,
            startTime: new Date(),
            duration: 0,
        };

        setActiveCall(newCall);

        // Play notification sound
        playNotificationSound('normal');

        // Show toast notification
        toast.info(`Incoming call from ${data.caller}`, {
            description: data.lead ? `Lead: ${data.lead.name}` : 'New caller',
            duration: 10000,
        });
    };

    const handleConnectEvent = (data: InboundCallData) => {
        setActiveCall((prev) => {
            // Match by either uniqueid or linkedid (same call session)
            const isSameCall = prev && (
                prev.uniqueid === data.uniqueid ||
                prev.linkedid === data.linkedid ||
                prev.uniqueid === data.linkedid
            );

            if (isSameCall) {
                // Merge new data with existing call state
                // IMPORTANT: Preserve lead data from prev if new data doesn't have it
                return {
                    ...prev,
                    ...data,
                    lead: data.lead || prev.lead, // Keep existing lead if new event doesn't have one
                    event: 'connect',
                    startTime: prev.startTime, // Keep original start time
                };
            }
            return {
                ...data,
                startTime: new Date(),
                duration: 0,
            };
        });

        toast.success('Call connected', {
            description: `Connected with ${data.caller}`,
        });
    };

    const handleDisconnectEvent = (data: InboundCallData) => {
        setActiveCall((prev) => {
            // Match by either uniqueid or linkedid (same call session)
            const isSameCall = prev && (
                prev.uniqueid === data.uniqueid ||
                prev.linkedid === data.linkedid ||
                prev.uniqueid === data.linkedid
            );

            if (isSameCall) {
                return null;
            }
            return prev;
        });

        toast.info('Call ended', {
            description: `Call with ${data.caller} has ended`,
        });
    };

    const playNotificationSound = (priority: 'normal' | 'high' | 'urgent' | 'overdue' = 'normal') => {
        try {
            const audio = new Audio(`/sounds/${priority}.mp3`);
            audio.volume = 0.5;
            audio.play().catch((err) => console.error('Error playing sound:', err));
        } catch (err) {
            console.error('Error creating audio:', err);
        }
    };

    const updateLeadFromCall = async (
        leadId: string,
        leadData: {
            name?: string;
            email?: string;
            city?: string;
            service_id?: number;
            detail?: string;
            budget?: any;
        },
        notes: string,
        duration: number
    ) => {
        if (!activeCall) {
            throw new Error('No active call');
        }

        try {
            // Generate the update URL
            const updateUrl = updateLead(leadId).url;
            console.log('Updating lead:', { leadId, updateUrl, leadData });

            // Update the lead information
            await axios.put(updateUrl, leadData);

            // Save call notes as activity
            await axios.post(callNotes().url, {
                lead_id: leadId,
                notes,
                uniqueid: activeCall.uniqueid,
                duration,
            });

            toast.success('Lead updated and notes saved successfully');

            return true;
        } catch (error: any) {
            console.error('Failed to update lead:', error);
            toast.error('Failed to update lead', {
                description: error.response?.data?.message || 'An error occurred',
            });
            throw error;
        }
    };

    return {
        activeCall,
        callHistory,
        updateLeadFromCall,
    };
}
