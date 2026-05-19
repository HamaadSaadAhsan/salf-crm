import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import * as invitationActions from '@/actions/App/Http/Controllers/TeamInvitationController';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AuthSimpleLayout from '@/layouts/auth/auth-simple-layout';

interface Props {
    invitation: {
        token: string;
        email: string;
        team_name: string;
        team_avatar_url: string | null;
    };
}

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function AcceptInvitation({ invitation }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(invitationActions.register({ token: invitation.token }).url);
    };

    return (
        <AuthSimpleLayout>
            <Head title="Accept Invitation" />

            <div className="flex flex-col items-center gap-2 mb-6 text-center">
                <Avatar className="size-14 rounded-xl">
                    {invitation.team_avatar_url && (
                        <AvatarImage src={invitation.team_avatar_url} alt={invitation.team_name} className="rounded-xl object-cover" />
                    )}
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg font-semibold">
                        {getInitials(invitation.team_name)}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-xl font-semibold">Join {invitation.team_name}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Create your account to accept the invitation
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                        id="email"
                        type="email"
                        value={invitation.email}
                        disabled
                        className="bg-muted text-muted-foreground"
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                        id="name"
                        type="text"
                        autoFocus
                        autoComplete="name"
                        placeholder="Your full name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Choose a password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    <InputError message={errors.password} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password_confirmation">Confirm password</Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Confirm your password"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                    <InputError message={errors.password_confirmation} />
                </div>

                <Button type="submit" disabled={processing} className="w-full mt-1">
                    {processing && <LoaderCircle className="size-4 animate-spin" />}
                    Create account & join team
                </Button>
            </form>
        </AuthSimpleLayout>
    );
}
