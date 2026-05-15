import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { BreadcrumbItemIcon } from '@/components/breadcrumb-icon';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Link } from '@inertiajs/react';
import { BarChart3, BellIcon, ListChecks, LifeBuoy, PhoneCall, Settings2, Shield, Users, Workflow } from 'lucide-react';
import { Fragment, isValidElement } from 'react';
import { IconCurrencyDollar, IconSmartHome } from '@tabler/icons-react';

const BREADCRUMB_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; bg: string }> = {
    'Dashboard': { icon: IconSmartHome, bg: 'bg-blue-600' },
    'Leads': { icon: IconCurrencyDollar, bg: 'bg-[rgb(201,89,8)]' },
    'Notifications': { icon: BellIcon, bg: 'bg-yellow-600' },
    'Tasks': { icon: ListChecks, bg: 'bg-green-600' },
    'Reports': { icon: BarChart3, bg: 'bg-purple-600' },
    'Workflows': { icon: Workflow, bg: 'bg-indigo-600' },
    'Management': { icon: Shield, bg: 'bg-red-600' },
    'Calls': { icon: PhoneCall, bg: 'bg-emerald-600' },
    'Settings': { icon: Settings2, bg: 'bg-zinc-600' },
    'Profile settings': { icon: Settings2, bg: 'bg-zinc-600' },
    'Appearance settings': { icon: Settings2, bg: 'bg-zinc-600' },
    'Password settings': { icon: Settings2, bg: 'bg-zinc-600' },
    'Support': { icon: LifeBuoy, bg: 'bg-teal-600' },
    'Admin Tickets': { icon: Shield, bg: 'bg-red-600' },
    'Users': { icon: Users, bg: 'bg-red-600' },
};

function BreadcrumbIcon({ item }: { item: BreadcrumbItemType }) {
    if (item.icon) {
        if (isValidElement(item.icon)) return <>{item.icon}</>;
        if (typeof item.icon === 'function') {
            const Icon = item.icon as React.ComponentType<{ className?: string }>;
            return <Icon className="size-4" />;
        }
    }
    const mapped = BREADCRUMB_ICONS[item.title];
    if (mapped) return <BreadcrumbItemIcon icon={mapped.icon} className={mapped.bg} />;
    return null;
}

export function Breadcrumbs({ breadcrumbs }: { breadcrumbs: BreadcrumbItemType[] }) {
    return (
        <>
            {breadcrumbs.length > 0 && (
                <Breadcrumb className="min-w-0 overflow-hidden">
                    <BreadcrumbList className="flex-nowrap overflow-hidden">
                        {breadcrumbs.map((item, index) => {
                            const isLast = index === breadcrumbs.length - 1;
                            return (
                                <Fragment key={index}>
                                    <BreadcrumbItem className={isLast ? 'min-w-0 overflow-hidden' : 'shrink-0'}>
                                        {isLast ? (
                                            <BreadcrumbPage className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                                                <BreadcrumbIcon item={item} />
                                                <span className="truncate">{item.title}</span>
                                            </BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink asChild>
                                                <Link href={item.href}>
                                                    <BreadcrumbIcon item={item} />
                                                    {item.title}
                                                </Link>
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                    {!isLast && <BreadcrumbSeparator className="shrink-0" />}
                                </Fragment>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            )}
        </>
    );
}