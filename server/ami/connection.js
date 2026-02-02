'use strict';

const AsteriskManager = require('asterisk-manager');

const CONFIG = require('../config');
const Logger = require('../logger');
const Broadcaster = require('../broadcaster');
const { AMIState } = require('../constants');
const { amiState, getAMI, setAMI } = require('./state');
const AMIEventRouter = require('./events');

/**
 * AMI Reconnection Manager
 */
const AMIReconnect = {
    /**
     * Calculate next reconnection delay with exponential backoff and jitter
     * @returns {number} Delay in milliseconds
     */
    calculateDelay() {
        const config = CONFIG.amiReconnect;
        let delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, amiState.reconnectAttempts);
        delay = Math.min(delay, config.maxDelayMs);
        delay += Math.random() * config.jitterMs;
        return Math.floor(delay);
    },

    /**
     * Broadcast AMI connection status
     * @param {string} status - Connection status
     * @param {Object} details - Additional details
     */
    broadcastStatus(status, details = {}) {
        amiState.status = status;

        Broadcaster.broadcast({
            event: 'ami_status',
            status: status,
            timestamp: new Date().toISOString(),
            ...details,
        });

        Logger.info('AMI status changed', { status, ...details });
    },

    /**
     * Handle successful connection
     */
    handleConnected() {
        const wasReconnecting = amiState.reconnectAttempts > 0;

        amiState.isConnected = true;
        amiState.isConnecting = false;
        amiState.lastConnectedAt = new Date();
        amiState.lastError = null;
        amiState.reconnectAttempts = 0;
        amiState.currentDelay = CONFIG.amiReconnect.initialDelayMs;

        if (amiState.reconnectTimer) {
            clearTimeout(amiState.reconnectTimer);
            amiState.reconnectTimer = null;
        }

        this.startHealthCheck();

        const message = wasReconnecting ? 'AMI reconnected successfully' : 'AMI connected successfully';
        Logger.info('✅ ' + message);
        Logger.info('🔗 AMI CONNECTION READY - Server can now receive Asterisk events');

        this.broadcastStatus(AMIState.CONNECTED, {
            reconnected: wasReconnecting,
            connectedAt: amiState.lastConnectedAt.toISOString(),
        });
    },

    /**
     * Handle disconnection
     * @param {Error|null} error - Disconnect error
     */
    handleDisconnected(error = null) {
        const wasConnected = amiState.isConnected;

        amiState.isConnected = false;
        amiState.lastDisconnectedAt = new Date();
        amiState.lastError = error ? error.message : 'Connection lost';

        this.stopHealthCheck();

        Logger.warn('AMI disconnected', { reason: amiState.lastError });

        if (wasConnected) {
            this.broadcastStatus(AMIState.DISCONNECTED, {
                reason: amiState.lastError,
                disconnectedAt: amiState.lastDisconnectedAt.toISOString(),
            });
        }

        if (CONFIG.amiReconnect.enabled) {
            this.scheduleReconnect();
        }
    },

    /**
     * Handle connection error
     * @param {Error} error - Connection error
     */
    handleError(error) {
        amiState.lastError = error.message;
        Logger.error('AMI error', { error: error.message });

        if (!amiState.isConnected && !amiState.isConnecting) {
            this.handleDisconnected(error);
        }
    },

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        const config = CONFIG.amiReconnect;

        if (config.maxRetries > 0 && amiState.reconnectAttempts >= config.maxRetries) {
            Logger.error('AMI reconnection failed: max retries reached', {
                attempts: amiState.reconnectAttempts,
            });
            this.broadcastStatus(AMIState.ERROR, {
                message: 'Maximum reconnection attempts reached',
                attempts: amiState.reconnectAttempts,
            });
            return;
        }

        if (amiState.isConnecting || amiState.reconnectTimer) {
            return;
        }

        const delay = this.calculateDelay();
        amiState.currentDelay = delay;

        Logger.info('Scheduling AMI reconnect', {
            attempt: amiState.reconnectAttempts + 1,
            delay_ms: delay,
        });

        this.broadcastStatus(AMIState.RECONNECTING, {
            attempt: amiState.reconnectAttempts + 1,
            nextAttemptIn: delay,
            maxRetries: config.maxRetries || 'unlimited',
        });

        amiState.reconnectTimer = setTimeout(() => {
            amiState.reconnectTimer = null;
            this.attemptReconnect();
        }, delay);
    },

    /**
     * Attempt reconnection
     */
    attemptReconnect() {
        if (amiState.isConnected || amiState.isConnecting) {
            Logger.debug('AMI reconnect skipped: already connected/connecting');
            return;
        }

        amiState.isConnecting = true;
        amiState.reconnectAttempts++;

        Logger.info('AMI reconnection attempt', { attempt: amiState.reconnectAttempts });

        try {
            const ami = getAMI();
            if (ami) {
                try {
                    ami.disconnect();
                } catch (_e) {
                    // Ignore disconnect errors
                }
                setAMI(null);
            }

            createAMIConnection();
        } catch (error) {
            Logger.error('AMI reconnection attempt failed', { error: error.message });
            amiState.isConnecting = false;
            this.scheduleReconnect();
        }
    },

    /**
     * Start health check interval
     */
    startHealthCheck() {
        if (amiState.healthCheckTimer) {
            return;
        }

        amiState.healthCheckTimer = setInterval(() => {
            const ami = getAMI();
            if (!ami || !amiState.isConnected) {
                return;
            }

            ami.action({ Action: 'Ping' }, (err) => {
                if (err) {
                    Logger.warn('AMI health check failed', { error: err.message });
                    this.handleDisconnected(err);
                } else {
                    Logger.debug('AMI health check OK');
                }
            });
        }, CONFIG.amiReconnect.healthCheckIntervalMs);

        Logger.debug('AMI health check started');
    },

    /**
     * Stop health check interval
     */
    stopHealthCheck() {
        if (amiState.healthCheckTimer) {
            clearInterval(amiState.healthCheckTimer);
            amiState.healthCheckTimer = null;
            Logger.debug('AMI health check stopped');
        }
    },
};

/**
 * Create AMI connection with all event handlers
 */
function createAMIConnection() {
    const ami = new AsteriskManager(
        CONFIG.asterisk.amiPort,
        CONFIG.asterisk.host,
        CONFIG.asterisk.amiUser,
        CONFIG.asterisk.amiPassword,
        true // events enabled
    );

    setAMI(ami);

    // Connection handlers
    ami.on('connect', () => AMIReconnect.handleConnected());
    ami.on('close', () => {
        if (amiState.isConnected) {
            AMIReconnect.handleDisconnected(new Error('Connection closed'));
        }
    });
    ami.on('error', (err) => AMIReconnect.handleError(err));

    // Register event handlers
    AMIEventRouter.registerHandlers(ami);

    Logger.info('AMI connection created, waiting for connect event...');
}

/**
 * Initialize AMI with reconnection support
 */
function initializeAMI() {
    Logger.info('Initializing AMI with reconnection support', {
        enabled: CONFIG.amiReconnect.enabled,
        initialDelay: CONFIG.amiReconnect.initialDelayMs,
        maxDelay: CONFIG.amiReconnect.maxDelayMs,
        maxRetries: CONFIG.amiReconnect.maxRetries || 'unlimited',
    });

    createAMIConnection();
}

module.exports = {
    initializeAMI,
    createAMIConnection,
    AMIReconnect,
    amiState,
};
