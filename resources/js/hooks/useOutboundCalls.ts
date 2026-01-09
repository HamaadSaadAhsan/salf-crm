import { useAsteriskWebSocket } from '@/contexts/AsteriskWebSocketContext';
import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { SharedData } from '@/types';

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
        const data = message.data;

        // IMPORTANT: Only process outbound calls, skip inbound calls
        // Inbound calls are handled by useInboundCalls hook
        if (data.call_direction === 'inbound') {
            console.log('useOutboundCalls: Skipping inbound call event', data);
            return;
        }

        // Check if this is an outbound call event for the current user
        // For outbound calls, the exten field contains the agent's extension
        const isMyOutboundCall = data.exten === currentUserExtension ||
            data.calleridnum === currentUserExtension ||
            data.agent_extension === currentUserExtension;

        if (!isMyOutboundCall) {
            return;
        }

        console.log('Outbound call event for current user:', message.type, data);

        switch (data.event) {
            case 'ring':
                handleRingEvent(data);
                break;
            case 'connect':
                handleConnectEvent(data);
                break;
            case 'disconnect':
            case 'hangup':
                handleEndEvent(data);
                break;
            case 'busy':
                handleBusyEvent(data);
                break;
            case 'dialbegin':
                handleDialBeginEvent(data);
                break;
            case 'dialend':
                handleDialEndEvent(data);
                break;
        }
    }, [state.lastMessage, currentUserExtension]);

    const handleDialBeginEvent = (data: any) => {
        // Outbound call initiated
        const newCall: OutboundCall = {
            uniqueid: data.uniqueid,
            linkedid: data.linkedid,
            phoneNumber: data.destcalleridnum || data.client || data.destination || 'Unknown',
            leadId: data.lead_id,
            status: 'initiating',
            startTime: new Date(),
            duration: 0,
        };

        setActiveOutboundCall(newCall);

        toast.info('Initiating call...', {
            description: `Calling ${newCall.phoneNumber}`,
        });
    };

    const handleRingEvent = (data: any) => {
        setActiveOutboundCall((prev) => {
            if (prev) {
                return {
                    ...prev,
                    uniqueid: data.uniqueid || prev.uniqueid,
                    linkedid: data.linkedid || prev.linkedid,
                    status: 'ringing',
                };
            }

            // Create new call if we don't have one
            return {
                uniqueid: data.uniqueid,
                linkedid: data.linkedid,
                phoneNumber: data.caller || data.connectedlinenum || 'Unknown',
                status: 'ringing',
                startTime: new Date(),
                duration: 0,
            };
        });

        toast.info('Ringing...', {
            description: 'Waiting for answer',
        });
    };

    const handleConnectEvent = (data: any) => {
        setActiveOutboundCall((prev) => {
            const isSameCall = prev && (
                prev.uniqueid === data.uniqueid ||
                prev.linkedid === data.linkedid ||
                prev.uniqueid === data.linkedid
            );

            if (isSameCall) {
                const connectedCall = {
                    ...prev,
                    status: 'connected' as const,
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

    const handleEndEvent = (data: any) => {
        setActiveOutboundCall((prev) => {
            const isSameCall = prev && (
                prev.uniqueid === data.uniqueid ||
                prev.linkedid === data.linkedid ||
                prev.uniqueid === data.linkedid
            );

            if (isSameCall) {
                // Add to history before clearing
                const endedCall: OutboundCall = {
                    ...prev,
                    status: 'ended',
                    endedAt: new Date(),
                    duration: prev.connectedAt
                        ? Math.floor((Date.now() - prev.connectedAt.getTime()) / 1000)
                        : 0,
                };

                setCallHistory((history) => [endedCall, ...history.slice(0, 49)]);

                toast.info('Call ended', {
                    description: `Duration: ${formatDuration(endedCall.duration)}`,
                });

                return null;
            }

            return prev;
        });
    };

    const handleBusyEvent = (data: any) => {
        setActiveOutboundCall((prev) => {
            const isSameCall = prev && (
                prev.uniqueid === data.uniqueid ||
                prev.linkedid === data.linkedid ||
                prev.uniqueid === data.linkedid
            );

            if (isSameCall) {
                const failedCall: OutboundCall = {
                    ...prev,
                    status: 'failed',
                    endedAt: new Date(),
                };

                setCallHistory((history) => [failedCall, ...history.slice(0, 49)]);

                toast.warning('Line busy', {
                    description: 'The number you called is busy',
                });

                return null;
            }

            return prev;
        });
    };

    const handleDialEndEvent = (data: any) => {
        // Handle various dial end statuses
        const status = data.dialstatus;

        if (['NOANSWER', 'CANCEL', 'CONGESTION', 'CHANUNAVAIL'].includes(status)) {
            setActiveOutboundCall((prev) => {
                const isSameCall = prev && (
                    prev.uniqueid === data.uniqueid ||
                    prev.linkedid === data.linkedid
                );

                if (isSameCall) {
                    const failedCall: OutboundCall = {
                        ...prev,
                        status: 'failed',
                        endedAt: new Date(),
                    };

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
        lead?: OutboundCallLead
    ) => {
        const newCall: OutboundCall = {
            uniqueid: `pending-${Date.now()}`,
            phoneNumber,
            leadId,
            lead,
            status: 'initiating',
            startTime: new Date(),
            duration: 0,
        };

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
