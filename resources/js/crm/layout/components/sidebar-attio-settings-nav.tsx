import { useMemo, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { ArrowLeft, HardDrive, Lock, type LucideIcon, Paintbrush, PanelLeftClose, PanelLeftOpen, Search, Settings, User } from 'lucide-react';
import { type SharedData } from '@/types';
import { useLayout } from './layout-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { edit } from '@/routes/profile';
import { edit as editPassword } from '@/routes/password';
import { appearance } from '@/routes';
import { storageAccounts, management } from '@/routes/settings';
import { dashboard } from '@/routes';

interface SettingsNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

interface SettingsNavGroup {
  label: string;
  items: SettingsNavItem[];
  superAdminOnly?: boolean;
  separator?: boolean;
}

const navGroups: SettingsNavGroup[] = [
  {
    label: 'Personal',
    items: [
      { title: 'Profile', href: edit().url, icon: User },
      { title: 'Password', href: editPassword().url, icon: Lock },
      { title: 'Appearance', href: appearance().url, icon: Paintbrush },
      { title: 'Storage accounts', href: storageAccounts().url, icon: HardDrive },
    ],
  },
  {
    label: 'Workspace',
    superAdminOnly: true,
    separator: true,
    items: [
      { title: 'Management', href: management().url, icon: Settings },
    ],
  },
];

export function SidebarAttioSettingsNav() {
  const { sidebarCollapse, setSidebarCollapse, sidebarPeeking, setSidebarPeeking } = useLayout();
  const { url: currentUrl } = usePage();
  const {
    props: {
      auth: { isSuperAdmin },
    },
  } = usePage<SharedData>();

  const [search, setSearch] = useState('');

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sidebarCollapse) {
      setSidebarPeeking(false);
      setSidebarCollapse(false);
    } else {
      setSidebarCollapse(true);
    }
  };

  const visibleGroups = useMemo(() => {
    const filtered = navGroups.filter((group) => !group.superAdminOnly || isSuperAdmin);

    if (!search.trim()) return filtered;

    const query = search.toLowerCase();
    return filtered
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.title.toLowerCase().includes(query)),
      }))
      .filter((group) => group.items.length > 0);
  }, [isSuperAdmin, search]);

  const matchPath = (href: string) =>
    href === currentUrl || (href.length > 1 && currentUrl.startsWith(href));

  return (
    <>
      {/* Header */}
      <div className="group/header flex shrink-0 items-center min-h-[49px] max-h-[49px] shadow-[var(--border)_0px_-1px_0px_0px_inset]">
        <div className="flex flex-1 items-center gap-1.5 px-3 min-w-0">
          <Link
            href={dashboard().url}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-sidebar-foreground transition-colors duration-[140ms]"
          >
            <ArrowLeft className="size-3.5" />
          </Link>
          <span className="truncate text-sm font-medium text-sidebar-foreground">Settings</span>
        </div>
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

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2 h-7">
          <Search className="size-3.5 shrink-0 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search settings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
        </div>
      </div>

      {/* Nav sections */}
      <ScrollArea className="flex-1">
        <div className="py-1 space-y-3">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              {group.separator && (
                <div className="mx-3 mb-2 border-t border-border" />
              )}
              <span className="block px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </span>
              <div className="flex flex-col gap-px px-2">
                {group.items.map((item) => {
                  const isActive = matchPath(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      className={cn(
                        'flex h-7 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors duration-[140ms]',
                        isActive
                          ? 'bg-accent text-sidebar-foreground'
                          : 'text-sidebar-foreground hover:bg-accent',
                      )}
                    >
                      <item.icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </>
  );
}
