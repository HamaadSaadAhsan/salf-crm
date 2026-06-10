import { store as storePost } from '@/actions/Laravel/Fortify/Http/Controllers/AuthenticatedSessionController';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthSimpleLayout from '@/layouts/auth/auth-simple-layout';
import { browserSupportsPasskeys, loginWithPasskey, PasskeyError, UserCancelledError } from '@/lib/passkey';
import { request } from '@/routes/password';
import { Form, Head } from '@inertiajs/react';
import { Fingerprint, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const [passkeySupported, setPasskeySupported] = useState(false);
    const [passkeyProcessing, setPasskeyProcessing] = useState(false);
    const [passkeyError, setPasskeyError] = useState<string | null>(null);

    useEffect(() => {
        setPasskeySupported(browserSupportsPasskeys());
    }, []);

    const handlePasskeyLogin = async () => {
        setPasskeyError(null);
        setPasskeyProcessing(true);

        try {
            const redirect = await loginWithPasskey();
            window.location.href = redirect;
        } catch (error) {
            if (error instanceof UserCancelledError) {
                // User dismissed the native prompt; stay silent.
                return;
            }

            setPasskeyError(
                error instanceof PasskeyError ? error.message : 'We could not sign you in with a passkey. Please try again or use your password.',
            );
        } finally {
            setPasskeyProcessing(false);
        }
    };

    return (
        <AuthSimpleLayout title="Log in to your account" description="Enter your email and password below to log in">
            <Head title="Log in" />

            {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{status}</div>}

            <Form action={storePost()} resetOnSuccess={['password']} className="flex flex-col gap-6">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    {canResetPassword && (
                                        <TextLink href={request()} className="ml-auto text-sm" tabIndex={5}>
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Password"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox id="remember" name="remember" tabIndex={3} />
                                <Label htmlFor="remember">Remember me</Label>
                            </div>

                            <Button type="submit" className="mt-4 w-full" tabIndex={4} disabled={processing}>
                                {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                Log in
                            </Button>
                        </div>
                    </>
                )}
            </Form>

            {passkeySupported && (
                <div className="flex flex-col gap-4">
                    <div className="relative flex items-center">
                        <span className="h-px flex-1 bg-border" />
                        <span className="px-3 text-xs tracking-wider text-muted-foreground uppercase">Or</span>
                        <span className="h-px flex-1 bg-border" />
                    </div>

                    <Button type="button" variant="outline" className="w-full" onClick={handlePasskeyLogin} disabled={passkeyProcessing}>
                        {passkeyProcessing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                        Sign in with a passkey
                    </Button>

                    <InputError message={passkeyError ?? undefined} className="text-center" />
                </div>
            )}
        </AuthSimpleLayout>
    );
}
