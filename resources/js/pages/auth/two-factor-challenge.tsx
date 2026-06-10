import TwoFactorAuthenticatedSessionController from '@/actions/Laravel/Fortify/Http/Controllers/TwoFactorAuthenticatedSessionController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthSimpleLayout from '@/layouts/auth/auth-simple-layout';
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';

export default function TwoFactorChallenge() {
    const [showRecovery, setShowRecovery] = useState(false);

    const title = showRecovery ? 'Enter a recovery code' : 'Two-factor authentication';
    const description = showRecovery
        ? 'Confirm access to your account by entering one of your emergency recovery codes.'
        : 'Confirm access to your account by entering the authentication code from your authenticator app.';

    return (
        <AuthSimpleLayout title={title} description={description}>
            <Head title="Two-factor authentication" />

            <Form action={TwoFactorAuthenticatedSessionController.store()} resetOnError className="flex flex-col gap-6">
                {({ processing, errors }) => (
                    <>
                        {showRecovery ? (
                            <div className="grid gap-2">
                                <Label htmlFor="recovery_code">Recovery code</Label>
                                <Input
                                    id="recovery_code"
                                    name="recovery_code"
                                    type="text"
                                    autoComplete="one-time-code"
                                    placeholder="xxxxxxxx-xxxxxxxx"
                                    autoFocus
                                    required
                                />
                                <InputError message={errors.recovery_code} />
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="code">Authentication code</Label>
                                <Input
                                    id="code"
                                    name="code"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    placeholder="123456"
                                    autoFocus
                                    required
                                />
                                <InputError message={errors.code} />
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            Log in
                        </Button>

                        <button
                            type="button"
                            onClick={() => setShowRecovery((value) => !value)}
                            className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                        >
                            {showRecovery ? 'Use an authentication code' : 'Use a recovery code'}
                        </button>
                    </>
                )}
            </Form>
        </AuthSimpleLayout>
    );
}
