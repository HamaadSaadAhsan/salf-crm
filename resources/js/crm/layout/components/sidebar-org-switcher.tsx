import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Organization, SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Building2, BuildingIcon, Check, ChevronsUpDown } from 'lucide-react';

export function SidebarOrgSwitcher() {
    const { currentOrganization, organizations } = usePage<SharedData>().props;

    if (!organizations || organizations.length <= 1) {
        if (currentOrganization) {
            return (
                <div className="flex items-center gap-2 px-1.5 py-2">
                    <OrgAvatar organization={currentOrganization} />
                    <span className="truncate text-sm in-data-[sidebar-collapsed]:hidden">
                        {currentOrganization.name}
                    </span>
                </div>
            );
        }
        return null;
    }

    const handleSwitch = (orgId: number) => {
        if (orgId === currentOrganization?.id) return;
        router.post('/organizations/switch', { organization_id: orgId }, { preserveScroll: true });
    };

    return (
        <div className="">
            <DropdownMenu>
                <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-accent focus:outline-none">
                    <OrgAvatar organization={currentOrganization} />
                    <span className="flex-1 truncate text-xs font-medium text-foreground in-data-[sidebar-collapsed]:hidden">
                        {currentOrganization?.name ?? 'Select Organization'}
                    </span>
                    <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground in-data-[sidebar-collapsed]:hidden" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" side="bottom" align="start" sideOffset={4}>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Organizations</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {organizations.map((org) => (
                        <DropdownMenuItem
                            key={org.id}
                            className="cursor-pointer justify-between"
                            onClick={() => handleSwitch(org.id)}
                        >
                            <div className="flex items-center gap-2">
                                <OrgAvatar organization={org} />
                                <span className="truncate text-sm">{org.name}</span>
                            </div>
                            {org.id === currentOrganization?.id && <Check className="size-4 text-emerald-500" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function OrgAvatar({ organization }: { organization: Organization | null }) {
    if (organization?.logo) {
        return <img src={organization.logo} alt={organization.name} className="size-5 shrink-0 rounded" />;
    }

    return (
        <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
            <BuildingIcon className="size-4" />
        </span>
    );
}
