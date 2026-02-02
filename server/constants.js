'use strict';

/**
 * WebSocket message types
 */
const MessageType = Object.freeze({
    // Client -> Server
    LOGIN: 'login',
    LOGOUT: 'logout',
    REGISTER_EXTENSION: 'register_extension',
    AMI_ACTION: 'ami_action',
    ORIGINATE: 'originate',
    HANGUP: 'hangup',
    STATUS: 'status',
    PING: 'ping',

    // Server -> Client
    RING: 'ring',
    STOP_RINGING: 'stop_ringing',
    CONNECT: 'connect',
    BUSY: 'busy',
    HANGUP_EVENT: 'hangup',
    DISCONNECT: 'disconnect',
    BRIDGE: 'bridge',
    BRIDGE_ENTER: 'bridgeenter',
    BRIDGE_LEAVE: 'bridgeleave',
    DIAL_BEGIN: 'dialbegin',
    DIAL_END: 'dialend',
    HOLD: 'hold',
    UNHOLD: 'unhold',
    DTMF: 'dtmf',
    VAR_SET: 'varset',
    NEW_CALLER_ID: 'newcallerid',
    NEW_EXTEN: 'newexten',

    // Status messages
    AMI_STATUS: 'ami_status',
    ORIGINATE_RESPONSE: 'OriginateResponse',
    HANGUP_RESPONSE: 'HangupResponse',
    STATUS_RESPONSE: 'StatusResponse',
    PONG: 'pong',
    ERROR: 'error',
});

/**
 * Log levels with priority
 */
const LogLevel = Object.freeze({
    DEBUG: { name: 'DEBUG', priority: 0 },
    INFO: { name: 'INFO', priority: 1 },
    WARN: { name: 'WARN', priority: 2 },
    ERROR: { name: 'ERROR', priority: 3 },
});

/**
 * AMI connection states
 */
const AMIState = Object.freeze({
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
});

module.exports = {
    MessageType,
    LogLevel,
    AMIState,
};
