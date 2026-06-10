import http from '@/lib/http';
import { Passkeys } from '@laravel/passkeys';

export { InvalidDomainError, NotSupportedError, PasskeyError, PasskeyExistsError, UserCancelledError } from '@laravel/passkeys';

export interface PasskeySummary {
    id: number;
    name: string;
    last_used_at: string | null;
    created_at: string;
}

/**
 * Determine whether the current browser supports passkeys.
 */
export function browserSupportsPasskeys(): boolean {
    return Passkeys.isSupported();
}

/**
 * Run the WebAuthn assertion ceremony and sign the user in with a passkey.
 *
 * @returns The URL the server wants the browser to navigate to after login.
 */
export async function loginWithPasskey(): Promise<string> {
    const { redirect } = await Passkeys.verify();

    return redirect ?? '/dashboard';
}

/**
 * Run the WebAuthn attestation ceremony and register a new passkey for the user.
 */
export async function registerPasskey(name: string): Promise<void> {
    await Passkeys.register({ name });
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
