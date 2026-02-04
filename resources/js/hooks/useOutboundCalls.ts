import { useEcho } from '@laravel/echo-react';
import { useAsteriskWebSocket } from '@/contexts/AsteriskWebSocketContext';
import { usePage } from '@inertiajs/react';
import axios, { AxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { callNotes, callLead } from '@/routes/api/asterisk';
import { update as updateLead } from '@/routes/leads';
import type { SharedData } from '@/types';
import type { AsteriskWebSocketMessage, CallRoutingInfo } from '@/types/asterisk';

export interface OutboundCallLead {
    id: string;
    name: string;
    email?: string;
    phone: string;
    city?: string;
    country?: string;
    service?: { id: number; name: string };
    inquiry_status?: string;
    priority?: string;
    detail?: string;
    budget?: {
        amount: number;
    };
}

export interface OutboundCall {
    uniqueid: string;
    linkedid?: string;
    phoneNumber: string;
    leadId?: string | number;
    lead?: OutboundCallLead;
    status: 'initiating' | 'ringing' | 'connected' | 'failed' | 'ended';
    startTime: Date;
    connectedAt?: Date;
    endedAt?: Date;
    duration: number;
    callSignature?: string;
    sessionId?: string;
    /** Call direction - always 'outbound' for this hook */
    direction: 'outbound';
}

/**
 * Data structure from Laravel Echo broadcast for outbound calls
 */
export interface OutboundCallData {
    event: 'ring' | 'connect' | 'hangup';
    agent_extension: string;
    client: string;
    uniqueid: string;
    linkedid?: string;
    sessionId?: string;
    call_direction: 'outbound';
    direction: 'outbound';
    phase?: string;
    dialstatus?: string;
    duration?: number;
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

/**
 * Helper to check if a WebSocket message is an outbound call event
 */
function isOutboundEvent(data: Record<string, unknown>): boolean {
    const outboundEvents = [
        'outbound_agent_dial',
        'outbound_client_dial',
        'outbound_connect',
        'outbound_hangup',
    ];

    // Check explicit outbound events
    if (outboundEvents.includes(data.event as string)) {
        return true;
    }

    // Check direction fields (new format)
    if (data.direction === 'outbound') {
        return true;
    }

    // Check call_direction fields (legacy format)
    if (data.call_direction === 'outbound') {
        return true;
    }

    // Check routing_info
    const routingInfo = data.routing_info as CallRoutingInfo | undefined;
    if (routingInfo?.call_direction === 'outbound') {
        return true;
    }

    return false;
}

/**
 * Helper to get session ID from message (handles both formats)
 */
function getSessionId(data: Record<string, unknown>): string | undefined {
    return (data.sessionId as string) || (data.session_id as string);
}

/**
 * Helper to get lead ID from message (handles both formats)
 */
function getLeadId(data: Record<string, unknown>): string | undefined {
    return (data.leadId as string) || (data.lead_id as string);
}

export function useOutboundCalls() {
    const { auth } = usePage<SharedData>().props;
    const currentUserExtension = auth.user.extension;

    const { state } = useAsteriskWebSocket();
    const [activeOutboundCall, setActiveOutboundCall] = useState<OutboundCall | null>(null);
    const [callHistory, setCallHistory] = useState<OutboundCall[]>([]);

    // Keep track of the initial lead passed when starting an outbound call.
    // This is used to repopulate lead data in case the first AMI/Dial event
    // arrives before React has committed the state update from startOutboundCall.
    const initialLeadRef = useRef<OutboundCallLead | null>(null);

    // Use a ref to track activeOutboundCall without triggering re-renders in useEffect
    // This prevents infinite loops when setActiveOutboundCall is called inside the effect
    const activeOutboundCallRef = useRef<OutboundCall | null>(null);
    useEffect(() => {
        activeOutboundCallRef.current = activeOutboundCall;
    }, [activeOutboundCall]);

    // Helper to convert Echo OutboundCallData to OutboundCall format
    const convertEchoDataToOutboundCall = useCallback((data: OutboundCallData): OutboundCall => {
        const currentCall = activeOutboundCallRef.current;
        
        // Map Echo event to OutboundCall status
        let status: OutboundCall['status'] = 'ringing';
        if (data.event === 'connect') {
            status = 'connected';
        } else if (data.event === 'hangup') {
            status = 'ended';
        } else if (data.event === 'ring') {
            status = 'ringing';
        }

        // Convert lead data if present
        const lead: OutboundCallLead | undefined = data.lead ? {
            id: data.lead.id,
            name: data.lead.name,
            email: data.lead.email,
            phone: data.lead.phone,
            city: data.lead.city,
            country: data.lead.country,
            service: data.lead.service,
            inquiry_status: data.lead.inquiry_status,
            priority: data.lead.priority,
            detail: data.lead.detail,
            budget: data.lead.budget,
        } : undefined;

        return {
            uniqueid: data.uniqueid,
            linkedid: data.linkedid,
            phoneNumber: data.client,
            leadId: lead?.id,
            lead: lead || currentCall?.lead || initialLeadRef.current || undefined,
            status,
            startTime: currentCall?.startTime || new Date(),
            connectedAt: status === 'connected' ? new Date() : currentCall?.connectedAt,
            endedAt: status === 'ended' ? new Date() : currentCall?.endedAt,
            duration: data.duration ?? currentCall?.duration ?? 0,
            sessionId: data.sessionId || currentCall?.sessionId,
            direction: 'outbound',
        };
    }, []);

    // Subscribe to outbound call events via Laravel Echo
    useEcho('outbound-calls', '.outbound.call', (data: OutboundCallData) => {
        // Only process events for the current user's extension
        if (data.agent_extension !== currentUserExtension) {
            console.log('📤 useOutboundCalls: Ignoring Echo event for different agent', {
                event: data.event,
                agent_extension: data.agent_extension,
                currentUserExtension,
            });
            return;
        }

        console.log('📤 useOutboundCalls: Processing Echo event', {
            event: data.event,
            agent_extension: data.agent_extension,
            client: data.client,
            sessionId: data.sessionId,
            uniqueid: data.uniqueid,
            hasLead: !!data.lead,
        });

        const outboundCall = convertEchoDataToOutboundCall(data);

        // Handle different events
        switch (data.event) {
            case 'ring':
                setActiveOutboundCall(outboundCall);
                toast.info('Ringing...', {
                    description: `Calling ${data.client}`,
                });
                break;

            case 'connect':
                setActiveOutboundCall(outboundCall);
                toast.success('Call connected!', {
                    description: 'You are now connected',
                });
                break;

            case 'hangup':
                setCallHistory((history) => [outboundCall, ...history.slice(0, 49)]);
                setActiveOutboundCall(null);
                toast.info('Call ended');
                break;
        }
    });

    // Process incoming WebSocket messages for outbound call events
    useEffect(() => {
        if (!state.lastMessage) {
            return;
        }

        const message = state.lastMessage;
        const data = message.data as Record<string, unknown>;

        // Check if this is an explicitly outbound event
        const isExplicitOutbound = isOutboundEvent(data);

        // Use ref to check current active call without triggering infinite loops
        const currentActiveCall = activeOutboundCallRef.current;

        // Check if this event matches our active outbound call by uniqueid/linkedid/sessionId
        // This handles events that don't have direction: 'outbound' but belong to our call
        const eventSessionId = getSessionId(data);
        const matchesActiveCall = currentActiveCall && (
            (data.uniqueid && (
                data.uniqueid === currentActiveCall.uniqueid ||
                data.uniqueid === currentActiveCall.linkedid
            )) ||
            (data.linkedid && (
                data.linkedid === currentActiveCall.linkedid ||
                data.linkedid === currentActiveCall.uniqueid
            )) ||
            (eventSessionId && eventSessionId === currentActiveCall.sessionId) ||
            // Also match if active call has pending uniqueid (before real uniqueid arrives)
            currentActiveCall.uniqueid?.startsWith('pending-')
        );

        // Process if it's an explicit outbound event OR matches our active call
        if (!isExplicitOutbound && !matchesActiveCall) {
            return;
        }

        // For explicit outbound events, verify it's for the current user
        if (isExplicitOutbound && !matchesActiveCall) {
            const routingInfo = data.routing_info as CallRoutingInfo | undefined;
            const isMyOutboundCall =
                data.agent_extension === currentUserExtension ||
                data.agent === currentUserExtension ||
                routingInfo?.agent === currentUserExtension ||
                data.exten === currentUserExtension;

            if (!isMyOutboundCall) {
                console.log('useOutboundCalls: Skipping outbound event for different agent', {
                    event: data.event,
                    agent_extension: data.agent_extension,
                    currentUserExtension,
                });
                return;
            }
        }

        console.log('📤 useOutboundCalls: Processing outbound event:', {
            event: data.event,
            sessionId: getSessionId(data),
            uniqueid: data.uniqueid,
            linkedid: data.linkedid,
            matchesActiveCall: !!matchesActiveCall,
            isExplicitOutbound,
            currentActiveCall: currentActiveCall ? {
                uniqueid: currentActiveCall.uniqueid,
                linkedid: currentActiveCall.linkedid,
                sessionId: currentActiveCall.sessionId,
                hasLead: !!currentActiveCall.lead,
            } : null,
        });

        switch (data.event) {
            case 'ring':
                if (matchesActiveCall || isExplicitOutbound) {
                    handleRingEvent(data);
                }
                break;
            case 'connect':
            case 'outbound_connect':
                if (matchesActiveCall || isExplicitOutbound) {
                    handleConnectEvent(data);
                }
                break;
            case 'disconnect':
            case 'hangup':
            case 'outbound_hangup':
                if (matchesActiveCall || isExplicitOutbound) {
                    handleEndEvent(data);
                } else {
                    console.log('📤 useOutboundCalls: Hangup event not matched, checking sessionId', {
                        eventSessionId: eventSessionId,
                        currentActiveCallSessionId: currentActiveCall?.sessionId,
                    });
                }
                break;
            case 'busy':
                if (matchesActiveCall || isExplicitOutbound) {
                    handleBusyEvent(data);
                }
                break;
            case 'dialbegin':
            case 'outbound_agent_dial':
            case 'outbound_client_dial':
                // Always handle dial begin events - they create/update the call
                handleDialBeginEvent(data);
                break;
            case 'dialend':
                if (matchesActiveCall || isExplicitOutbound) {
                    handleDialEndEvent(data);
                }
                break;
        }
    }, [state.lastMessage, currentUserExtension]);

    const handleDialBeginEvent = (data: Record<string, unknown>) => {
        // Outbound call initiated - extract session and lead IDs
        const sessionId = getSessionId(data);
        const leadId = getLeadId(data);
        const routingInfo = data.routing_info as CallRoutingInfo | undefined;

        console.log('📤 useOutboundCalls: handleDialBeginEvent called', {
            sessionId,
            leadId,
            uniqueid: data.uniqueid,
            linkedid: data.linkedid,
            prevHasLead: !!activeOutboundCallRef.current?.lead,
            initialLeadRefHasLead: !!initialLeadRef.current,
        });

        setActiveOutboundCall((prev) => {
            // Preserve existing lead data from startOutboundCall, falling back to initialLeadRef
            const preservedLead = prev?.lead || initialLeadRef.current || undefined;
            const newCall: OutboundCall = {
                uniqueid: (data.uniqueid as string) || prev?.uniqueid || `pending-${Date.now()}`,
                linkedid: (data.linkedid as string) || prev?.linkedid,
                phoneNumber: (data.destcalleridnum || data.client || routingInfo?.client || data.destination || prev?.phoneNumber || 'Unknown') as string,
                leadId: leadId || prev?.leadId,
                lead: preservedLead, // Preserve lead data from startOutboundCall
                sessionId: sessionId || prev?.sessionId,
                status: 'initiating',
                startTime: prev?.startTime || new Date(),
                duration: 0,
                direction: 'outbound',
            };

            console.log('📤 useOutboundCalls: Creating/updating outbound call', {
                sessionId: newCall.sessionId,
                leadId: newCall.leadId,
                phoneNumber: newCall.phoneNumber,
                hasLead: !!newCall.lead,
                leadData: newCall.lead,
            });

            return newCall;
        });
    };

    const handleRingEvent = (data: Record<string, unknown>) => {
        const sessionId = getSessionId(data);

        setActiveOutboundCall((prev) => {
            if (!prev) return prev;

            // Update uniqueid/linkedid when they become available
            // First ring event (agent leg) will have the linkedid we need to track
            const newUniqueid = (data.uniqueid as string) || prev.uniqueid;
            const newLinkedid = (data.linkedid as string) || (data.uniqueid as string) || prev.linkedid;

            console.log('📤 useOutboundCalls: Ring event, updating call IDs', {
                prevUniqueid: prev.uniqueid,
                newUniqueid,
                newLinkedid,
                hasLead: !!prev.lead,
            });

            return {
                ...prev,
                uniqueid: newUniqueid,
                linkedid: newLinkedid,
                sessionId: sessionId || prev.sessionId,
                status: 'ringing',
                // Explicitly preserve lead data
                lead: prev.lead || initialLeadRef.current || undefined,
                leadId: prev.leadId,
            };
        });

        toast.info('Ringing...', {
            description: 'Waiting for answer',
        });
    };

    const handleConnectEvent = (data: Record<string, unknown>) => {
        const sessionId = getSessionId(data);

        setActiveOutboundCall((prev) => {
            if (!prev) return prev;

            // Match by uniqueid, linkedid, or sessionId
            const isSameCall =
                prev.uniqueid === data.uniqueid ||
                prev.linkedid === data.linkedid ||
                prev.uniqueid === data.linkedid ||
                prev.linkedid === data.uniqueid ||
                (sessionId && prev.sessionId === sessionId) ||
                // Also match if we have a pending call (uniqueid starts with 'pending-')
                prev.uniqueid?.startsWith('pending-');

            if (isSameCall) {
                console.log('📤 useOutboundCalls: Call connected', {
                    sessionId,
                    uniqueid: data.uniqueid,
                    linkedid: data.linkedid,
                    hasLead: !!prev.lead,
                    leadId: prev.leadId,
                });
                const connectedCall: OutboundCall = {
                    ...prev,
                    uniqueid: (data.uniqueid as string) || prev.uniqueid,
                    linkedid: (data.linkedid as string) || prev.linkedid,
                    sessionId: sessionId || prev.sessionId,
                    status: 'connected',
                    connectedAt: new Date(),
                    // Explicitly preserve lead data - don't let it get lost
                    lead: prev.lead || initialLeadRef.current || undefined,
                    leadId: prev.leadId,
                };
                return connectedCall;
            }

            return prev;
        });

        toast.success('Call connected!', {
            description: 'You are now connected',
        });
    };

    const handleEndEvent = (data: Record<string, unknown>) => {
        const sessionId = getSessionId(data);
        const serverDuration = data.duration as number | undefined;

        setActiveOutboundCall((prev) => {
            if (!prev) return prev;

            // Match by uniqueid, linkedid, or sessionId
            const isSameCall =
                prev.uniqueid === data.uniqueid ||
                prev.linkedid === data.linkedid ||
                prev.uniqueid === data.linkedid ||
                prev.linkedid === data.uniqueid ||
                (sessionId && prev.sessionId === sessionId) ||
                prev.uniqueid?.startsWith('pending-');

            if (isSameCall) {
                // Use server-provided duration if available, otherwise calculate
                const calculatedDuration = prev.connectedAt
                    ? Math.floor((Date.now() - prev.connectedAt.getTime()) / 1000)
                    : 0;

                const endedCall: OutboundCall = {
                    ...prev,
                    status: 'ended',
                    endedAt: new Date(),
                    duration: serverDuration ?? calculatedDuration,
                };

                console.log('📤 useOutboundCalls: Call ended', {
                    sessionId,
                    uniqueid: data.uniqueid,
                    linkedid: data.linkedid,
                    duration: endedCall.duration,
                });

                setCallHistory((history) => [endedCall, ...history.slice(0, 49)]);

                toast.info('Call ended');

                return null;
            }

            return prev;
        });
    };

    const handleBusyEvent = (data: Record<string, unknown>) => {
        const sessionId = getSessionId(data);

        setActiveOutboundCall((prev) => {
            const isSameCall = prev && (
                prev.uniqueid === data.uniqueid ||
                prev.linkedid === data.linkedid ||
                prev.uniqueid === data.linkedid ||
                (sessionId && prev.sessionId === sessionId)
            );

            if (isSameCall) {
                const failedCall: OutboundCall = {
                    ...prev,
                    status: 'failed',
                    endedAt: new Date(),
                };

                console.log('📤 useOutboundCalls: Call busy', { sessionId });
                setCallHistory((history) => [failedCall, ...history.slice(0, 49)]);

                toast.warning('Line busy', {
                    description: 'The number you called is busy',
                });

                return null;
            }

            return prev;
        });
    };

    const handleDialEndEvent = (data: Record<string, unknown>) => {
        // Handle various dial end statuses
        const status = data.dialstatus as string;
        const sessionId = getSessionId(data);

        if (['NOANSWER', 'CANCEL', 'CONGESTION', 'CHANUNAVAIL'].includes(status)) {
            setActiveOutboundCall((prev) => {
                const isSameCall = prev && (
                    prev.uniqueid === data.uniqueid ||
                    prev.linkedid === data.linkedid ||
                    (sessionId && prev.sessionId === sessionId)
                );

                if (isSameCall) {
                    const failedCall: OutboundCall = {
                        ...prev,
                        status: 'failed',
                        endedAt: new Date(),
                    };

                    console.log('📤 useOutboundCalls: Call failed', { sessionId, status });
                    setCallHistory((history) => [failedCall, ...history.slice(0, 49)]);

                    const messages: Record<string, string> = {
                        NOANSWER: 'No answer',
                        CANCEL: 'Call cancelled',
                        CONGESTION: 'Network congestion',
                        CHANUNAVAIL: 'Channel unavailable',
                    };

                    toast.warning(messages[status] || 'Call failed', {
                        description: 'Please try again',
                    });

                    return null;
                }

                return prev;
            });
        }
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Start an outbound call (called when user initiates a call)
    const startOutboundCall = useCallback((
        phoneNumber: string,
        leadId?: string | number,
        lead?: OutboundCallLead,
        sessionId?: string
    ) => {
        // Remember the initial lead so we can restore it when AMI events arrive
        initialLeadRef.current = lead || null;

        const newCall: OutboundCall = {
            uniqueid: `pending-${Date.now()}`,
            phoneNumber,
            leadId,
            lead,
            sessionId,
            status: 'initiating',
            startTime: new Date(),
            duration: 0,
            direction: 'outbound',
        };

        console.log('📤 useOutboundCalls: Starting outbound call', {
            phoneNumber,
            leadId,
            sessionId,
            hasLead: !!lead,
            leadData: lead,
        });

        setActiveOutboundCall(newCall);
    }, []);

    // Clear the active outbound call (called when user dismisses notification)
    const clearOutboundCall = useCallback(() => {
        setActiveOutboundCall(null);
    }, []);

    /**
     * Update an existing lead from an outbound call
     */
    const updateLeadFromCall = useCallback(async (
        leadId: string,
        leadData: {
            name?: string;
            email?: string;
            city?: string;
            country?: string;
            service_id?: number;
            detail?: string;
            budget?: { amount: number };
        },
        notes: string,
        duration: number,
        callInfo?: { uniqueid: string; caller: string }
    ): Promise<void> => {
        const call = activeOutboundCallRef.current;
        const uniqueid = callInfo?.uniqueid || call?.uniqueid;

        if (!uniqueid) {
            throw new Error('No active call');
        }

        try {
            // Generate the update URL
            const updateUrl = updateLead(leadId).url;
            console.log('Updating lead from outbound call:', { leadId, updateUrl, leadData });

            // Update the lead information
            await axios.put(updateUrl, leadData, {
                headers: {
                    'X-Inertia': 'false',
                    Accept: 'application/json',
                },
            });

            // Save call notes as activity
            await axios.post(callNotes().url, {
                lead_id: leadId,
                notes,
                uniqueid,
                duration,
                call_direction: 'outbound',
            });

            toast.success('Lead updated and call notes saved');
        } catch (error) {
            console.error('Failed to update lead:', error);
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error('Failed to update lead', {
                description: axiosError.response?.data?.message || 'An error occurred',
            });
            throw error;
        }
    }, []);

    /**
     * Create a new lead from an outbound call (rare case - calling unknown number)
     */
    const createLeadFromCall = useCallback(async (
        leadData: {
            name: string;
            phone: string;
            email?: string;
            city?: string;
            country?: string;
            service_id?: number;
            detail?: string;
            budget?: { amount: number };
        },
        notes: string,
        duration: number,
        sessionId: string,
        callInfo?: { uniqueid: string; caller: string }
    ): Promise<void> => {
        const call = activeOutboundCallRef.current;
        const uniqueid = callInfo?.uniqueid || call?.uniqueid;
        const caller = callInfo?.caller || call?.phoneNumber;

        if (!uniqueid) {
            throw new Error('No active call');
        }

        try {
            // Create the lead using the asterisk call-lead endpoint
            const storeUrl = callLead().url;
            console.log('Creating lead from outbound call:', { storeUrl, leadData });

            const response = await axios.post(
                storeUrl,
                {
                    ...leadData,
                    uniqueid,
                    caller,
                    call_direction: 'outbound',
                },
                {
                    headers: {
                        'X-Inertia': 'false',
                        Accept: 'application/json',
                    },
                },
            );

            const newLeadId = response.data?.data?.lead?.id || response.data?.data?.id;

            if (!newLeadId) {
                throw new Error('Failed to get new lead ID from response');
            }

            // Save call notes as activity
            await axios.post(callNotes().url, {
                lead_id: newLeadId,
                notes,
                uniqueid,
                duration,
                call_direction: 'outbound',
            });

            // Update call session to link to the new lead
            if (sessionId) {
                try {
                    await axios.patch(`/api/asterisk/call-sessions/${sessionId}/link-lead`, {
                        lead_id: newLeadId,
                    });
                } catch (linkError) {
                    console.warn('Failed to link lead to call session:', linkError);
                }
            }

            toast.success('Lead created and call notes saved');
        } catch (error) {
            console.error('Failed to create lead:', error);
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error('Failed to create lead', {
                description: axiosError.response?.data?.message || 'An error occurred',
            });
            throw error;
        }
    }, []);

    return {
        activeOutboundCall,
        callHistory,
        startOutboundCall,
        clearOutboundCall,
        updateLeadFromCall,
        createLeadFromCall,
    };
}
