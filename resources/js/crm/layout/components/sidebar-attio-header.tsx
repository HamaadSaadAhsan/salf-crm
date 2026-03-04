import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Settings, Sun, User, UserRoundPlus } from 'lucide-react';
import { useLayout } from './layout-context';
import { logout } from '@/routes';

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

export function SidebarAttioHeader() {
  const { sidebarCollapse, setSidebarCollapse, sidebarPeeking, setSidebarPeeking } = useLayout();
  const {
    props: {
      auth: { user },
    },
  } = usePage<SharedData>();
  const { appearance, updateAppearance } = useAppearance();

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
    <div className="group/header flex shrink-0 items-center min-h-[49px] max-h-[49px] shadow-[var(--border)_0px_-1px_0px_0px_inset]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex flex-1 items-center gap-1.5 px-3 py-2.5 h-full min-w-0 cursor-pointer hover:bg-accent transition-colors duration-[140ms]">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-sm text-white">
              {user.name[0]}
            </span>
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name}
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

          <DropdownMenuSeparator className={darkSeparatorClass} />

          {/* Invite */}
          <DropdownMenuItem className={darkItemClass}>
            <UserRoundPlus />
            <span>Invite team members</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className={darkSeparatorClass} />

          {/* Theme toggle */}
          <DropdownMenuItem
            className={darkItemClass}
            onClick={() => updateAppearance(appearance === 'dark' ? 'light' : appearance === 'light' ? 'system' : 'dark')}
          >
            {appearance === 'dark' ? <Sun /> : appearance === 'light' ? <Moon /> : <Settings />}
            <span>{appearance === 'dark' ? 'Light' : appearance === 'light' ? 'Dark' : 'System'} mode</span>
          </DropdownMenuItem>

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
        <button
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-sidebar-foreground transition-colors duration-[140ms] opacity-0 group-hover/header:opacity-100"
          onClick={handleExpandToggle}
        >
          {sidebarCollapse ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}
