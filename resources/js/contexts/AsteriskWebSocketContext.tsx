import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { usePage } from '@inertiajs/react';
import { inboundCall, outboundCall } from '@/routes/asterisk';
import type { SharedData } from '@/types';
import type { CallRoutingInfo } from '@/types/asterisk';

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

// Types
export interface AsteriskMessage {
    id: string;
    type: string;
    data: Record<string, unknown>;
    timestamp: Date;
}

export interface AsteriskConnectionConfig {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    callerId: string;
    context: string;
    timeout: number;
}

export interface OriginateCallParams {
    extension: string;
    phoneNumber?: string; // Optional - backend can derive from lead
    leadId: string | number;
    callerId?: string;
    context?: string;
    timeout?: number;
}

interface AsteriskWebSocketState {
    // Connection Status
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';
    lastConnectedAt: Date | null;
    lastDisconnectedAt: Date | null;

    // Configuration
    config: AsteriskConnectionConfig;

    // Connection Stats
    reconnectAttempts: number;
    messagesReceived: number;
    messagesSent: number;

    // Messages
    lastMessage: AsteriskMessage | null;
    messageHistory: AsteriskMessage[];

    // Errors
    lastError: string | null;
    errors: Array<{ message: string; timestamp: Date }>;
}

type AsteriskWebSocketAction =
    | { type: 'SET_CONNECTION_STATUS'; payload: AsteriskWebSocketState['connectionStatus'] }
    | { type: 'SET_CONFIG'; payload: Partial<AsteriskConnectionConfig> }
    | { type: 'INCREMENT_RECONNECT_ATTEMPTS' }
    | { type: 'RESET_RECONNECT_ATTEMPTS' }
    | { type: 'ADD_MESSAGE'; payload: AsteriskMessage }
    | { type: 'INCREMENT_MESSAGES_SENT' }
    | { type: 'SET_LAST_CONNECTED'; payload: Date }
    | { type: 'SET_LAST_DISCONNECTED'; payload: Date }
    | { type: 'ADD_ERROR'; payload: string }
    | { type: 'CLEAR_ERRORS' }
    | { type: 'CLEAR_MESSAGE_HISTORY' };

// Initial State
const initialState: AsteriskWebSocketState = {
    connectionStatus: 'disconnected',
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    config: {
        url: import.meta.env.VITE_ASTERISK_WS_URL || 'ws://192.168.100.232:9000',
        reconnectInterval: 5000, // 5 seconds
        maxReconnectAttempts: 10,
        callerId: import.meta.env.ASTERISK_CALLER_ID || '382000002',
        context: import.meta.env.ASTERISK_CONTEXT || 'CRM-call',
        timeout: Number(import.meta.env.ASTERISK_TIMEOUT) || 30000,
    },
    reconnectAttempts: 0,
    messagesReceived: 0,
    messagesSent: 0,
    lastMessage: null,
    messageHistory: [],
    lastError: null,
    errors: [],
};

// Reducer
function asteriskWebSocketReducer(state: AsteriskWebSocketState, action: AsteriskWebSocketAction): AsteriskWebSocketState {
    switch (action.type) {
        case 'SET_CONNECTION_STATUS':
            return { ...state, connectionStatus: action.payload };

        case 'SET_CONFIG':
            return {
                ...state,
                config: { ...state.config, ...action.payload },
            };

        case 'INCREMENT_RECONNECT_ATTEMPTS':
            return {
                ...state,
                reconnectAttempts: state.reconnectAttempts + 1,
            };

        case 'RESET_RECONNECT_ATTEMPTS':
            return {
                ...state,
                reconnectAttempts: 0,
            };

        case 'ADD_MESSAGE':
            return {
                ...state,
                lastMessage: action.payload,
                messagesReceived: state.messagesReceived + 1,
                messageHistory: [...state.messageHistory.slice(-99), action.payload], // Keep last 100 messages
            };

        case 'INCREMENT_MESSAGES_SENT':
            return {
                ...state,
                messagesSent: state.messagesSent + 1,
            };

        case 'SET_LAST_CONNECTED':
            return {
                ...state,
                lastConnectedAt: action.payload,
            };

        case 'SET_LAST_DISCONNECTED':
            return {
                ...state,
                lastDisconnectedAt: action.payload,
            };

        case 'ADD_ERROR':
            return {
                ...state,
                lastError: action.payload,
                errors: [...state.errors.slice(-9), { message: action.payload, timestamp: new Date() }], // Keep last 10 errors
            };

        case 'CLEAR_ERRORS':
            return {
                ...state,
                lastError: null,
                errors: [],
            };

        case 'CLEAR_MESSAGE_HISTORY':
            return {
                ...state,
                messageHistory: [],
                lastMessage: null,
            };

        default:
            return state;
    }
}

