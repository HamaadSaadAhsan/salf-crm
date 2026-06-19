import InputError from '@/components/input-error';
import ManagePasskeys from '@/components/manage-passkeys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { confirmPassword, isPasswordConfirmed } from '@/lib/passkey';
import {
    confirmTwoFactor,
    disableTwoFactor,
    enableTwoFactor,
    regenerateRecoveryCodes,
    twoFactorQrCode,
    twoFactorRecoveryCodes,
    twoFactorSecretKey,
} from '@/lib/two-factor';
import { security } from '@/routes/settings';
import { type BreadcrumbItem } from '@/types';
import { type Passkey } from '@/types/auth';
import { Head, router } from '@inertiajs/react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Security',
        href: security().url,
    },
];

interface TwoFactorSetup {
    qr: string;
    secret: string;
    recoveryCodes: string[];
}

interface SecurityProps {
    passkeys: Passkey[];
    canManagePasskeys: boolean;
    twoFactorEnabled: boolean;
}

function errorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object' && 'response' in error) {
        const data = (error as { response?: { data?: { message?: string } } }).response?.data;
        if (data?.message) {
            return data.message;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}

export default function Security({ passkeys, canManagePasskeys, twoFactorEnabled }: SecurityProps) {
    // Password confirmation guard (used by two-factor management) ----------------
    const pendingAction = useRef<(() => Promise<void>) | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmValue, setConfirmValue] = useState('');
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [confirmProcessing, setConfirmProcessing] = useState(false);

    const guard = async (action: () => Promise<void>): Promise<void> => {
        try {
            if (await isPasswordConfirmed()) {
                await action();

                return;
            }
        } catch {
            // Fall through to prompt for the password.
        }

        pendingAction.current = action;
        setConfirmError(null);
        setConfirmValue('');
        setConfirmOpen(true);
    };

    const submitConfirm = async (event: React.FormEvent) => {
        event.preventDefault();
        setConfirmProcessing(true);
        setConfirmError(null);

        try {
            await confirmPassword(confirmValue);
            setConfirmOpen(false);
            setConfirmValue('');

            const action = pendingAction.current;
            pendingAction.current = null;

            if (action) {
                await action();
            }
        } catch (error) {
            setConfirmError(errorMessage(error, 'The provided password is incorrect.'));
        } finally {
            setConfirmProcessing(false);
        }
    };

    // Two-factor authentication --------------------------------------------------
    const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
    const [twoFactorBusy, setTwoFactorBusy] = useState(false);
    const [confirmCode, setConfirmCode] = useState('');
    const [confirmCodeError, setConfirmCodeError] = useState<string | null>(null);
    const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

    const beginEnableTwoFactor = () => {
        void guard(async () => {
            setTwoFactorBusy(true);

            try {
                await enableTwoFactor();
                const [qr, secret, codes] = await Promise.all([twoFactorQrCode(), twoFactorSecretKey(), twoFactorRecoveryCodes()]);
                setSetup({ qr, secret, recoveryCodes: codes });
                setConfirmCode('');
                setConfirmCodeError(null);
            } catch (error) {
                toast.error(errorMessage(error, 'Could not start two-factor setup.'));
            } finally {
                setTwoFactorBusy(false);
            }
        });
    };

    const submitTwoFactorConfirm = async (event: React.FormEvent) => {
        event.preventDefault();
        setTwoFactorBusy(true);
        setConfirmCodeError(null);

        try {
            await confirmTwoFactor(confirmCode);
            setSetup(null);
            setConfirmCode('');
            toast.success('Two-factor authentication enabled');
            router.reload({ only: ['twoFactorEnabled'] });
        } catch (error) {
            setConfirmCodeError(errorMessage(error, 'The provided code was invalid.'));
        } finally {
            setTwoFactorBusy(false);
        }
    };

    const turnOffTwoFactor = () => {
        void guard(async () => {
            setTwoFactorBusy(true);

            try {
                await disableTwoFactor();
                setSetup(null);
                toast.success('Two-factor authentication disabled');
                router.reload({ only: ['twoFactorEnabled'] });
            } catch (error) {
                toast.error(errorMessage(error, 'Could not disable two-factor authentication.'));
            } finally {
                setTwoFactorBusy(false);
            }
        });
    };

    const regenerate = () => {
        void guard(async () => {
            setTwoFactorBusy(true);

            try {
                const codes = await regenerateRecoveryCodes();
                setRecoveryCodes(codes);
                toast.success('Recovery codes regenerated');
            } catch (error) {
                toast.error(errorMessage(error, 'Could not regenerate recovery codes.'));
            } finally {
                setTwoFactorBusy(false);
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Security settings" />

            <SettingsLayout>
                <div className="w-full max-w-3xl space-y-6 py-6">
                    {/* Passkeys */}
                    <Card>
                        <CardContent className="py-6">
                            <ManagePasskeys passkeys={passkeys} canManagePasskeys={canManagePasskeys} />
                        </CardContent>
                    </Card>

                    {/* Two-factor authentication */}
                    <Card>
                        <CardHeader>
                            <CardHeading>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="size-4 text-blue-600" />
                                    Two-factor authentication
                                    {twoFactorEnabled && (
                                        <Badge variant="success" appearance="light" size="sm">
                                            Enabled
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription>
                                    Add an extra layer of security by requiring a code from your authenticator app at login.
                                </CardDescription>
                            </CardHeading>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {twoFactorEnabled ? (
                                <>
                                    {recoveryCodes && (
                                        <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
                                            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Recovery codes</p>
                                            <div className="grid grid-cols-2 gap-1 font-mono text-sm">
                                                {recoveryCodes.map((code) => (
                                                    <span key={code}>{code}</span>
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Store these in a safe place. Each code can be used once if you lose access to your device.
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-3">
                                        <Button variant="outline" onClick={regenerate} disabled={twoFactorBusy}>
                                            Regenerate recovery codes
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700"
                                            onClick={turnOffTwoFactor}
                                            disabled={twoFactorBusy}
                                        >
                                            Disable
                                        </Button>
                                    </div>
                                </>
                            ) : setup ? (
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                        <div
                                            className="size-40 shrink-0 rounded-lg border bg-white p-2 [&_svg]:size-full"
                                            dangerouslySetInnerHTML={{ __html: setup.qr }}
                                        />
                                        <div className="space-y-2 text-sm">
                                            <p>Scan the QR code with your authenticator app, then enter the generated code below.</p>
                                            <p className="text-muted-foreground">
                                                Or enter this key manually: <span className="font-mono">{setup.secret}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
                                        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Recovery codes</p>
                                        <div className="grid grid-cols-2 gap-1 font-mono text-sm">
                                            {setup.recoveryCodes.map((code) => (
                                                <span key={code}>{code}</span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Save these now — they let you sign in if you lose your authenticator device.
                                        </p>
                                    </div>

                                    <form onSubmit={submitTwoFactorConfirm} className="space-y-3">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="two_factor_code">Authentication code</Label>
                                            <Input
                                                id="two_factor_code"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                placeholder="123456"
                                                value={confirmCode}
                                                onChange={(event) => setConfirmCode(event.target.value)}
                                                className="max-w-xs"
                                            />
                                            <InputError message={confirmCodeError ?? undefined} />
                                        </div>
                                        <div className="flex gap-3">
                                            <Button type="submit" disabled={twoFactorBusy}>
                                                {twoFactorBusy && <LoaderCircle className="size-4 animate-spin" />}
                                                Confirm
                                            </Button>
                                            <Button type="button" variant="ghost" onClick={() => setSetup(null)} disabled={twoFactorBusy}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            ) : (
                                <Button onClick={beginEnableTwoFactor} disabled={twoFactorBusy}>
                                    {twoFactorBusy && <LoaderCircle className="size-4 animate-spin" />}
                                    Enable two-factor authentication
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>

            {/* Password confirmation dialog (two-factor management) */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <form onSubmit={submitConfirm}>
                        <DialogHeader>
                            <DialogTitle>Confirm your password</DialogTitle>
                            <DialogDescription>For your security, please confirm your password to continue.</DialogDescription>
                        </DialogHeader>
                        <DialogBody>
                            <div className="grid gap-1.5">
                                <Label htmlFor="confirm_password">Password</Label>
                                <Input
                                    id="confirm_password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={confirmValue}
                                    onChange={(event) => setConfirmValue(event.target.value)}
                                    autoFocus
                                />
                                <InputError message={confirmError ?? undefined} />
                            </div>
                        </DialogBody>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)} disabled={confirmProcessing}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={confirmProcessing}>
                                {confirmProcessing && <LoaderCircle className="size-4 animate-spin" />}
                                Confirm
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
