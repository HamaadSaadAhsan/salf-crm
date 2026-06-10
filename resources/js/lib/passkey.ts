import http from '@/lib/http';
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';

export { browserSupportsWebAuthn };

type RegistrationOptionsJSON = Parameters<typeof startRegistration>[0]['optionsJSON'];
type AuthenticationOptionsJSON = Parameters<typeof startAuthentication>[0]['optionsJSON'];

export interface PasskeySummary {
    id: number;
    name: string;
    last_used_at: string | null;
    created_at: string;
}

/**
 * Run the WebAuthn assertion ceremony and sign the user in with a passkey.
 */
export async function loginWithPasskey(remember = false): Promise<void> {
    const { data } = await http.get<{ options: AuthenticationOptionsJSON }>('/passkeys/login/options');
    const credential = await startAuthentication({ optionsJSON: data.options });
    await http.post('/passkeys/login', { credential, remember });
}

/**
 * Run the WebAuthn attestation ceremony and register a new passkey for the user.
 */
export async function registerPasskey(name: string): Promise<void> {
    const { data } = await http.get<{ options: RegistrationOptionsJSON }>('/user/passkeys/options');
    const credential = await startRegistration({ optionsJSON: data.options });
    await http.post('/user/passkeys', { name, credential });
}

/**
 * Delete a passkey belonging to the authenticated user.
 */
export async function deletePasskey(id: number): Promise<void> {
    await http.delete(`/user/passkeys/${id}`);
}

/**
 * Determine whether the user has confirmed their password recently.
 */
export async function isPasswordConfirmed(): Promise<boolean> {
    const { data } = await http.get<{ confirmed: boolean }>('/user/confirmed-password-status');
    return data.confirmed;
}

/**
 * Confirm the user's password to unlock passkey management routes.
 */
export async function confirmPassword(password: string): Promise<void> {
    await http.post('/user/confirm-password', { password });
}
