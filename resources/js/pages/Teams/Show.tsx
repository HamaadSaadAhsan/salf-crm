import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData, type Team, type TeamInvitation, type TeamMember } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Crown,
    Mail,
    MoreHorizontal,
    Plus,
    Settings,
    Shield,
    Trash2,
    UserMinus,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import * as teamActions from '@/actions/App/Http/Controllers/TeamController';
import * as memberActions from '@/actions/App/Http/Controllers/TeamMemberController';
import * as invitationActions from '@/actions/App/Http/Controllers/TeamInvitationController';

interface TeamShowProps {
    team: Team & {
        owner: { id: number; name: string; email: string };
        members: TeamMember[];
        invitations: TeamInvitation[];
    };
}

const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    member: 'Member',
};

function getInitials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function RoleBadge({ role }: { role: string }) {
    return (
        <Badge variant={role === 'admin' ? 'primary' : 'secondary'} className="capitalize">
            {ROLE_LABELS[role] ?? role}
        </Badge>
    );
}

// ─── Add Member Sheet ─────────────────────────────────────────────────────────
function AddMemberSheet({
    open,
    onOpenChange,
    teamId,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    teamId: number;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        role: 'member',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(memberActions.store({ team: teamId }).url, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
            <SheetContent className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Add Team Member</SheetTitle>
                    <SheetDescription>
                        Add an existing user to this team by their email address.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="member-email">Email address</Label>
                        <Input
                            id="member-email"
                            type="email"
                            placeholder="colleague@example.com"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="member-role">Role</Label>
                        <Select value={data.role} onValueChange={(v) => setData('role', v)}>
                            <SelectTrigger id="member-role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
                    </div>

                    <SheetFooter className="pt-2">
                        <Button type="submit" disabled={processing} className="w-full">
                            <UserPlus className="size-4" />
                            {processing ? 'Adding…' : 'Add Member'}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

// ─── Invite Member Sheet ──────────────────────────────────────────────────────
function InviteMemberSheet({
    open,
    onOpenChange,
    teamId,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    teamId: number;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        role: 'member',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(invitationActions.store({ team: teamId }).url, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
            <SheetContent className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Invite by Email</SheetTitle>
                    <SheetDescription>
                        Send an invitation email. The recipient will join after accepting.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="invite-email">Email address</Label>
                        <Input
                            id="invite-email"
                            type="email"
                            placeholder="new-member@example.com"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="invite-role">Role</Label>
                        <Select value={data.role} onValueChange={(v) => setData('role', v)}>
                            <SelectTrigger id="invite-role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
                    </div>

                    <SheetFooter className="pt-2">
                        <Button type="submit" disabled={processing} className="w-full">
                            <Mail className="size-4" />
                            {processing ? 'Sending…' : 'Send Invitation'}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeamShow({ team }: TeamShowProps) {
    const { auth } = usePage<SharedData>().props;
    const isOwner = team.user_id === auth.user.id;

    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);

    const { data: renameData, setData: setRenameData, put: putRename, processing: renaming, reset: resetRename } = useForm({ name: team.name });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Teams', href: '#' },
        { title: team.name, href: `/teams/${team.id}` },
    ];

    const handleRename = (e: React.FormEvent) => {
        e.preventDefault();
        putRename(teamActions.update({ team: team.id }).url, {
            preserveScroll: true,
            onSuccess: () => setRenameDialogOpen(false),
        });
    };

    const handleDeleteTeam = () => {
        router.delete(teamActions.destroy({ team: team.id }).url, {
            onSuccess: () => setDeleteDialogOpen(false),
        });
    };

    const handleRemoveMember = (userId: number) => {
        router.delete(memberActions.destroy({ team: team.id, user: userId }).url, { preserveScroll: true });
    };

    const handleUpdateRole = (userId: number, role: string) => {
        router.put(
            memberActions.update({ team: team.id, user: userId }).url,
            { role },
            { preserveScroll: true },
        );
    };

    const handleCancelInvitation = (invitationId: number) => {
        router.delete(invitationActions.destroy({ invitation: invitationId }).url, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${team.name} — Team`} />

            {/* Page header */}
            <div className="flex items-center gap-4 border-b px-6 py-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Users className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-semibold leading-none">{team.name}</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {team.personal_team ? 'Personal team' : `${(team.members?.length ?? 0) + 1} members`}
                        </p>
                    </div>
                </div>

                {isOwner && (
                    <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setRenameDialogOpen(true)}>
                            <Settings className="size-4" />
                            Settings
                        </Button>
                        {!team.personal_team && (
                            <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                                <Trash2 className="size-4" />
                                Delete
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="members" className="flex flex-1 flex-col">
                <div className="border-b px-6">
                    <TabsList className="h-auto rounded-none bg-transparent p-0">
                        <TabsTrigger
                            value="members"
                            className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-primary data-[state=active]:shadow-none"
                        >
                            <Users className="size-4" />
                            Members
                        </TabsTrigger>
                        {isOwner && (
                            <TabsTrigger
                                value="invitations"
                                className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-primary data-[state=active]:shadow-none"
                            >
                                <Mail className="size-4" />
                                Invitations
                                {(team.invitations?.length ?? 0) > 0 && (
                                    <Badge variant="secondary" className="ml-1.5 size-5 justify-center rounded-full p-0 text-xs">
                                        {team.invitations?.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                {/* Members tab */}
                <TabsContent value="members" className="mt-0 flex-1">
                    <div className="flex items-center justify-between px-6 py-4">
                        <p className="text-sm text-muted-foreground">
                            {(team.members?.length ?? 0) + 1} member{(team.members?.length ?? 0) !== 0 ? 's' : ''}
                        </p>
                        {isOwner && (
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
                                    <Mail className="size-4" />
                                    Invite
                                </Button>
                                <Button size="sm" onClick={() => setAddMemberOpen(true)}>
                                    <Plus className="size-4" />
                                    Add Member
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="divide-y">
                        {/* Owner row */}
                        <MemberRow
                            name={team.owner.name}
                            email={team.owner.email}
                            role="admin"
                            isOwner
                            canManage={false}
                            onRoleChange={() => {}}
                            onRemove={() => {}}
                        />

                        {/* Member rows */}
                        {team.members?.map((member) => (
                            <MemberRow
                                key={member.id}
                                name={member.name}
                                email={member.email}
                                role={member.pivot?.role ?? 'member'}
                                isOwner={false}
                                canManage={isOwner}
                                onRoleChange={(role) => handleUpdateRole(member.id, role)}
                                onRemove={() => handleRemoveMember(member.id)}
                            />
                        ))}
                    </div>
                </TabsContent>

                {/* Invitations tab */}
                {isOwner && (
                    <TabsContent value="invitations" className="mt-0 flex-1">
                        <div className="flex items-center justify-between px-6 py-4">
                            <p className="text-sm text-muted-foreground">
                                {team.invitations?.length ?? 0} pending invitation{(team.invitations?.length ?? 0) !== 1 ? 's' : ''}
                            </p>
                            <Button size="sm" onClick={() => setInviteOpen(true)}>
                                <Mail className="size-4" />
                                Invite
                            </Button>
                        </div>

                        {(team.invitations?.length ?? 0) === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-16 text-center">
                                <Mail className="size-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">No pending invitations</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {team.invitations?.map((invitation) => (
                                    <InvitationRow
                                        key={invitation.id}
                                        invitation={invitation}
                                        onCancel={() => handleCancelInvitation(invitation.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                )}
            </Tabs>

            {/* Sheets */}
            <AddMemberSheet open={addMemberOpen} onOpenChange={setAddMemberOpen} teamId={team.id} />
            <InviteMemberSheet open={inviteOpen} onOpenChange={setInviteOpen} teamId={team.id} />

            {/* Rename dialog */}
            <Dialog open={renameDialogOpen} onOpenChange={(v) => { setRenameDialogOpen(v); if (!v) resetRename(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Team</DialogTitle>
                        <DialogDescription>Update the display name for this team.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRename} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="team-name">Team name</Label>
                            <Input
                                id="team-name"
                                value={renameData.name}
                                onChange={(e) => setRenameData('name', e.target.value)}
                                placeholder="e.g. Sales Team"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRenameDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={renaming}>
                                {renaming ? 'Saving…' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Team</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{team.name}</strong>? This action cannot be undone
                            and all members will lose access.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteTeam}>
                            Delete Team
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MemberRow({
    name,
    email,
    role,
    isOwner,
    canManage,
    onRoleChange,
    onRemove,
}: {
    name: string;
    email: string;
    role: string;
    isOwner: boolean;
    canManage: boolean;
    onRoleChange: (role: string) => void;
    onRemove: () => void;
}) {
    return (
        <div className="flex items-center gap-4 px-6 py-3">
            <Avatar className="size-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {getInitials(name)}
                </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{name}</span>
                    {isOwner && <Crown className="size-3.5 text-amber-500" />}
                </div>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
            </div>

            <RoleBadge role={role} />

            {canManage && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onRoleChange(role === 'admin' ? 'member' : 'admin')}>
                            <Shield className="size-4" />
                            {role === 'admin' ? 'Change to Member' : 'Change to Admin'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={onRemove}
                        >
                            <UserMinus className="size-4" />
                            Remove from team
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}

function InvitationRow({
    invitation,
    onCancel,
}: {
    invitation: TeamInvitation;
    onCancel: () => void;
}) {
    return (
        <div className="flex items-center gap-4 px-6 py-3">
            <div className="flex size-9 items-center justify-center rounded-full border border-dashed border-border bg-muted/40">
                <Mail className="size-4 text-muted-foreground" />
            </div>

            <div className="min-w-0 flex-1">
                <span className="truncate text-sm font-medium">{invitation.email}</span>
                <p className="text-xs text-muted-foreground">
                    Invited · pending acceptance
                </p>
            </div>

            <RoleBadge role={invitation.role} />

            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onCancel}>
                <Trash2 className="size-4" />
                Cancel
            </Button>
        </div>
    );
}
