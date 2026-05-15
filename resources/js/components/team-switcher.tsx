import { Check, ChevronsUpDown, Plus, Users } from 'lucide-react';
import * as React from 'react';
import { router, usePage } from '@inertiajs/react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { type SharedData } from '@/types';
import * as currentTeamActions from '@/actions/App/Http/Controllers/CurrentTeamController';
import Logo from './logo';

export function TeamSwitcher() {
    const { isMobile } = useSidebar();
    const { currentTeam, allTeams } = usePage<SharedData>().props;
    const [switching, setSwitching] = React.useState(false);

    const handleSwitch = (teamId: number) => {
        if (switching || currentTeam?.id === teamId) return;
        setSwitching(true);
        router.put(
            currentTeamActions.update().url,
            { team_id: teamId },
            {
                preserveScroll: false,
                onFinish: () => setSwitching(false),
            },
        );
    };

    const displayName = currentTeam?.name ?? (import.meta.env.VITE_APP_NAME || 'My Team');

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            disabled={switching}
                        >
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10">
                                <Logo width={20} height={20} />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{displayName}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {currentTeam?.personal_team ? 'Personal' : 'Team'}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? 'bottom' : 'right'}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Team</DropdownMenuLabel>

                        {allTeams.map((team) => (
                            <DropdownMenuItem
                                key={team.id}
                                onClick={() => handleSwitch(team.id)}
                                className="gap-2 p-2"
                            >
                                <div className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-background">
                                    <Users className="size-3.5" />
                                </div>
                                <span className="flex-1 truncate">{team.name}</span>
                                {currentTeam?.id === team.id && (
                                    <Check className="ml-auto size-4 text-primary" />
                                )}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            className="gap-2 p-2"
                            onClick={() => router.visit('/teams/create')}
                        >
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-transparent">
                                <Plus className="size-4" />
                            </div>
                            <span className="font-medium text-muted-foreground">Create team</span>
                        </DropdownMenuItem>

                        {currentTeam && (
                            <DropdownMenuItem
                                className="gap-2 p-2"
                                onClick={() => router.visit(`/teams/${currentTeam.id}`)}
                            >
                                <div className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-transparent">
                                    <Users className="size-3.5" />
                                </div>
                                <span className="font-medium text-muted-foreground">Manage team</span>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
