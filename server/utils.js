'use strict';

const crypto = require('crypto');

/**
 * Convert object to simple JSON string (remove functions and nested objects)
 * @param {Object} object - Object to stringify
 * @returns {string} JSON string representation
 */
function simpleStringify(object) {
    const simpleObject = {};
    for (const prop in object) {
        if (!Object.prototype.hasOwnProperty.call(object, prop)) {
            continue;
        }
        if (typeof object[prop] === 'object' || typeof object[prop] === 'function') {
            continue;
        }
        simpleObject[prop] = object[prop];
    }
    return JSON.stringify(simpleObject);
}

/**
 * Generate a UUID v4
 * @returns {string} UUID string
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * Normalize phone number to last 10 digits
 * @param {string} phone - Phone number to normalize
 * @returns {string} Last 10 digits of the phone number
 */
function normalizePhone(phone) {
    const digits = (phone || '').replace(/[^0-9]/g, '');
    return digits.slice(-10);
}

/**
 * Extract extension number from Asterisk channel name
 * @param {string} channel - Channel name (e.g., PJSIP/101-0000abc, SIP/101-0000abc)
 * @returns {string|null} Extension number or null if not found
 */
function extractExtensionFromChannel(channel) {
    if (!channel) {
        return null;
    }

    // Match patterns like PJSIP/101-xxx, SIP/101-xxx, Local/101@xxx
    const match = channel.match(/^(?:PJSIP|SIP|IAX2|Local)\/(\d+)[-@]/i);
    if (match && match[1]) {
        return match[1];
    }

    // Fallback: try to extract any number after the slash
    const fallbackMatch = channel.match(/\/(\d+)/);
    if (fallbackMatch && fallbackMatch[1]) {
        return fallbackMatch[1];
    }

    return null;
}

module.exports = {
    simpleStringify,
    generateUUID,
    normalizePhone,
    extractExtensionFromChannel,
};
