#!/usr/bin/env node

/**
 * Asterisk Call Notifier Server v2.0.0
 *
 * A WebSocket server that bridges Asterisk AMI events to the Laravel CRM frontend.
 *
 * Flow:
 * 1. incoming.php AGI script creates call_session and call_logs in database
 * 2. incoming.php sets SESSION_ID variable on the Asterisk channel
 * 3. This server receives VarSet event with SESSION_ID
 * 4. This server looks up the session from database and maps uniqueid -> session_id
 * 5. This server broadcasts events to WebSocket clients
 *
 * @author Hamaad Kaleem
 * @version 2.0.0
 */

'use strict';

const CONFIG = require('./config');
const Logger = require('./logger');
const Database = require('./database');
const SessionManager = require('./session-manager');
const Broadcaster = require('./broadcaster');
const { initializeServers } = require('./websocket/server');
const { setAMIActions } = require('./websocket/handlers');
const { initializeAMI, AMIReconnect, amiState } = require('./ami/connection');
const AMIActions = require('./ami/actions');
const { AMIState } = require('./constants');

/**
 * Main initialization
 */
function initialize() {
    process.title = CONFIG.process.title;

    Logger.info('='.repeat(80));
    Logger.info('Starting Call Notifier Server v2.0.0');
    Logger.info('='.repeat(80));

    // Initialize database connection
    Database.initialize();

    // Set up WebSocket AMI actions handler
    setAMIActions(AMIActions);

    // Initialize AMI connection
    initializeAMI();

    // Initialize WebSocket servers
    initializeServers();

    // Start session cleanup interval
    SessionManager.startCleanupInterval();

    Logger.info('Server initialization complete', {
        active_sessions: SessionManager.count(),
        connected_clients: Broadcaster.clientCount(),
    });
}

/**
 * Graceful shutdown handler
 * @param {string} signal - Signal received
 */
async function gracefulShutdown(signal) {
    Logger.info(`Received ${signal}, initiating graceful shutdown...`);

    // Notify clients
    AMIReconnect.broadcastStatus(AMIState.DISCONNECTED, {
        reason: 'Server shutdown',
        disconnectedAt: new Date().toISOString(),
    });

    // Stop intervals
    AMIReconnect.stopHealthCheck();
    SessionManager.stopCleanupInterval();

    if (amiState.reconnectTimer) {
        clearTimeout(amiState.reconnectTimer);
        amiState.reconnectTimer = null;
    }

    // Disconnect AMI
    const { getAMI, setAMI } = require('./ami/state');
    const ami = getAMI();
    if (ami) {
        try {
            ami.disconnect();
            setAMI(null);
            Logger.info('AMI disconnected');
        } catch (err) {
            Logger.error('Error disconnecting AMI', { error: err.message });
        }
    }

    // Close database pool
    await Database.close();

    // Close WebSocket connections
    const clients = Broadcaster.getClients();
    clients.forEach((client) => {
        try {
            if (client.connected) {
                client.close();
            }
        } catch (err) {
            Logger.error('Error closing WebSocket client', { error: err.message });
        }
    });
    Logger.info('WebSocket connections closed', { count: clients.length });

    Logger.info('Graceful shutdown complete');
    process.exit(0);
}

// Error handlers
process.on('uncaughtException', (err) => {
    Logger.error('Uncaught exception', { error: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason) => {
    Logger.error('Unhandled rejection', { reason: String(reason) });
});

// Signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server
initialize();
