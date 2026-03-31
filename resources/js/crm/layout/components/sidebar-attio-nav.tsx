import { useMemo, useState } from 'react';
import type { NavItem, NavSubItem } from '@/crm/config/types';
import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type SharedData, type SidebarCounts } from '@/types';
import { useLayout } from './layout-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BadgeCount } from '@/components/ui/badge-count';

const SIDEBAR_BADGES: Record<string, { key: keyof SidebarCounts; tooltip: string }> = {
  leads: { key: 'leads', tooltip: 'Active leads' },
  notifications: { key: 'notifications', tooltip: 'Unread notifications' },
  tasks: { key: 'tasks', tooltip: 'Pending tasks assigned to you' },
  calls: { key: 'calls', tooltip: "Today's calls" },
  support: { key: 'support', tooltip: 'Open tickets' },
};

function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(count);
}

function NavBadge({ count, tooltip }: { count: number; tooltip: string }) {
  if (count <= 0) return null;

  return (
      <Tooltip>
          <TooltipTrigger asChild>
              <BadgeCount variant="primary" count={count} />
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
              {count.toLocaleString()} {tooltip.toLowerCase()}
          </TooltipContent>
      </Tooltip>
  );
}

interface NavSection {
  label: string;
  ids: string[];
}

const SECTIONS: NavSection[] = [
  { label: 'Main', ids: ['dashboard', 'leads', 'notifications', 'tasks', 'follow-up-calendar', 'mail', 'calls'] },
  { label: 'Reports', ids: ['reports'] },
  { label: 'Management', ids: ['workflows', 'management', 'integrations'] },
  { label: 'Support', ids: ['support'] },
  { label: 'Settings', ids: ['settings'] },
];

function useFilteredNavItems() {
  const { getSidebarNavItems } = useLayout();
  const {
    props: {
      auth: { permissions, isSuperAdmin },
    },
  } = usePage<SharedData>();

  return useMemo(() => {
    const allItems = getSidebarNavItems();

    return allItems.filter((item) => {
      if (item.superAdminOnly && !isSuperAdmin) return false;
      if (item.requiredPermission && !isSuperAdmin && !permissions.includes(item.requiredPermission)) return false;
      return true;
    });
  }, [getSidebarNavItems, permissions, isSuperAdmin]);
}

function filterSubItems(
  items: NavSubItem[] | undefined,
  permissions: readonly string[],
  isSuperAdmin: boolean,
): NavSubItem[] {
  if (!items) return [];
  return items.filter((sub) => {
    if (sub.superAdminOnly && !isSuperAdmin) return false;
    if (sub.requiredPermission && !isSuperAdmin && !permissions.includes(sub.requiredPermission)) return false;
    return true;
  });
}

