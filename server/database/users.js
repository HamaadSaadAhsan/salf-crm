'use strict';

const Database = require('./index');
const Logger = require('../logger');

/**
 * Users database operations
 */
const UsersDB = {
    /**
     * Get user ID by extension number
     * @param {string} extension - Extension number
     * @returns {Promise<number|null>} User ID or null
     */
    async getByExtension(extension) {
        const result = await Database.queryWithRetry('SELECT id FROM users WHERE extension = $1 LIMIT 1', [extension]);

        if (result && result.rows.length > 0) {
            return result.rows[0].id;
        }

        Logger.debug('No user found with extension', { extension });
        return null;
    },
};

module.exports = UsersDB;
