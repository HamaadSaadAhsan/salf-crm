/**
 * Asterisk WebSocket Message Types
 *
 * Defines interfaces for WebSocket messages between the Node.js server and React frontend.
 * These messages handle call events for both inbound and outbound calls.
 */

/**
 * Base interface for all Asterisk WebSocket messages
 */
export interface AsteriskWebSocketMessage {
    /** Event type identifier */
    event: string;
    /** Asterisk channel unique identifier */
    uniqueid?: string;
    /** Asterisk linked call ID (master key for ring groups) */
    linkedid?: string;
    /** CRM session UUID - primary identifier for call sessions */
    sessionId?: string;
    /** Legacy session_id field for backwards compatibility */
    session_id?: string;
    /** Lead UUID associated with the call */
    leadId?: string;
    /** Legacy lead_id field for backwards compatibility */
    lead_id?: string;
    /** Call direction: 'inbound' or 'outbound' */
    direction?: 'inbound' | 'outbound';
    /** Legacy call_direction field for backwards compatibility */
    call_direction?: 'inbound' | 'outbound';
    /** Timestamp of the message */
    timestamp?: string;
}

/**
 * Routing information included in call events
 */
export interface CallRoutingInfo {
    /** Call direction */
    call_direction: 'inbound' | 'outbound';
    /** Target extension for inbound calls */
    target_extension?: string;
    /** Agent extension for outbound calls */
    agent?: string;
    /** Client phone number for outbound calls */
    client?: string;
    /** Current phase of the call */
    phase?: 'agent_dial' | 'client_dial' | 'connected' | 'ended' | 'dial_failed';
    /** Session UUID */
    sessionId?: string;
    /** Lead UUID */
    leadId?: string;
    /** End reason for completed calls */
    end_reason?: string;
    /** Dial status code */
    dialstatus?: string;
    /** Call duration in seconds */
    duration?: number;
}

/**
 * Lead data included in call events
 */
export interface CallLeadData {
    id: string;
    name?: string;
    email?: string;
    phone: string;
    city?: string;
    country?: string;
    service?: { id: number; name: string };
    assigned_to?: { id: number; name: string };
    inquiry_status?: string;
    priority?: string;
    detail?: string;
    budget?: { amount: number };
    tags?: Record<string, string>;
    lead_score?: number;
    last_activity_at?: string;
}

/**
 * Outbound call dial event (agent leg or client leg)
 */
export interface OutboundDialEvent extends AsteriskWebSocketMessage {
    event: 'outbound_agent_dial' | 'outbound_client_dial';
    /** Asterisk channel name */
    channel?: string;
    /** Destination channel name */
    destination?: string;
    /** Target extension being dialed */
    targetExtension?: string;
    /** Dial string for outbound calls */
    dialstring?: string;
    /** Agent extension making the call */
    agent?: string;
    /** Client phone number being called */
    client?: string;
    /** Agent extension (duplicate for consistency) */
    agent_extension?: string;
    /** Routing information */
    routing_info?: CallRoutingInfo;
}

/**
 * Outbound call connected event
 */
export interface OutboundConnectEvent extends AsteriskWebSocketMessage {
    event: 'outbound_connect';
    /** Asterisk channel name */
    channel?: string;
    /** Bridge unique identifier */
    bridgeuniqueid?: string;
    /** Agent extension */
    agent?: string;
    /** Client phone number */
    client?: string;
    /** Agent extension (duplicate for consistency) */
    agent_extension?: string;
    /** Routing information */
    routing_info?: CallRoutingInfo;
}

/**
 * Outbound call hangup event
 */
export interface OutboundHangupEvent extends AsteriskWebSocketMessage {
    event: 'outbound_hangup';
    /** Call duration in seconds */
    duration?: number;
    /** End reason */
    endReason?: string;
    /** Legacy end_reason field */
    end_reason?: string;
    /** Dial status code (for failed dials) */
    dialstatus?: string;
    /** Agent extension */
    agent?: string;
    /** Client phone number */
    client?: string;
    /** Agent extension (duplicate for consistency) */
    agent_extension?: string;
    /** Routing information */
    routing_info?: CallRoutingInfo;
}

/**
 * Inbound call ring event
 */
export interface InboundRingEvent extends AsteriskWebSocketMessage {
    event: 'ring';
    /** Caller phone number */
    caller?: string;
    /** Caller ID number */
    calleridnum?: string;
    /** Target extension */
    exten?: string;
    /** Target extension for ring group */
    targetExtension?: string;
    /** Lead data for known callers */
    lead?: CallLeadData;
    /** Routing information */
    routing_info?: CallRoutingInfo;
}

/**
 * Call connect event (works for both inbound and outbound)
 */
export interface CallConnectEvent extends AsteriskWebSocketMessage {
    event: 'connect';
    /** Caller phone number */
    caller?: string;
    /** Caller ID number */
    calleridnum?: string;
    /** Connected line number */
    connectedlinenum?: string;
    /** Extension that answered */
    answeredExtension?: string;
    /** Bridge unique identifier */
    bridgeuniqueid?: string;
    /** Lead data */
    lead?: CallLeadData;
    /** Routing information */
    routing_info?: CallRoutingInfo;
}

/**
 * Call hangup/disconnect event
 */
export interface CallHangupEvent extends AsteriskWebSocketMessage {
    event: 'hangup' | 'disconnect';
    /** Caller phone number */
    caller?: string;
    /** Extension */
    exten?: string;
    /** Hangup cause code */
    cause?: string;
    /** Hangup cause text */
    causeTxt?: string;
}

/**
 * Stop ringing event (for ring groups)
 */
export interface StopRingingEvent extends AsteriskWebSocketMessage {
    event: 'stop_ringing';
    /** Target extension to stop ringing */
    targetExtension?: string;
    /** Reason for stop ringing */
    reason?: 'timeout' | 'caller_hangup' | 'busy' | 'answered_elsewhere' | 'dial_ended' | 'hangup';
    /** Dial status code */
    dialstatus?: string;
    /** Extension that answered (if answered_elsewhere) */
    answeredBy?: string;
}

/**
 * Union type for all outbound call events
 */
export type OutboundCallEvent =
    | OutboundDialEvent
    | OutboundConnectEvent
    | OutboundHangupEvent;

/**
 * Union type for all inbound call events
 */
export type InboundCallEvent =
    | InboundRingEvent
    | CallConnectEvent
    | CallHangupEvent
    | StopRingingEvent;

/**
 * Union type for all Asterisk call events
 */
export type AsteriskCallEvent =
    | OutboundCallEvent
    | InboundCallEvent;