'use strict';

const Logger = require('../logger');
const Broadcaster = require('../broadcaster');
const { MessageType } = require('../constants');

/**
 * AMI Actions handler (imported dynamically to avoid circular deps)
 */
let AMIActions = null;

/**
 * Set AMI Actions handler
 * @param {Object} actions
 */
function setAMIActions(actions) {
    AMIActions = actions;
}

/**
 * WebSocket message and connection handlers
 */
const WebSocketHandlers = {
    /**
     * Handle incoming WebSocket message
     * @param {Object} connection - WebSocket connection
     * @param {Object} message - Message object
     */
    handleMessage(connection, message) {
        if (message.type !== 'utf8') {
            return;
        }

        try {
            const data = JSON.parse(message.utf8Data);
            Logger.debug('Received message', { data: message.utf8Data.substring(0, 200) });

            // Handle ping/pong for connection health
            if (data.type === MessageType.PING) {
                Broadcaster.send(connection, { type: MessageType.PONG, timestamp: Date.now() });
                return;
            }

            // Handle login/logout
            if (data.login !== undefined) {
                connection.login = data.login;
                Logger.info(`User ${data.login ? 'logged in' : 'logged out'}`, {
                    exten: connection.exten,
                });
            }

            // Handle extension registration
            if (data.exten) {
                const previousExten = connection.exten;
                connection.exten = data.exten;
                Logger.info('🔔 EXTENSION REGISTERED', {
                    exten: data.exten,
                    previous_exten: previousExten,
                    total_clients: Broadcaster.clientCount(),
                    clients_with_exten: Broadcaster.getClients()
                        .filter((c) => c.exten)
                        .map((c) => c.exten),
                });
            }

            // Handle AMI actions
            if (data.Action && AMIActions) {
                AMIActions.route(data, connection);
            }

            // Handle originate shorthand (agent + client)
            if (data.agent && data.client && !data.Action && AMIActions) {
                AMIActions.originate(data, connection);
            }
        } catch (err) {
            Logger.error('Error parsing message', { error: err.message });
        }
    },

    /**
     * Handle new WebSocket connection
     * @param {Object} request - Connection request
     */
    handleConnection(request) {
        const connection = request.accept(null, request.origin);
        Broadcaster.addClient(connection);

        Logger.info('New connection', {
            address: request.remoteAddress,
            total_clients: Broadcaster.clientCount(),
        });

        // Initialize connection state
        connection.exten = null;
        connection.login = false;
        connection.connected = true;
        connection.lastPing = Date.now();

        // Message handler
        connection.on('message', (message) => {
            this.handleMessage(connection, message);
        });

        // Disconnect handler
        connection.on('close', () => {
            Logger.info('Client disconnected', {
                exten: connection.exten,
                address: request.remoteAddress,
            });
            connection.connected = false;
            Broadcaster.removeClient(connection);
        });

        // Error handler
        connection.on('error', (err) => {
            Logger.error('WebSocket error', { error: err.message });
        });
    },
};

module.exports = {
    WebSocketHandlers,
    setAMIActions,
};
