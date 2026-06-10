import http from '@/lib/http';

/**
 * Enable two-factor authentication, generating an unconfirmed secret.
 */
export async function enableTwoFactor(): Promise<void> {
    await http.post('/user/two-factor-authentication');
}

/**
 * Disable two-factor authentication for the user.
 */
export async function disableTwoFactor(): Promise<void> {
    await http.delete('/user/two-factor-authentication');
}

/**
 * Confirm two-factor authentication with a code from the authenticator app.
 */
export async function confirmTwoFactor(code: string): Promise<void> {
    await http.post('/user/confirmed-two-factor-authentication', { code });
}

/**
 * Get the SVG QR code for enrolling the authenticator app.
 */
export async function twoFactorQrCode(): Promise<string> {
    const { data } = await http.get<{ svg: string }>('/user/two-factor-qr-code');
    return data.svg;
}

/**
 * Get the plain-text two-factor secret key.
 */
export async function twoFactorSecretKey(): Promise<string> {
    const { data } = await http.get<{ secretKey: string }>('/user/two-factor-secret-key');
    return data.secretKey;
}

/**
 * Get the user's two-factor recovery codes.
 */
export async function twoFactorRecoveryCodes(): Promise<string[]> {
    const { data } = await http.get<string[]>('/user/two-factor-recovery-codes');
    return data;
}

/**
 * Regenerate and return a fresh set of recovery codes.
 */
export async function regenerateRecoveryCodes(): Promise<string[]> {
    await http.post('/user/two-factor-recovery-codes');
    return twoFactorRecoveryCodes();
}
