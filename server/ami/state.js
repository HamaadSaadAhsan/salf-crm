'use strict';

const CONFIG = require('../config');
const { AMIState } = require('../constants');

/**
 * AMI connection state
 */
const amiState = {
    status: AMIState.DISCONNECTED,
    isConnected: false,
    isConnecting: false,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    reconnectAttempts: 0,
    currentDelay: CONFIG.amiReconnect.initialDelayMs,
    reconnectTimer: null,
    healthCheckTimer: null,
    lastError: null,
};

/**
 * AMI instance holder
 */
let ami = null;

/**
 * Get AMI instance
 * @returns {Object|null}
 */
function getAMI() {
    return ami;
}

/**
 * Set AMI instance
 * @param {Object} instance
 */
function setAMI(instance) {
    ami = instance;
}

module.exports = {
    amiState,
    getAMI,
    setAMI,
};
