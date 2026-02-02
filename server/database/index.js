'use strict';

const { Pool } = require('pg');
const CONFIG = require('../config');
const Logger = require('../logger');

let pgPool = null;

/**
 * Database connection and base query operations
 */
const Database = {
    /**
     * Initialize PostgreSQL connection pool
     */
    initialize() {
        pgPool = new Pool({
            host: CONFIG.postgres.host,
            port: CONFIG.postgres.port,
            database: CONFIG.postgres.database,
            user: CONFIG.postgres.user,
            password: CONFIG.postgres.password,
            max: CONFIG.postgres.max,
            idleTimeoutMillis: CONFIG.postgres.idleTimeoutMillis,
            connectionTimeoutMillis: CONFIG.postgres.connectionTimeoutMillis,
        });

        pgPool.on('error', (err) => {
            Logger.error('PostgreSQL pool error', { error: err.message });
        });

        pgPool.on('connect', () => {
            Logger.debug('PostgreSQL client connected');
        });

        Logger.info('PostgreSQL connection pool initialized');
    },

    /**
     * Get the pool instance
     * @returns {Pool|null}
     */
    getPool() {
        return pgPool;
    },

    /**
     * Execute a query with retry logic
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @param {number} retries - Number of retries on failure
     * @returns {Promise<Object|null>} Query result or null on failure
     */
    async queryWithRetry(query, params = [], retries = 3) {
        if (!pgPool) {
            Logger.error('PostgreSQL pool not initialized');
            return null;
        }

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await pgPool.query(query, params);
            } catch (err) {
                Logger.warn(`Database query attempt ${attempt} failed`, {
                    error: err.message,
                    query: query.substring(0, 100),
                });

                if (attempt === retries) {
                    Logger.error('Database query failed after retries', { error: err.message });
                    return null;
                }

                await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
            }
        }
        return null;
    },

    /**
     * Gracefully close the connection pool
     */
    async close() {
        if (pgPool) {
            await pgPool.end();
            Logger.info('PostgreSQL pool closed');
        }
    },
};

module.exports = Database;
