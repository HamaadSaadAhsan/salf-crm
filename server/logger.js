'use strict';

const fs = require('fs');
const CONFIG = require('./config');
const { LogLevel } = require('./constants');

/**
 * Logger with structured logging and log levels
 */
const Logger = {
    /**
     * Get current log level priority from config
     */
    getConfiguredLevel() {
        const levelMap = {
            debug: LogLevel.DEBUG.priority,
            info: LogLevel.INFO.priority,
            warn: LogLevel.WARN.priority,
            error: LogLevel.ERROR.priority,
        };
        return levelMap[CONFIG.logging.level.toLowerCase()] || LogLevel.INFO.priority;
    },

    /**
     * Format log message with timestamp and level
     */
    format(level, message, context = null) {
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 23);
        let logEntry = `${timestamp} [${level.name}] ${message}`;
        if (context) {
            logEntry += ` | ${JSON.stringify(context)}`;
        }
        return logEntry;
    },

    /**
     * Write log entry to console and file
     */
    write(level, message, context = null) {
        if (level.priority < this.getConfiguredLevel()) {
            return;
        }

        const logEntry = this.format(level, message, context);
        console.log(logEntry);

        if (!CONFIG.logging.enabled) {
            return;
        }

        fs.appendFile(CONFIG.logging.file, logEntry + '\n', (err) => {
            if (err) {
                console.error('Failed to write to log file:', err.message);
            }
        });
    },

    debug(message, context = null) {
        this.write(LogLevel.DEBUG, message, context);
    },

    info(message, context = null) {
        this.write(LogLevel.INFO, message, context);
    },

    warn(message, context = null) {
        this.write(LogLevel.WARN, message, context);
    },

    error(message, context = null) {
        this.write(LogLevel.ERROR, message, context);
    },
};

module.exports = Logger;
