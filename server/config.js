'use strict';

require('dotenv').config();

/**
 * Server configuration object
 * Sensitive values loaded from environment variables
 */
const CONFIG = {
    process: {
        title: 'CallNotifierServer',
    },

    websocket: {
        port: parseInt(process.env.WS_PORT || '9000', 10),
        address: process.env.WS_ADDRESS || '0.0.0.0',
        pingInterval: 30000,
        pingTimeout: 5000,
    },

    ssl: {
        keyPath: process.env.SSL_KEY_PATH || '/etc/apache2/pki/webserver.key',
        certPath: process.env.SSL_CERT_PATH || '/etc/apache2/pki/webserver.pem',
    },

    asterisk: {
        host: process.env.AMI_HOST || '127.0.0.1',
        amiPort: parseInt(process.env.AMI_PORT || '5038', 10),
        amiUser: process.env.AMI_USER || 'hammad',
        amiPassword: process.env.AMI_PASSWORD || '46d8e1e83989c7efd94f7fcf862cec083fe10088',
    },

    postgres: {
        host: process.env.PG_HOST || '127.0.0.1',
        port: parseInt(process.env.PG_PORT || '5432', 10),
        database: process.env.PG_DATABASE || 'salf-crm-api',
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || 'Al123_45',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    },

    notifications: {
        mode: 'all',
        retryTimeout: 5000,
        queryDelay: 0,
    },

    logging: {
        enabled: true,
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || '/var/log/node_server.log',
        maxFileSize: 10 * 1024 * 1024,
    },

    amiReconnect: {
        enabled: true,
        initialDelayMs: 1000,
        maxDelayMs: 60000,
        backoffMultiplier: 2,
        maxRetries: 0,
        jitterMs: 500,
        healthCheckIntervalMs: 30000,
    },

    sessions: {
        cleanupIntervalMs: 300000,
        maxSessionAgeMs: 3600000,
    },

    storage: {
        basePath: process.env.STORAGE_PATH || '/var/www/salf-crm/shared/storage',
        recordingsDir: 'app/private/recordings',
    },
};

module.exports = CONFIG;
