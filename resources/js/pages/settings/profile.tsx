import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { send } from '@/routes/verification';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Form, Head, Link, usePage, router } from '@inertiajs/react';
import { type ChangeEvent, useRef, useState } from 'react';

import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import { CalendarDays, Camera, Mail, Phone, ShieldCheck, User } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: edit().url,
    },
];

function getInitials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;
    const [availability, setAvailability] = useState(auth.user.availability ?? false);
    const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
    const [availabilitySaved, setAvailabilitySaved] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const avatarSrc = avatarPreview ?? (auth.user.avatar ? `/storage/${auth.user.avatar}` : null);

    const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleAvailabilityChange = (checked: boolean) => {
        setAvailability(checked);
        setIsUpdatingAvailability(true);

        router.patch(
            ProfileController.update.url(),
            { availability: checked },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAvailabilitySaved(true);
                    setTimeout(() => setAvailabilitySaved(false), 2000);
                },
                onFinish: () => setIsUpdatingAvailability(false),
            }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                <div className="w-full max-w-2xl space-y-5 py-6">

                    {/* ── Single Card ── */}
                    <Card>
                        <CardContent className="p-8 space-y-8">

                            {/* Avatar + identity row */}
                            <div className="flex items-center gap-5">
                                {/* Uploadable avatar */}
                                <div className="relative shrink-0 group">
                                    <Avatar className="size-24">
                                        {avatarSrc
                                            ? <AvatarImage src={avatarSrc} alt={auth.user.name} />
                                            : null
                                        }
                                        <AvatarFallback className="size-24 rounded-full bg-linear-to-br from-blue-600 to-violet-600 text-2xl font-bold text-white">
                                            {getInitials(auth.user.name)}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* Presence dot */}
                                    <span className={`absolute bottom-0.5 right-0.5 size-3.5 rounded-full border-2 border-card ${availability ? 'bg-green-500' : 'bg-zinc-400'}`} />

                                    {/* Camera overlay */}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        <Camera className="size-5 text-white" />
                                    </button>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        id="avatar"
                                        name="avatar"
                                        accept="image/jpeg,image/png,image/jpg,image/webp"
                                        className="hidden"
                                        onChange={handleAvatarChange}
                                    />
                                </div>

                                {/* Name + meta */}
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-base font-semibold truncate">{auth.user.name}</span>
                                        {auth.user.role && (
                                            <Badge variant="primary" appearance="light" size="sm">{auth.user.role}</Badge>
                                        )}
                                        {auth.user.email_verified_at && (
                                            <Badge variant="success" appearance="outline" size="sm">
                                                <ShieldCheck className="size-3" />
                                                Verified
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Mail className="size-3 shrink-0" />
                                            <span className="truncate">{auth.user.email}</span>
                                        </span>
                                        {auth.user.extension && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="size-3 shrink-0" />
                                                Ext. {auth.user.extension}
                                            </span>
                                        )}
                                        {auth.user.created_at && (
                                            <span className="flex items-center gap-1">
                                                <CalendarDays className="size-3 shrink-0" />
                                                Since {formatDate(auth.user.created_at as string)}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs text-muted-foreground/70">
                                        Click on the photo to upload a new one · JPG, PNG, WEBP · max 2MB
                                    </p>
                                </div>
                            </div>

                            <div className="border-t" />

                            {/* Profile form */}
                            <Form
                                {...ProfileController.update.form()}
                                options={{ preserveScroll: true }}
                                encType="multipart/form-data"
                                className="space-y-4"
                            >
                                {({ processing, recentlySuccessful, errors }) => (
                                    <>
                                        {/* Hidden file input bound to form */}
                                        <input type="file" name="avatar" className="hidden" ref={fileInputRef} onChange={handleAvatarChange} />

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="name">Full name</Label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        id="name"
                                                        name="name"
                                                        className="pl-9"
                                                        defaultValue={auth.user.name}
                                                        required
                                                        autoComplete="name"
                                                        placeholder="Full name"
                                                    />
                                                </div>
                                                <InputError message={errors.name} />
                                            </div>

                                            <div className="grid gap-1.5">
                                                <Label htmlFor="email">Email address</Label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        id="email"
                                                        name="email"
                                                        type="email"
                                                        className="pl-9"
                                                        defaultValue={auth.user.email}
                                                        required
                                                        autoComplete="username"
                                                        placeholder="Email address"
                                                    />
                                                </div>
                                                <InputError message={errors.email} />
                                            </div>
                                        </div>

                                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                                            <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                                Your email is unverified.{' '}
                                                <Link href={send()} as="button" className="font-medium underline underline-offset-4">
                                                    Resend verification email.
                                                </Link>
                                            </p>
                                        )}

                                        {status === 'verification-link-sent' && (
                                            <p className="text-sm text-green-600">Verification link sent.</p>
                                        )}

                                        <div className="flex items-center gap-3">
                                            <Button disabled={processing}>Save changes</Button>
                                            <Transition
                                                show={recentlySuccessful}
                                                enter="transition ease-in-out"
                                                enterFrom="opacity-0"
                                                leave="transition ease-in-out"
                                                leaveTo="opacity-0"
                                            >
                                                <p className="text-sm text-green-600">Saved</p>
                                            </Transition>
                                        </div>
                                    </>
                                )}
                            </Form>

                            <div className="border-t" />

                            {/* Availability */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-semibold">Availability</p>
                                    <p className="text-xs text-muted-foreground">
                                        {availability
                                            ? 'You are available to receive calls and lead assignments'
                                            : 'You are unavailable for calls and lead assignments'}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2.5">
                                    <Transition
                                        show={availabilitySaved}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-xs text-green-600">Saved</p>
                                    </Transition>
                                    <Badge variant={availability ? 'success' : 'secondary'} appearance="light" size="sm">
                                        <BadgeDot />
                                        {availability ? 'Available' : 'Unavailable'}
                                    </Badge>
                                    <Switch
                                        id="availability"
                                        checked={availability}
                                        onCheckedChange={handleAvailabilityChange}
                                        disabled={isUpdatingAvailability}
                                    />
                                </div>
                            </div>

                        </CardContent>
                    </Card>

                    <DeleteUser />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
