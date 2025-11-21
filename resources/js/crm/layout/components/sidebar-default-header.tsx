import { Button } from '@/components/ui/button';
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
import { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, LogOut, Moon, PanelRightOpen, Settings, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLayout } from './layout-context';
import { logout } from '@/routes';

export function SidebarDefaultHeader() {
    const { sidebarCollapse, setSidebarCollapse } = useLayout();
    const {
        props: {
            auth: { user },
        },
    } = usePage<SharedData>();
    const { appearance, updateAppearance } = useAppearance();

    return (
        <div className="group flex h-11 shrink-0 items-center justify-between gap-2.5 border-b border-border px-2.5 lg:h-(--sidebar-header-height)">
            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="-ms-0.5 flex items-center justify-between gap-2.5 px-1.5 hover:bg-accent">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-sm text-white">
                                {user.name[0]}
                            </span>
                            <span className="text-sm font-medium text-foreground in-data-[sidebar-collapsed]:hidden">{user.name}</span>
                            <ChevronDown className="size-4 text-muted-foreground in-data-[sidebar-collapsed]:hidden" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64" side="bottom" align="start" sideOffset={7} alignOffset={0}>
                        {/* Account Section */}
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild className="w-full cursor-pointer">
                                <Link href="/settings/profile">
                                    <User className="size-4" />
                                    <span>Profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="w-full cursor-pointer">
                                <Link href="/settings/appearance">
                                    <Settings className="size-4" />
                                    <span>Settings</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="w-full cursor-pointer">
                                <Link href={logout()}>
                                    <LogOut className="size-4" />
                                    <span>Sign Out</span>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        {/* Workspaces Section */}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => updateAppearance(appearance === 'dark' ? 'light' : appearance === 'light' ? 'system' : 'dark')}
                        >
                            {appearance === 'dark' ? (
                                <Sun className="size-4" />
                            ) : appearance === 'light' ? (
                                <Moon className="size-4" />
                            ) : (
                                <Settings className="size-4" />
                            )}
                            <span>{appearance === 'dark' ? 'Light' : appearance === 'light' ? 'Dark' : 'System'} Mode</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Button
                variant="ghost"
                mode="icon"
                className="hidden lg:group-hover:flex lg:in-data-[sidebar-collapsed]:hidden!"
                onClick={() => setSidebarCollapse(!sidebarCollapse)}
            >
                <PanelRightOpen className="size-4" />
            </Button>
        </div>
    );
}
