'use strict';

const fs = require('fs');
const https = require('https');
const WebSocketServer = require('websocket').server;

const CONFIG = require('../config');
const Logger = require('../logger');
const { WebSocketHandlers } = require('./handlers');

let httpServer = null;
let wssServer = null;

/**
 * Initialize HTTP and WebSocket servers
 * @returns {Object} Server instances
 */
function initializeServers() {
    // Create HTTPS server
    httpServer = https.createServer({
        key: fs.readFileSync(CONFIG.ssl.keyPath),
        cert: fs.readFileSync(CONFIG.ssl.certPath),
    });

    httpServer.listen(CONFIG.websocket.port, CONFIG.websocket.address, () => {
        Logger.info('Server listening', {
            address: CONFIG.websocket.address,
            port: CONFIG.websocket.port,
        });
    });

    // Create WebSocket server
    wssServer = new WebSocketServer({
        httpServer: httpServer,
        autoAcceptConnections: false,
    });

    wssServer.on('request', (request) => WebSocketHandlers.handleConnection(request));
    wssServer.on('error', (err) => Logger.error('WebSocket server error', { error: err.message }));

    Logger.info('WebSocket server initialized');

    return { httpServer, wssServer };
}

/**
 * Get HTTP server instance
 * @returns {Object|null}
 */
function getHttpServer() {
    return httpServer;
}

/**
 * Get WebSocket server instance
 * @returns {Object|null}
 */
function getWssServer() {
    return wssServer;
}

module.exports = {
    initializeServers,
    getHttpServer,
    getWssServer,
};
