import { useEcho } from '@laravel/echo-react';
import { usePage } from '@inertiajs/react';
import axios, { AxiosError } from 'axios';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { callNotes, callLead } from '@/routes/api/asterisk';
import { update as updateLead } from '@/routes/leads';
import type { SharedData } from '@/types';

export interface InboundCallData {
    event: 'ring' | 'connect' | 'disconnect' | 'hangup' | 'stop_ringing';
    caller: string;
    exten: string;
    uniqueid: string;
    linkedid?: string;
    sessionId: string;
    call_direction?: 'inbound' | 'outbound';
    target_extension?: string;
    agent_extension?: string;
    answered_by_user_id?: number;
    intended_for_user_id?: number;
    is_coverage_call?: boolean;
    reason?: string; // For stop_ringing: timeout, caller_hangup, busy, answered_elsewhere
    dialstatus?: string; // For stop_ringing: NOANSWER, CANCEL, BUSY, etc.
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
    isCoverageCall: boolean; // Whether this is a coverage call (answered by non-assigned CRO)
}

export function useInboundCalls() {
    const { auth } = usePage<SharedData>().props;
    const currentUserExtension = auth.user.extension;
    const currentUserId = auth.user.id;

    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [callHistory, setCallHistory] = useState<InboundCallData[]>([]);

    // Fetch active call on mount (for page refresh persistence)
    useEffect(() => {
        const fetchActiveCall = async () => {
            try {
                const response = await axios.get('/api/calls/active');
                const data = response.data;

                if (data.success && data.active_call) {
                    console.log('Restored active call from server:', data.active_call);

                    // Parse the start time from the server
                    const startTime = data.active_call.started_at
                        ? new Date(data.active_call.started_at)
                        : new Date();

                    const restoredCall: ActiveCall = {
                        event: data.active_call.event,
                        caller: data.active_call.caller,
                        exten: data.active_call.exten,
                        uniqueid: data.active_call.uniqueid || '',
                        sessionId: data.active_call.sessionId,
                        call_direction: data.active_call.call_direction,
                        target_extension: data.active_call.target_extension,
                        agent_extension: data.active_call.agent_extension,
                        answered_by_user_id: data.active_call.answered_by_user_id,
                        intended_for_user_id: data.active_call.intended_for_user_id,
                        is_coverage_call: data.active_call.is_coverage_call,
                        lead: data.active_call.lead,
                        timestamp: new Date().toISOString(),
                        startTime,
                        duration: 0,
                        // User is owner if call is connected and they answered it
                        isOwner: data.active_call.event === 'connect',
                        isCoverageCall: data.active_call.is_coverage_call || false,
                    };

                    setActiveCall(restoredCall);
                }
            } catch (error) {
                console.error('Failed to fetch active call:', error);
            }
        };

        fetchActiveCall();
    }, []);

    // // Verify if a call is still active via backend API
    // const verifyCallStatus = useCallback(async (uniqueid: string): Promise<boolean> => {
    //     try {
    //         const response = await axios.get(`/api/calls/status/${uniqueid}`);
    //         return response.data.is_active;
    //     } catch (error) {
    //         console.error('Failed to verify call status:', error);
    //         return false;
    //     }
    // }, []);

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

        // QUICK FIX: Skip customer leg connect events
        if (data.event === 'connect' &&
            data.call_direction === 'inbound' &&
            data.caller === currentUserExtension &&
            data.exten !== currentUserExtension) {
            console.log('Skipping customer leg connect event', data);
            return;
        }

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
            case 'stop_ringing':
                handleStopRingingEvent(data);
                break;
            case 'disconnect':
            case 'hangup':
                handleDisconnectEvent(data);
                break;
        }
    });

    const handleRingEvent = (data: InboundCallData) => {
        // Filter: Only show ring notification to the target extension
        const targetExtension = data.target_extension || data.exten;

        if (data.call_direction === 'outbound') {
            // Outbound call: Only show to the agent who initiated it
            if (data.agent_extension !== currentUserExtension) {
                console.log('Outbound call ring: Not for current user', {
                    agent_extension: data.agent_extension,
                    currentUserExtension,
                });
                return;
            }
        } else {
            // Inbound call: Only show to the CRO whose extension is being called
            if (targetExtension !== currentUserExtension) {
                console.log('Inbound call ring: Not for current user', {
                    targetExtension,
                    currentUserExtension,
                });
                return;
            }
        }

        const newCall: ActiveCall = {
            ...data,
            startTime: new Date(),
            duration: 0,
            isOwner: false, // No one owns the call during ring
            isCoverageCall: false, // Not determined yet during ring
        };

        setActiveCall(newCall);

        // Play notification sound
        playNotificationSound('normal');
    };

    const handleConnectEvent = (data: InboundCallData) => {
        const isOwner = isCallOwner(data, 'connect');
        const isCoverageCall = data.is_coverage_call || false;

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
                    // Notify the assigned CRO that someone else answered their lead's call
                    if (data.intended_for_user_id === currentUserId && isCoverageCall) {
                        toast.info('Coverage call', {
                            description: 'Another CRO answered the call for your lead. A follow-up task has been created.',
                        });
                    }
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
                    isCoverageCall,
                };
            }

            // If we didn't have an active call but we're the owner, create it
            if (isOwner) {
                return {
                    ...data,
                    startTime: new Date(),
                    duration: 0,
                    isOwner: true,
                    isCoverageCall,
                };
            }

            return prev;
        });
    };

    /**
     * Handle stop_ringing event - conditionally clears the notification when a dial leg ends
     * Only clears the dialog in specific cases:
     * - timeout / NOANSWER: Call wasn't answered by anyone
     * - caller_hangup / CANCEL: Caller hung up before anyone answered
     * - busy / BUSY: All agents were busy
     * - answered_elsewhere: Another CRO answered (only clears for non-owners)
     *
     * For other reasons, the dialog stays open if the current user is the owner.
     */
    const handleStopRingingEvent = (data: InboundCallData) => {
        const targetExtension = data.target_extension || data.exten;

        // Only process if this stop_ringing event is for our extension
        if (targetExtension !== currentUserExtension) {
            console.log('Stop ringing event: Not for current user', {
                targetExtension,
                currentUserExtension,
                reason: data.reason,
            });
            return;
        }

        console.log('Stop ringing event: Processing for current user', {
            targetExtension,
            reason: data.reason,
            dialstatus: data.dialstatus,
            linkedid: data.linkedid,
        });

        setActiveCall((prev) => {
            // Only clear if this is for the same call (match by linkedid or uniqueid)
            const isSameCall = prev && (
                prev.uniqueid === data.uniqueid ||
                prev.linkedid === data.linkedid ||
                prev.uniqueid === data.linkedid
            );

            if (isSameCall) {
                // Check the reason for stop_ringing
                // We should ONLY clear the dialog in specific cases:
                // - timeout (call wasn't answered by anyone)
                // - caller_hangup (caller hung up before anyone answered)
                // - busy (all agents were busy)
                // - CANCEL, NOANSWER dialstatus

                const shouldClearDialog =
                    data.reason === 'timeout' ||
                    data.reason === 'caller_hangup' ||
                    data.reason === 'busy' ||
                    data.dialstatus === 'NOANSWER' ||
                    data.dialstatus === 'CANCEL' ||
                    data.dialstatus === 'BUSY';

                if (shouldClearDialog) {
                    console.log('Clearing active call notification due to stop_ringing with reason:', {
                        reason: data.reason,
                        dialstatus: data.dialstatus,
                    });

                    // Show appropriate toast notification
                    if (data.reason === 'timeout' || data.dialstatus === 'NOANSWER') {
                        toast.info('Call not answered', {
                            description: 'The call was not answered and has ended.',
                        });
                    } else if (data.reason === 'caller_hangup' || data.dialstatus === 'CANCEL') {
                        toast.info('Caller hung up', {
                            description: 'The caller hung up before the call was answered.',
                        });
                    } else if (data.reason === 'busy' || data.dialstatus === 'BUSY') {
                        toast.warning('All agents busy', {
                            description: 'All agents are currently busy.',
                        });
                    }

                    return null;
                } else {
                    // For other reasons (like answered_elsewhere), we should keep the dialog open
                    // if the current user answered the call
                    console.log('Stop ringing event with reason that does not require clearing dialog:', {
                        reason: data.reason,
                        dialstatus: data.dialstatus,
                    });

                    // If the call was answered elsewhere (by another CRO), and we're not the owner,
                    // we should clear the dialog
                    if (data.reason === 'answered_elsewhere' && prev && !prev.isOwner) {
                        console.log('Call answered by another CRO, clearing dialog');
                        return null;
                    }

                    // Otherwise, keep the current call state
                    return prev;
                }
            }

            // If not the same call, keep the current state
            return prev;
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
        duration: number,
        callInfo?: { uniqueid: string; caller: string }
    ): Promise<void> => {
        const call = callInfo || activeCall;
        if (!call) {
            toast.error('The call has ended', {
                description: 'Unable to save changes. Please try again.',
            });
            return;
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
                uniqueid: call.uniqueid,
                duration,
            });

            toast.success('Lead updated and notes saved successfully');
        } catch (error) {
            console.error('Failed to update lead:', error);
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error('Failed to update lead', {
                description: axiosError.response?.data?.message || 'An error occurred',
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
        sessionId: string,
        callInfo?: { uniqueid: string; caller: string }
    ): Promise<void> => {
        const call = callInfo || activeCall;
        if (!call) {
            toast.error('The call has ended', {
                description: 'Unable to create lead. Please try again.',
            });
            return;
        }

        try {
            // Create the lead using the asterisk call-lead endpoint
            const storeUrl = callLead().url;
            console.log('Creating lead from call:', { storeUrl, leadData });

            const response = await axios.post(storeUrl, {
                ...leadData,
                uniqueid: call.uniqueid,
                caller: call.caller,
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
                uniqueid: call.uniqueid,
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
        } catch (error) {
            console.error('Failed to create lead:', error);
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error('Failed to create lead', {
                description: axiosError.response?.data?.message || 'An error occurred',
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