function NavItemRow({
  item,
  isActive,
  subItems,
  matchPath,
  badge,
}: {
  item: NavItem;
  isActive: boolean;
  subItems: NavSubItem[];
  matchPath: (path: string) => boolean;
  badge?: { count: number; tooltip: string };
}) {
  const [subOpen, setSubOpen] = useState(() => {
    if (subItems.length === 0) return false;
    return subItems.some((s) => matchPath(s.path));
  });

  const hasSubItems = subItems.length > 0;

  return (
    <div className="flex flex-col gap-px">
      <div
        className={cn(
          'group/item flex h-7 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors duration-[140ms] cursor-pointer',
          isActive && !hasSubItems
            ? 'bg-accent text-sidebar-foreground'
            : 'text-sidebar-foreground hover:bg-accent',
        )}
        onClick={() => {
          if (hasSubItems) {
            setSubOpen((prev) => !prev);
          }
        }}
      >
        {item.path && !hasSubItems ? (
          <Link href={item.path} className="flex flex-1 items-center gap-2">
            {item.icon && <item.icon className="size-3.5 shrink-0 text-muted-foreground" />}
            <span className="flex-1">{item.title}</span>
            {badge && <NavBadge count={badge.count} tooltip={badge.tooltip} />}
          </Link>
        ) : (
          <div className="flex flex-1 items-center gap-2">
            {item.icon && <item.icon className="size-3.5 shrink-0 text-muted-foreground" />}
            <span className="flex-1">{item.title}</span>
            {badge && <NavBadge count={badge.count} tooltip={badge.tooltip} />}
          </div>
        )}
        {hasSubItems && (
          <ChevronRight
            className={cn(
              'size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-[140ms]',
              subOpen && 'rotate-90',
            )}
          />
        )}
      </div>

      <AnimatePresence initial={false}>
        {hasSubItems && subOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="overflow-hidden"
          >
            <div className="ml-3.5 border-l border-border pl-1.5 flex flex-col gap-px py-0.5">
              {subItems.map((sub) => {
                const subActive = matchPath(sub.path);
                return (
                  <Link
                    key={sub.path}
                    href={sub.path}
                    className={cn(
                      'flex h-7 w-full items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors duration-[140ms]',
                      subActive
                        ? 'bg-accent text-sidebar-foreground'
                        : 'text-sidebar-foreground hover:bg-accent',
                    )}
                  >
                    {sub.icon && <sub.icon className="size-3.5 shrink-0 text-muted-foreground" />}
                    <span>{sub.title}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionGroup({
  label,
  items,
  matchPath,
  permissions,
  isSuperAdmin,
  counts,
}: {
  label: string;
  items: NavItem[];
  matchPath: (path: string) => boolean;
  permissions: readonly string[];
  isSuperAdmin: boolean;
  counts: SidebarCounts;
}) {
  const hasActiveChild = items.some((item) => {
    if (item.path && matchPath(item.path)) return true;
    return item.items?.some((sub) => matchPath(sub.path));
  });
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors duration-[140ms]"
      >
        <ChevronRight
          className={cn(
            'size-3 shrink-0 transition-transform duration-[140ms]',
            expanded && 'rotate-90',
          )}
        />
        <span>{label}</span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-px px-2">
              {items.map((item) => {
                const isActive = item.path ? matchPath(item.path) : false;
                const subItems = filterSubItems(item.items, permissions, isSuperAdmin);

                const badgeConfig = SIDEBAR_BADGES[item.id];
                const badge = badgeConfig
                  ? { count: counts[badgeConfig.key], tooltip: badgeConfig.tooltip }
                  : undefined;

                return (
                  <NavItemRow
                    key={item.id}
                    item={item}
                    isActive={isActive}
                    subItems={subItems}
                    matchPath={matchPath}
                    badge={badge}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SidebarAttioNav() {
  const { url: pathname } = usePage();
  const filteredItems = useFilteredNavItems();
  const {
    props: {
      auth: { permissions, isSuperAdmin },
      sidebarCounts,
    },
  } = usePage<SharedData>();
  const counts: SidebarCounts = sidebarCounts ?? { leads: 0, notifications: 0, tasks: 0, calls: 0, support: 0 };

  const matchPath = (path: string) =>
    path === pathname || (path.length > 1 && pathname.startsWith(path));

  const sections = useMemo(() => {
    return SECTIONS.map((section) => ({
      ...section,
      items: section.ids
        .map((id) => filteredItems.find((item) => item.id === id))
        .filter((item): item is NavItem => item !== undefined),
    })).filter((section) => section.items.length > 0);
  }, [filteredItems]);

  return (
    <TooltipProvider delayDuration={300}>
      <ScrollArea className="h-[calc(100vh-var(--sidebar-header-height)-var(--sidebar-footer-height))]">
        <div className="py-3 space-y-1">
          {sections.map((section) => (
            <SectionGroup
              key={section.label}
              label={section.label}
              items={section.items}
              matchPath={matchPath}
              permissions={permissions}
              isSuperAdmin={isSuperAdmin}
              counts={counts}
            />
          ))}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}
