import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import { logout } from '@/routes';
import { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Check, ChevronDown, LogOut, Moon, Plus, Settings, Sun, User, UserRoundPlus } from 'lucide-react';

import * as currentTeamActions from '@/actions/App/Http/Controllers/CurrentTeamController';
import { SidebarCollapseButton } from './sidebar-default-header';
import { useLayout } from './layout-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Attio-style dark dropdown classes
const darkContentClass = [
    'w-[280px] min-w-max rounded-xl border-0 p-1 gap-px',
    'bg-popover',
    'shadow-[var(--color-border)_0px_0px_0px_1px_inset,rgba(0,0,0,0.16)_0px_0px_0px_1px,rgba(0,0,0,0.48)_0px_4px_8px_-4px,rgba(0,0,0,0.64)_0px_4px_12px_-2px]',
    'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:slide-in-from-top-0.5',
    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.97]',
].join(' ');

const darkItemClass = [
    'rounded-lg px-2.5 py-2 text-[13px] gap-2.5 cursor-pointer',
    'text-popover-foreground',
    'focus:bg-accent focus:text-popover-foreground',
    '[&_svg]:text-muted-foreground [&_svg]:size-3.5',
].join(' ');

const darkSeparatorClass = 'bg-border -mx-1 my-0.5';

function getInitials(name: string): string {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function TeamAvatar({ name, avatarUrl, className = 'size-6 rounded-md' }: { name: string; avatarUrl?: string | null; className?: string }) {
    return (
        <Avatar className={className}>
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} className="object-cover" />}
            <AvatarFallback className="bg-emerald-500 text-white text-xs font-semibold rounded-[inherit]">
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}

export function SidebarAttioHeader() {
    const { sidebarCollapse, setSidebarCollapse, sidebarPeeking, setSidebarPeeking } = useLayout();
    const {
        props: {
            auth: { user, isSuperAdmin },
            currentTeam,
            allTeams,
        },
    } = usePage<SharedData>();
    const { appearance, updateAppearance } = useAppearance();

    const handleSwitchTeam = (teamId: number) => {
        router.put(currentTeamActions.update().url, { team_id: teamId }, { preserveScroll: false });
    };

    const handleExpandToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (sidebarCollapse) {
            setSidebarPeeking(false);
            setSidebarCollapse(false);
        } else {
            setSidebarCollapse(true);
        }
    };

    return (
        <div className="group/header flex max-h-[49px] min-h-[49px] shrink-0 items-center shadow-[var(--border)_0px_-1px_0px_0px_inset]">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-3 py-2.5 transition-colors duration-[140ms] hover:bg-accent">
                        <TeamAvatar name={currentTeam?.name ?? user.name} avatarUrl={currentTeam?.avatar_url} />
                        <span className="truncate text-sm font-medium text-sidebar-foreground">
                            {currentTeam?.name ?? user.name}
                        </span>
                        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className={darkContentClass}
                    side="bottom"
                    align="start"
                    sideOffset={7}
                    alignOffset={7}
                    style={{ zIndex: 2147483646 }}
                >
                    {/* Workspace / user row */}
                    <DropdownMenuGroup>
                        <DropdownMenuItem asChild className={`${darkItemClass} py-2.5`}>
                            <Link href="/settings/profile" className="flex items-center gap-2.5">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-xs text-white [&]:text-white">
                                    {user.name[0]}
                                </span>
                                <span className="truncate font-medium">{user.name}</span>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator className={darkSeparatorClass} />

                    {/* Settings */}
                    <DropdownMenuGroup>
                        <DropdownMenuItem asChild className={darkItemClass}>
                            <Link href="/settings/profile">
                                <User />
                                <span>Account settings</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className={darkItemClass}>
                            <Link href="/settings/appearance">
                                <Settings />
                                <span>Workspace settings</span>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>

                    {isSuperAdmin && (
                        <>
                            <DropdownMenuSeparator className={darkSeparatorClass} />
                            <DropdownMenuItem
                                className={darkItemClass}
                                onClick={() => currentTeam && router.visit(`/teams/${currentTeam.id}`)}
                            >
                                <UserRoundPlus />
                                <span>Invite team members</span>
                            </DropdownMenuItem>
                        </>
                    )}

                    <DropdownMenuSeparator className={darkSeparatorClass} />

                    {/* Theme toggle */}
                    <DropdownMenuItem
                        className={darkItemClass}
                        onClick={() => updateAppearance(appearance === 'dark' ? 'light' : appearance === 'light' ? 'system' : 'dark')}
                    >
                        {appearance === 'dark' ? <Sun /> : appearance === 'light' ? <Moon /> : <Settings />}
                        <span>{appearance === 'dark' ? 'Light' : appearance === 'light' ? 'Dark' : 'System'} mode</span>
                    </DropdownMenuItem>

                    {/* Teams */}
                    {allTeams.length > 0 && (
                        <>
                            <DropdownMenuSeparator className={darkSeparatorClass} />
                            <DropdownMenuLabel className="px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                {isSuperAdmin ? 'Switch team' : 'My team'}
                            </DropdownMenuLabel>
                            {allTeams.map((team) => (
                                <DropdownMenuItem
                                    key={team.id}
                                    onClick={() => handleSwitchTeam(team.id)}
                                    className={darkItemClass}
                                >
                                    <TeamAvatar name={team.name} avatarUrl={team.avatar_url} />
                                    <span className="flex-1 truncate">{team.name}</span>
                                    {currentTeam?.id === team.id && (
                                        <Check className="ml-auto size-3.5 text-primary" />
                                    )}
                                </DropdownMenuItem>
                            ))}
                            {isSuperAdmin && (
                                <DropdownMenuItem
                                    onClick={() => router.visit('/teams/create')}
                                    className={darkItemClass}
                                >
                                    <Plus />
                                    <span>Create team</span>
                                </DropdownMenuItem>
                            )}
                            {isSuperAdmin && currentTeam && (
                                <DropdownMenuItem
                                    onClick={() => router.visit(`/teams/${currentTeam.id}`)}
                                    className={darkItemClass}
                                >
                                    <Settings />
                                    <span>Manage team</span>
                                </DropdownMenuItem>
                            )}
                        </>
                    )}

                    <DropdownMenuSeparator className={darkSeparatorClass} />

                    {/* Sign out */}
                    <DropdownMenuItem asChild className={`${darkItemClass} w-full`}>
                        <Link href={logout()} method="post" as="button" className="w-full">
                            <LogOut />
                            <span>Sign out</span>
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="shrink-0 pe-2">
                <SidebarCollapseButton
                    collapsed={sidebarCollapse}
                    onClick={() => setSidebarCollapse(!sidebarCollapse)}
                    className="hidden lg:group-hover/header:flex lg:in-data-[sidebar-collapsed]:hidden!"
                />
            </div>
        </div>
    );
}
