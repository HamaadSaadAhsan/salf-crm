'use strict';

const Logger = require('./logger');

/**
 * Connected WebSocket clients
 * @type {Array}
 */
let clients = [];

/**
 * WebSocket Broadcaster - Handles message broadcasting to clients
 */
const Broadcaster = {
    /**
     * Get all connected clients
     * @returns {Array}
     */
    getClients() {
        return clients;
    },

    /**
     * Set clients array (used during initialization)
     * @param {Array} clientsArray
     */
    setClients(clientsArray) {
        clients = clientsArray;
    },

    /**
     * Add a client
     * @param {Object} client
     * @returns {number} Client index
     */
    addClient(client) {
        return clients.push(client) - 1;
    },

    /**
     * Remove a client
     * @param {Object} client
     */
    removeClient(client) {
        clients = clients.filter((c) => c !== client);
    },

    /**
     * Get client count
     * @returns {number}
     */
    clientCount() {
        return clients.length;
    },

    /**
     * Broadcast message to clients with optional filtering
     * @param {Object} message - Message to broadcast
     * @param {Function|null} filter - Optional filter function (client) => boolean
     */
    broadcast(message, filter = null) {
        const messageStr = JSON.stringify(message);
        let sentCount = 0;

        clients.forEach((client, index) => {
            try {
                if (filter && !filter(client)) {
                    return;
                }

                if (client.connected) {
                    client.sendUTF(messageStr);
                    sentCount++;
                }
            } catch (err) {
                Logger.error('Error sending message to client', { index, error: err.message });
            }
        });

        Logger.debug('Message broadcast', {
            event: message.event,
            recipients: sentCount,
            total_clients: clients.length,
        });
    },

    /**
     * Broadcast to clients registered with a specific extension
     * @param {Object} message - Message to broadcast
     * @param {string} extension - Target extension
     */
    toExtension(message, extension) {
        const matchingClients = clients.filter((c) => c.exten === extension);
        Logger.info('📤 BROADCASTING TO EXTENSION', {
            target_extension: extension,
            event: message.event,
            matching_clients: matchingClients.length,
            all_registered_extensions: clients.filter((c) => c.exten).map((c) => c.exten),
            total_clients: clients.length,
        });
        this.broadcast(message, (client) => client.exten === extension);
    },

    /**
     * Broadcast to all logged-in clients
     * @param {Object} message - Message to broadcast
     */
    toLoggedIn(message) {
        this.broadcast(message, (client) => client.login === true);
    },

    /**
     * Send message to a specific connection
     * @param {Object} connection - WebSocket connection
     * @param {Object} message - Message to send
     */
    send(connection, message) {
        try {
            if (connection.connected) {
                connection.sendUTF(JSON.stringify(message));
            }
        } catch (err) {
            Logger.error('Error sending message to connection', { error: err.message });
        }
    },
};

module.exports = Broadcaster;
