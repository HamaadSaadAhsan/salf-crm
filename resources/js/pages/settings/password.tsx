import PasswordController from '@/actions/App/Http/Controllers/Settings/PasswordController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Form, Head } from '@inertiajs/react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useRef } from 'react';
import { edit } from '@/routes/password';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Password settings',
        href: edit().url,
    },
];

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Password settings" />

            <SettingsLayout>
                <div className="w-full max-w-3xl space-y-6 py-6">
                    {/* Security Banner */}
                    <Card>
                        <CardContent className="flex items-center gap-4 py-5">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-600/10">
                                <ShieldCheck className="size-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Keep your account secure</p>
                                <p className="text-xs text-muted-foreground">
                                    Use a long, random password with a mix of letters, numbers, and symbols. Never reuse passwords across sites.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Password Form */}
                    <Card>
                        <CardHeader>
                            <CardHeading>
                                <CardTitle>Update password</CardTitle>
                                <CardDescription>Ensure your account is using a long, random password to stay secure</CardDescription>
                            </CardHeading>
                        </CardHeader>
                        <CardContent>
                            <Form
                                {...PasswordController.update.form()}
                                options={{ preserveScroll: true }}
                                resetOnError={['password', 'password_confirmation', 'current_password']}
                                resetOnSuccess
                                onError={(errors) => {
                                    if (errors.password) {
                                        passwordInput.current?.focus();
                                    }
                                    if (errors.current_password) {
                                        currentPasswordInput.current?.focus();
                                    }
                                }}
                                className="space-y-5"
                            >
                                {({ errors, processing, recentlySuccessful }) => (
                                    <>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="current_password">Current password</Label>
                                            <div className="relative">
                                                <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="current_password"
                                                    ref={currentPasswordInput}
                                                    name="current_password"
                                                    type="password"
                                                    className="w-full pl-9"
                                                    autoComplete="current-password"
                                                    placeholder="Enter your current password"
                                                />
                                            </div>
                                            <InputError message={errors.current_password} />
                                        </div>

                                        <div className="border-t pt-4">
                                            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">New password</p>
                                            <div className="space-y-4">
                                                <div className="grid gap-1.5">
                                                    <Label htmlFor="password">New password</Label>
                                                    <Input
                                                        id="password"
                                                        ref={passwordInput}
                                                        name="password"
                                                        type="password"
                                                        className="w-full"
                                                        autoComplete="new-password"
                                                        placeholder="Enter a new password"
                                                    />
                                                    <InputError message={errors.password} />
                                                </div>

                                                <div className="grid gap-1.5">
                                                    <Label htmlFor="password_confirmation">Confirm new password</Label>
                                                    <Input
                                                        id="password_confirmation"
                                                        name="password_confirmation"
                                                        type="password"
                                                        className="w-full"
                                                        autoComplete="new-password"
                                                        placeholder="Confirm your new password"
                                                    />
                                                    <InputError message={errors.password_confirmation} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pt-1">
                                            <Button disabled={processing}>Update password</Button>
                                            <Transition
                                                show={recentlySuccessful}
                                                enter="transition ease-in-out"
                                                enterFrom="opacity-0"
                                                leave="transition ease-in-out"
                                                leaveTo="opacity-0"
                                            >
                                                <p className="text-sm text-green-600">Password updated successfully</p>
                                            </Transition>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
