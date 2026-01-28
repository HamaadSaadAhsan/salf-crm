import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { usePage } from '@inertiajs/react';
import { inboundCall } from '@/routes/asterisk';
import type { SharedData } from '@/types';

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
    phoneNumber: string;
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
                    const data = JSON.parse(event.data);
                    console.log('📨 [WebSocket] Message received:', {
                        event: data.event,
                        type: data.type,
                        targetExtension: data.targetExtension,
                        exten: data.exten,
                        caller: data.caller,
                        uniqueid: data.uniqueid,
                    });

                    const message: AsteriskMessage = {
                        id: Date.now().toString(),
                        type: data.type || 'unknown',
                        data: data,
                        timestamp: new Date(),
                    };
                    dispatch({ type: 'ADD_MESSAGE', payload: message });

                    // Check if this is an inbound call event and forward to Laravel
                    // Include stop_ringing for ring group notifications (clears notification when call moves to next extension)
                    //
                    // IMPORTANT: Skip forwarding for outbound call agent leg events
                    // These are NOT inbound calls - they are the system calling the agent's phone
                    // as the first step of an outbound call origination
                    const isOutboundAgentEvent = data.event === 'outbound_agent_dial' ||
                        data.event === 'outbound_client_dial' ||
                        (data.routing_info && data.routing_info.call_direction === 'outbound');

                    const isInboundCallEvent = data.event && ['ring', 'connect', 'disconnect', 'hangup', 'stop_ringing'].includes(data.event);

                    if (isOutboundAgentEvent) {
                        // Outbound call events - handle differently, don't forward to inbound call endpoint
                        console.log('📤 [WebSocket] Outbound call event (not forwarding to inbound endpoint):', {
                            event: data.event,
                            phase: data.routing_info?.phase,
                            agent: data.routing_info?.agent,
                            client: data.routing_info?.client,
                            session_id: data.session_id,
                        });
                        // Optionally: Forward to a different outbound-specific endpoint if needed
                    } else if (isInboundCallEvent) {
                        // Check call direction from routing_info - skip if explicitly outbound
                        const callDirection = data.routing_info?.call_direction || data.call_direction;
                        if (callDirection === 'outbound') {
                            console.log('📤 [WebSocket] Outbound call event detected via routing_info (skipping inbound forward):', {
                                event: data.event,
                                call_direction: callDirection,
                                session_id: data.session_id,
                            });
                        } else {
                            console.log('📞 [WebSocket] Inbound call event detected, forwarding to Laravel:', data.event);
                            try {
                                // For inbound calls: caller = phone number, exten = extension receiving call
                                // For outbound calls: caller = agent extension, exten = phone number being called
                                // For stop_ringing: targetExtension = extension to clear notification from
                                await axios.post(inboundCall().url, {
                                    event: data.event,
                                    caller: data.caller, // Phone number (03334114879) or agent extension
                                    exten: data.exten || data.targetExtension, // Extension (201) or target extension for stop_ringing
                                    uniqueid: data.uniqueid,
                                    linkedid: data.linkedid,
                                    // Additional fields for stop_ringing and ring events
                                    targetExtension: data.targetExtension,
                                    reason: data.reason, // timeout, caller_hangup, busy, answered_elsewhere
                                    dialstatus: data.dialstatus,
                                    session_id: data.session_id,
                                    // Include call direction for backend processing
                                    call_direction: callDirection || 'inbound',
                                });
                                console.log('✅ [WebSocket] Event forwarded to Laravel successfully:', data.event);
                            } catch (apiError) {
                                console.error('❌ [WebSocket] Failed to forward call event to Laravel:', apiError);
                                // Don't show error to user - this is background processing
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
                const callSession = data.call_session;

                // Step 2: Send originate action to Asterisk with signature
                // Use phone number from call session if not provided in params
                const phoneNumber = params.phoneNumber || callSession.callee_number;

                const originateAction = {
                    agent: params.extension,
                    client: phoneNumber,
                    call_signature: callSignature,
                    lead_id: params.leadId,
                    caller_id: params.callerId || state.config.callerId,
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
