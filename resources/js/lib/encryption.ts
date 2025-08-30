/**
 * Encryption utilities for securely handling sensitive tokens
 *
 * This module provides functions to encrypt and decrypt tokens
 * using Node.js built-in crypto module.
 */

import crypto from 'crypto';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16 bytes
const AUTH_TAG_LENGTH = 16; // For GCM mode

/**
 * Encrypt a token using AES-256-GCM
 *
 * @param {string} token - The token to encrypt
 * @returns {string} Base64 encoded encrypted token
 */
export function encryptToken(token: string): string | null {
    if (!token) return null;

    // Get an encryption key from the environment variable
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY environment variable must be set');
    }

    // Ensure we have a 32-byte key (256 bits)
    const key = crypto.createHash('sha256').update(encryptionKey).digest();

    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    // Encrypt the token
    let encrypted = cipher.update(token, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get the auth tag (for GCM mode)
    const authTag = cipher.getAuthTag();

    // Combine IV, encrypted data, and auth tag into a single string
    // Format: base64(iv):base64(authTag):base64(encryptedData)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt a token that was encrypted using encryptToken
 *
 * @param {string} encryptedToken - The encrypted token to decrypt
 * @returns {string} The decrypted token
 */
export function decryptToken(encryptedToken: string): string | null {
    if (!encryptedToken) return null;

    // Get an encryption key from environment variable
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY environment variable must be set');
    }

    // Ensure we have a 32-byte key (256 bits)
    const key = crypto.createHash('sha256').update(encryptionKey).digest();

    // Split the encrypted token into its components
    const [ivBase64, authTagBase64, encryptedData] = encryptedToken.split(':');

    if (!ivBase64 || !authTagBase64 || !encryptedData) {
        throw new Error('Invalid encrypted token format');
    }

    // Convert base64 components back to buffers
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    // Create deciphering
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the token
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}