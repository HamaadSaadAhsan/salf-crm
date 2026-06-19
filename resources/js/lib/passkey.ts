import http from '@/lib/http';

export { InvalidDomainError, NotSupportedError, PasskeyError, PasskeyExistsError, UserCancelledError } from '@laravel/passkeys';

export interface PasskeySummary {
    id: number;
    name: string;
    last_used_at: string | null;
    created_at: string;
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
