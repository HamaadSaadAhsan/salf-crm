import type { CallRoutingInfo } from '@/types/asterisk';

/**
 * WebSocket message from Asterisk server
 */
export interface AsteriskMessage {
    id: string;
    type: string;
    data: Record<string, unknown>;
    timestamp: Date;
}

/**
 * Configuration for Asterisk WebSocket connection
 */
export interface AsteriskConnectionConfig {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    callerId: string;
    context: string;
    timeout: number;
}

/**
 * Parameters for originating a call
 */
export interface OriginateCallParams {
    extension: string;
    phoneNumber?: string;
    leadId: string | number;
    callerId?: string;
    context?: string;
    timeout?: number;
}

/**
 * Connection status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

/**
 * WebSocket state
 */
export interface AsteriskWebSocketState {
    connectionStatus: ConnectionStatus;
    lastConnectedAt: Date | null;
    lastDisconnectedAt: Date | null;
    config: AsteriskConnectionConfig;
    reconnectAttempts: number;
    messagesReceived: number;
    messagesSent: number;
    lastMessage: AsteriskMessage | null;
    messageHistory: AsteriskMessage[];
    lastError: string | null;
    errors: Array<{ message: string; timestamp: Date }>;
}

/**
 * Actions for state reducer
 */
export type AsteriskWebSocketAction =
    | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
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

/**
 * Context actions
 */
export interface AsteriskActions {
    connect: () => void;
    disconnect: () => void;
    sendMessage: (message: Record<string, unknown>) => void;
    makeCall: (params: OriginateCallParams) => Promise<boolean>;
    updateConfig: (config: Partial<AsteriskConnectionConfig>) => void;
    clearMessageHistory: () => void;
    clearErrors: () => void;
}

/**
 * Context value
 */
export interface AsteriskContextValue {
    state: AsteriskWebSocketState;
    dispatch: React.Dispatch<AsteriskWebSocketAction>;
    actions: AsteriskActions;
    ws: WebSocket | null;
}

/**
 * Raw WebSocket message data
 */
export interface WebSocketMessageData extends Record<string, unknown> {
    event?: string;
    type?: string;
    sessionId?: string;
    session_id?: string;
    leadId?: string;
    lead_id?: string;
    direction?: string;
    call_direction?: string;
    routing_info?: CallRoutingInfo;
    uniqueid?: string;
    linkedid?: string;
    caller?: string;
    calleridnum?: string;
    exten?: string;
    targetExtension?: string;
    agent?: string;
    agent_extension?: string;
    client?: string;
    dialstatus?: string;
    cause?: string;
    duration?: number;
    reason?: string;
}
