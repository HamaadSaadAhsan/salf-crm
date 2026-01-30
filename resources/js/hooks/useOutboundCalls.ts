import { useAsteriskWebSocket } from '@/contexts/AsteriskWebSocketContext';
import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
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

    // Process incoming WebSocket messages for outbound call events
    useEffect(() => {
        if (!state.lastMessage) {
            return;
        }

        const message = state.lastMessage;
        const data = message.data as Record<string, unknown>;

        // IMPORTANT: Only process outbound calls, skip inbound calls
        // Inbound calls are handled by useInboundCalls hook
        if (!isOutboundEvent(data)) {
            // Skip non-outbound events silently (they're handled by useInboundCalls)
            return;
        }

        // Check if this is an outbound call event for the current user
        // For outbound calls, check agent_extension, agent, exten, or calleridnum
        const routingInfo = data.routing_info as CallRoutingInfo | undefined;
        const isMyOutboundCall =
            data.agent_extension === currentUserExtension ||
            data.agent === currentUserExtension ||
            routingInfo?.agent === currentUserExtension ||
            data.exten === currentUserExtension ||
            data.calleridnum === currentUserExtension;

        if (!isMyOutboundCall) {
            console.log('useOutboundCalls: Skipping outbound event for different agent', {
                event: data.event,
                agent_extension: data.agent_extension,
                agent: data.agent,
                currentUserExtension,
            });
            return;
        }

        console.log('📤 useOutboundCalls: Processing outbound event for current user:', {
            event: data.event,
            sessionId: getSessionId(data),
            leadId: getLeadId(data),
            direction: data.direction || data.call_direction,
        });

        switch (data.event) {
            case 'ring':
                handleRingEvent(data);
                break;
            case 'connect':
            case 'outbound_connect':
                handleConnectEvent(data);
                break;
            case 'disconnect':
            case 'hangup':
            case 'outbound_hangup':
                handleEndEvent(data);
                break;
            case 'busy':
                handleBusyEvent(data);
                break;
            case 'dialbegin':
            case 'outbound_agent_dial':
            case 'outbound_client_dial':
                handleDialBeginEvent(data);
                break;
            case 'dialend':
                handleDialEndEvent(data);
                break;
        }
    }, [state.lastMessage, currentUserExtension]);

    const handleDialBeginEvent = (data: Record<string, unknown>) => {
        // Outbound call initiated - extract session and lead IDs
        const sessionId = getSessionId(data);
        const leadId = getLeadId(data);
        const routingInfo = data.routing_info as CallRoutingInfo | undefined;

        const newCall: OutboundCall = {
            uniqueid: data.uniqueid as string,
            linkedid: data.linkedid as string | undefined,
            phoneNumber: (data.destcalleridnum || data.client || routingInfo?.client || data.destination || 'Unknown') as string,
            leadId: leadId,
            sessionId: sessionId,
            status: 'initiating',
            startTime: new Date(),
            duration: 0,
            direction: 'outbound',
        };

        console.log('📤 useOutboundCalls: Creating outbound call', {
            sessionId,
            leadId,
            phoneNumber: newCall.phoneNumber,
        });

        setActiveOutboundCall(newCall);

        toast.info('Initiating call...', {
            description: newCall.lead?.name || newCall.phoneNumber,
        });
    };

    const handleRingEvent = (data: Record<string, unknown>) => {
        const sessionId = getSessionId(data);
        const leadId = getLeadId(data);
        const routingInfo = data.routing_info as CallRoutingInfo | undefined;

        setActiveOutboundCall((prev) => {
            if (prev) {
                return {
                    ...prev,
                    uniqueid: (data.uniqueid as string) || prev.uniqueid,
                    linkedid: (data.linkedid as string) || prev.linkedid,
                    sessionId: sessionId || prev.sessionId,
                    status: 'ringing',
                };
            }

            // Create new call if we don't have one
            return {
                uniqueid: data.uniqueid as string,
                linkedid: data.linkedid as string | undefined,
                phoneNumber: (data.caller || data.connectedlinenum || routingInfo?.client || 'Unknown') as string,
                sessionId: sessionId,
                leadId: leadId,
                status: 'ringing',
                startTime: new Date(),
                duration: 0,
                direction: 'outbound',
            };
        });

        toast.info('Ringing...', {
            description: 'Waiting for answer',
        });
    };

    const handleConnectEvent = (data: Record<string, unknown>) => {
        const sessionId = getSessionId(data);

        setActiveOutboundCall((prev) => {
            // Match by uniqueid, linkedid, or sessionId
            const isSameCall = prev && (
                prev.uniqueid === data.uniqueid ||
                prev.linkedid === data.linkedid ||
                prev.uniqueid === data.linkedid ||
                (sessionId && prev.sessionId === sessionId)
            );

            if (isSameCall) {
                console.log('📤 useOutboundCalls: Call connected', { sessionId });
                const connectedCall: OutboundCall = {
                    ...prev,
                    sessionId: sessionId || prev.sessionId,
                    status: 'connected',
                    connectedAt: new Date(),
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
            // Match by uniqueid, linkedid, or sessionId
            const isSameCall = prev && (
                prev.uniqueid === data.uniqueid ||
                prev.linkedid === data.linkedid ||
                prev.uniqueid === data.linkedid ||
                (sessionId && prev.sessionId === sessionId)
            );

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
                    duration: endedCall.duration,
                });

                setCallHistory((history) => [endedCall, ...history.slice(0, 49)]);

                toast.info('Call ended', {
                    description: `Duration: ${formatDuration(endedCall.duration)}`,
                });

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
        });

        setActiveOutboundCall(newCall);
    }, []);

    // Clear the active outbound call (called when user dismisses notification)
    const clearOutboundCall = useCallback(() => {
        setActiveOutboundCall(null);
    }, []);

    return {
        activeOutboundCall,
        callHistory,
        startOutboundCall,
        clearOutboundCall,
    };
}