// Context
const AsteriskWebSocketContext = createContext<{
    state: AsteriskWebSocketState;
    dispatch: React.Dispatch<AsteriskWebSocketAction>;
    actions: {
        connect: () => void;
        disconnect: () => void;
        sendMessage: (message: Record<string, unknown>) => void;
        makeCall: (params: OriginateCallParams) => Promise<boolean>;
        updateConfig: (config: Partial<AsteriskConnectionConfig>) => void;
        clearMessageHistory: () => void;
        clearErrors: () => void;
    };
    ws: WebSocket | null;
} | null>(null);

// Provider Component
export function AsteriskWebSocketProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(asteriskWebSocketReducer, initialState);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const shouldReconnectRef = useRef<boolean>(true);

    // Get user's extension from auth for WebSocket registration
    const { auth } = usePage<SharedData>().props;
    const userExtension = auth?.user?.extension;

    // Connect to WebSocket
    const connect = useCallback(() => {
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Close existing connection if any
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        try {
            console.log('🔌 [WebSocket] Connecting to:', state.config.url);
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });

            const ws = new WebSocket(state.config.url);

            ws.onopen = () => {
                console.log('✅ [WebSocket] Connected successfully');
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
                dispatch({ type: 'SET_LAST_CONNECTED', payload: new Date() });
                dispatch({ type: 'RESET_RECONNECT_ATTEMPTS' });

                // Register extension with WebSocket server for targeted notifications
                // This is critical for receiving inbound call events targeted to this extension
                if (userExtension) {
                    const registrationMessage = {
                        exten: userExtension,
                        login: true,
                    };
                    ws.send(JSON.stringify(registrationMessage));
                    console.log('🔔 [WebSocket] Registered extension:', userExtension);
                } else {
                    console.warn('⚠️ [WebSocket] No user extension configured - inbound call notifications will NOT work');
                }
            };

            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data) as Record<string, unknown>;
                    const sessionId = getSessionId(data);
                    const leadId = getLeadId(data);
                    const routingInfo = data.routing_info as CallRoutingInfo | undefined;

                    console.log('📨 [WebSocket] Message received:', {
                        event: data.event,
                        type: data.type,
                        sessionId,
                        leadId,
                        direction: data.direction || data.call_direction || routingInfo?.call_direction,
                        targetExtension: data.targetExtension,
                        exten: data.exten,
                        caller: data.caller,
                        uniqueid: data.uniqueid,
                    });

                    const message: AsteriskMessage = {
                        id: Date.now().toString(),
                        type: (data.type as string) || 'unknown',
                        data: data,
                        timestamp: new Date(),
                    };
                    dispatch({ type: 'ADD_MESSAGE', payload: message });

                    // Determine if this is an outbound or inbound call event
                    const isOutbound = isOutboundEvent(data);
                    const isCallEvent = data.event && ['ring', 'connect', 'disconnect', 'hangup', 'stop_ringing',
                        'outbound_agent_dial', 'outbound_client_dial', 'outbound_connect', 'outbound_hangup'].includes(data.event as string);

                    if (isOutbound && isCallEvent) {
                        // Outbound call events - forward to outbound-specific endpoint
                        // Map generic events to outbound-specific events if needed
                        const outboundEvent = data.event === 'connect' ? 'outbound_connect' :
                                              data.event === 'hangup' ? 'outbound_hangup' :
                                              data.event;

                        console.log('📤 [WebSocket] Outbound call event, forwarding to Laravel:', {
                            event: outboundEvent,
                            sessionId,
                            leadId,
                            phase: routingInfo?.phase,
                            agent: data.agent || routingInfo?.agent,
                            client: data.client || routingInfo?.client,
                        });

                        try {
                            await axios.post(outboundCall().url, {
                                event: outboundEvent,
                                // Use consistent sessionId naming
                                session_id: sessionId,
                                sessionId: sessionId,
                                lead_id: leadId,
                                leadId: leadId,
                                uniqueid: data.uniqueid,
                                linkedid: data.linkedid,
                                agent: data.agent || data.agent_extension || routingInfo?.agent,
                                client: data.client || routingInfo?.client,
                                phase: routingInfo?.phase,
                                dialstatus: data.dialstatus || routingInfo?.dialstatus,
                                cause: data.cause,
                                duration: data.duration || routingInfo?.duration,
                                direction: 'outbound',
                            });
                            console.log('✅ [WebSocket] Outbound event forwarded to Laravel successfully:', outboundEvent);
                        } catch (apiError) {
                            console.error('❌ [WebSocket] Failed to forward outbound call event to Laravel:', apiError);
                        }
                    } else if (isCallEvent && !isOutbound) {
                        // Inbound call events
                        // Skip forwarding if caller is undefined (incomplete event data)
                        if (!data.caller && !data.calleridnum) {
                            console.log('ℹ️ [WebSocket] Skipping inbound event with undefined caller:', data.event);
                        } else {
                            console.log('📞 [WebSocket] Inbound call event, forwarding to Laravel:', {
                                event: data.event,
                                sessionId,
                                caller: data.caller || data.calleridnum,
                            });

                            try {
                                await axios.post(inboundCall().url, {
                                    event: data.event,
                                    caller: data.caller || data.calleridnum,
                                    exten: data.exten || data.targetExtension,
                                    uniqueid: data.uniqueid,
                                    linkedid: data.linkedid,
                                    targetExtension: data.targetExtension,
                                    reason: data.reason,
                                    dialstatus: data.dialstatus,
                                    // Use consistent sessionId naming
                                    session_id: sessionId,
                                    sessionId: sessionId,
                                    lead_id: leadId,
                                    leadId: leadId,
                                    direction: 'inbound',
                                    call_direction: 'inbound',
                                });
                                console.log('✅ [WebSocket] Inbound event forwarded to Laravel successfully:', data.event);
                            } catch (apiError) {
                                console.error('❌ [WebSocket] Failed to forward inbound call event to Laravel:', apiError);
                            }
                        }
                    } else {
                        console.log('ℹ️ [WebSocket] Non-call event received (not forwarding):', data.event || data.type);
                    }
                } catch (error) {
                    console.error('❌ [WebSocket] Failed to parse message:', error);
                    dispatch({ type: 'ADD_ERROR', payload: 'Failed to parse message from server' });
                }
            };

            ws.onerror = (error) => {
                console.error('❌ [WebSocket] Connection error:', error);
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
                dispatch({ type: 'ADD_ERROR', payload: 'WebSocket connection error' });
            };

            ws.onclose = (event) => {
                console.log('🔴 [WebSocket] Connection closed:', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean,
                });
                dispatch({ type: 'SET_LAST_DISCONNECTED', payload: new Date() });

                // Attempt to reconnect if enabled and within max attempts
                if (shouldReconnectRef.current && state.reconnectAttempts < state.config.maxReconnectAttempts) {
                    console.log('🔄 [WebSocket] Attempting reconnect...');
                    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'reconnecting' });
                    dispatch({ type: 'INCREMENT_RECONNECT_ATTEMPTS' });

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, state.config.reconnectInterval);
                } else {
                    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
                    if (state.reconnectAttempts >= state.config.maxReconnectAttempts) {
                        console.error('❌ [WebSocket] Max reconnection attempts reached');
                        dispatch({ type: 'ADD_ERROR', payload: 'Max reconnection attempts reached' });
                    }
                }
            };

            wsRef.current = ws;
        } catch (error) {
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
            const errorMessage = error instanceof Error ? error.message : 'Failed to create WebSocket connection';
            dispatch({ type: 'ADD_ERROR', payload: errorMessage });
        }
    }, [state.config.url, state.config.reconnectInterval, state.config.maxReconnectAttempts, state.reconnectAttempts, userExtension]);

    // Disconnect from WebSocket
    const disconnect = useCallback(() => {
        shouldReconnectRef.current = false;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
        dispatch({ type: 'RESET_RECONNECT_ATTEMPTS' });
    }, []);

    // Send message through WebSocket
    const sendMessage = useCallback((message: Record<string, unknown>) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
                wsRef.current.send(JSON.stringify(message));
                dispatch({ type: 'INCREMENT_MESSAGES_SENT' });
            } catch (error) {
                dispatch({ type: 'ADD_ERROR', payload: 'Failed to send message' });
            }
        } else {
            console.warn('WebSocket is not connected. Cannot send message.');
        }
    }, []);

    // Make a call using Asterisk Originate action
    const makeCall = useCallback(async (params: OriginateCallParams): Promise<boolean> => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
                // Step 1: Create call session and generate signature via API
                // Phone number can be provided directly or retrieved from lead in backend
                const { data } = await axios.post('/api/calls/initiate', {
                    phone_number: params.phoneNumber,
                    lead_id: params.leadId,
                });

                if (!data.success) {
                    throw new Error(data.message || 'Failed to initiate call session');
                }

                const callSignature = data.signature_data.call_signature;
                const callerId = data.signature_data.caller_id; // User ID from backend

                // Step 2: Send originate action to Asterisk with signature
                // Use phone number from backend response (callee_number) - backend derives from lead if not provided
                const phoneNumber = data.signature_data.callee_number;

                const originateAction = {
                    agent: params.extension,
                    client: phoneNumber,
                    call_signature: callSignature,
                    lead_id: params.leadId,
                    caller_id: callerId, // Use the user ID from API response
                };

                wsRef.current.send(JSON.stringify(originateAction));
                dispatch({ type: 'INCREMENT_MESSAGES_SENT' });

                toast.success(`Calling ${phoneNumber}...`);

                return true;
            } catch (error) {
                console.error('Failed to originate call:', error);
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to initiate call';
                dispatch({ type: 'ADD_ERROR', payload: errorMessage });
                toast.error(errorMessage);
                return false;
            }
        } else {
            console.warn('WebSocket is not connected. Cannot make call.');
            toast.warning('Not connected to Asterisk Manager');
            return false;
        }
    }, []);

    // Update configuration
    const updateConfig = useCallback((config: Partial<AsteriskConnectionConfig>) => {
        dispatch({ type: 'SET_CONFIG', payload: config });
    }, []);

    // Clear message history
    const clearMessageHistory = useCallback(() => {
        dispatch({ type: 'CLEAR_MESSAGE_HISTORY' });
    }, []);

    // Clear errors
    const clearErrors = useCallback(() => {
        dispatch({ type: 'CLEAR_ERRORS' });
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        shouldReconnectRef.current = true;
        connect();

        // Cleanup on unmount
        return () => {
            shouldReconnectRef.current = false;

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const contextValue = {
        state,
        dispatch,
        actions: {
            connect,
            disconnect,
            sendMessage,
            makeCall,
            updateConfig,
            clearMessageHistory,
            clearErrors,
        },
        ws: wsRef.current,
    };

    return <AsteriskWebSocketContext.Provider value={contextValue}>{children}</AsteriskWebSocketContext.Provider>;
}

// Custom Hook
export function useAsteriskWebSocket() {
    const context = useContext(AsteriskWebSocketContext);
    if (!context) {
        throw new Error('useAsteriskWebSocket must be used within an AsteriskWebSocketProvider');
    }
    return context;
}
