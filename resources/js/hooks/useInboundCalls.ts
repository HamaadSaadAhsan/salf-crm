import { useEcho } from '@laravel/echo-react';
import { usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { callNotes, callLead } from '@/routes/api/asterisk';
import { update as updateLead } from '@/routes/leads';
import type { SharedData } from '@/types';

export interface InboundCallData {
    event: 'ring' | 'connect' | 'disconnect' | 'hangup';
    caller: string;
    exten: string;
    uniqueid: string;
    linkedid?: string;
    sessionId: string;
    call_direction?: 'inbound' | 'outbound';
    target_extension?: string;
    agent_extension?: string;
    answered_by_user_id?: number;
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
        budget?: {
            amount: number;
        };
        tags?: Record<string, string>;
        lead_score?: number;
        last_activity_at?: string;
    };
    timestamp: string;
}

export interface ActiveCall extends InboundCallData {
    startTime: Date;
    duration: number;
    isOwner: boolean; // Whether current user owns this call (picked it up or initiated it)
}

export function useInboundCalls() {
    const { auth } = usePage<SharedData>().props;
    const currentUserExtension = auth.user.extension;
    const currentUserId = auth.user.id;

    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [callHistory, setCallHistory] = useState<InboundCallData[]>([]);

    // Check if current user should own this call
    const isCallOwner = useCallback((data: InboundCallData, event: string): boolean => {
        // For inbound calls:
        // - Ring: Everyone sees it (return false for ownership, but show notification)
        // - Connect: Only the CRO who answered (their extension matches) owns it
        // - Hangup: Only the owner should see the dialog close

        if (data.call_direction === 'outbound') {
            // Outbound call: Only the agent who made the call owns it
            return data.agent_extension === currentUserExtension;
        }

        // Inbound call
        if (event === 'ring') {
            // Everyone should see ring events, but no one "owns" it yet
            return false;
        }

        if (event === 'connect') {
            // The CRO who answered owns the call
            // Check by user ID first (most reliable), then by extension
            if (data.answered_by_user_id) {
                return data.answered_by_user_id === currentUserId;
            }
            return data.exten === currentUserExtension;
        }

        // For disconnect/hangup, check if we were the owner of the active call
        return false;
    }, [currentUserExtension, currentUserId]);

    // Subscribe to inbound call events using useEcho hook
    useEcho('inbound-calls', '.inbound.call', (data: InboundCallData) => {
        console.log('Inbound call event received:', data, {
            currentUserExtension,
            currentUserId,
            isOwner: isCallOwner(data, data.event)
        });

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
        // For ring events, everyone should see the notification
        // (so all CROs know there's an incoming call)
        const newCall: ActiveCall = {
            ...data,
            startTime: new Date(),
            duration: 0,
            isOwner: false, // No one owns the call during ring
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
        const isOwner = isCallOwner(data, 'connect');

        setActiveCall((prev) => {
            // Match by either uniqueid or linkedid (same call session)
            const isSameCall = prev && (
                prev.uniqueid === data.uniqueid ||
                prev.linkedid === data.linkedid ||
                prev.uniqueid === data.linkedid
            );

            if (isSameCall) {
                // If another CRO picked up the call, clear it from non-owners
                if (!isOwner) {
                    console.log('Call picked up by another CRO, clearing from current user');
                    return null;
                }

                // Merge new data with existing call state for the owner
                // IMPORTANT: Preserve lead data from prev if new data doesn't have it
                return {
                    ...prev,
                    ...data,
                    lead: data.lead || prev.lead, // Keep existing lead if new event doesn't have one
                    event: 'connect',
                    startTime: prev.startTime, // Keep original start time
                    isOwner: true,
                };
            }

            // If we didn't have an active call but we're the owner, create it
            if (isOwner) {
                return {
                    ...data,
                    startTime: new Date(),
                    duration: 0,
                    isOwner: true,
                };
            }

            return prev;
        });

        // Only show toast to the owner
        if (isOwner) {
            toast.success('Call connected', {
                description: `Connected with ${data.caller}`,
            });
        }
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
                // Only show toast if we were the owner
                if (prev.isOwner) {
                    toast.info('Call ended', {
                        description: `Call with ${data.caller} has ended`,
                    });
                }
                return null;
            }
            return prev;
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
            budget?: { amount: number };
        },
        notes: string,
        duration: number
    ): Promise<void> => {
        if (!activeCall) {
            throw new Error('No active call');
        }

        try {
            // Generate the update URL
            const updateUrl = updateLead(leadId).url;
            console.log('Updating lead:', { leadId, updateUrl, leadData });

            // Update the lead information
            // Add X-Inertia: false header to prevent Inertia redirect handling
            await axios.put(updateUrl, leadData, {
                headers: {
                    'X-Inertia': 'false',
                    'Accept': 'application/json',
                },
            });

            // Save call notes as activity
            await axios.post(callNotes().url, {
                lead_id: leadId,
                notes,
                uniqueid: activeCall.uniqueid,
                duration,
            });

            toast.success('Lead updated and notes saved successfully');
        } catch (error: any) {
            console.error('Failed to update lead:', error);
            toast.error('Failed to update lead', {
                description: error.response?.data?.message || 'An error occurred',
            });
            throw error;
        }
    };

    const createLeadFromCall = async (
        leadData: {
            name: string;
            phone: string;
            email?: string;
            city?: string;
            service_id?: number;
            detail?: string;
            budget?: { amount: number };
        },
        notes: string,
        duration: number,
        sessionId: string
    ): Promise<void> => {
        if (!activeCall) {
            throw new Error('No active call');
        }

        try {
            // Create the lead using the asterisk call-lead endpoint
            const storeUrl = callLead().url;
            console.log('Creating lead from call:', { storeUrl, leadData });

            const response = await axios.post(storeUrl, {
                ...leadData,
                uniqueid: activeCall.uniqueid,
                caller: activeCall.caller,
            }, {
                headers: {
                    'X-Inertia': 'false',
                    'Accept': 'application/json',
                },
            });

            const newLeadId = response.data?.data?.lead?.id || response.data?.data?.id;

            if (!newLeadId) {
                throw new Error('Failed to get new lead ID from response');
            }

            // Save call notes as activity
            await axios.post(callNotes().url, {
                lead_id: newLeadId,
                notes,
                uniqueid: activeCall.uniqueid,
                duration,
            });

            // Update call session to link to the new lead (if not already linked by storeCallLead)
            if (sessionId) {
                try {
                    await axios.patch(`/api/asterisk/call-sessions/${sessionId}/link-lead`, {
                        lead_id: newLeadId,
                    });
                } catch (linkError) {
                    console.warn('Failed to link lead to call session:', linkError);
                }
            }

            toast.success('Lead created and notes saved successfully');
        } catch (error: any) {
            console.error('Failed to create lead:', error);
            toast.error('Failed to create lead', {
                description: error.response?.data?.message || 'An error occurred',
            });
            throw error;
        }
    };

    return {
        activeCall,
        callHistory,
        updateLeadFromCall,
        createLeadFromCall,
    };
}
