import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';
import { Country } from '@/hooks/useLocation';
import { LeadSource, Service, Status } from '@/types/lead';

export interface Auth {
    readonly user: User;
    readonly permissions: readonly string[];
    readonly isSuperAdmin: boolean;
    readonly openTicketsCount: number;
}

export interface Impersonation {
    isImpersonating: boolean;
    impersonator: {
        id: number;
        name: string;
    } | null;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
    icon?: React.ReactNode;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SidebarCounts {
    leads: number;
    notifications: number;
    tasks: number;
    calls: number;
    support: number;
}

export interface Team {
    id: number;
    name: string;
    avatar_url?: string | null;
    personal_team: boolean;
    user_id: number;
    owner?: User;
    members?: TeamMember[];
    invitations?: TeamInvitation[];
    created_at: string;
    updated_at: string;
}

export interface TeamMember extends User {
    pivot: {
        role: string;
        team_id: number;
        user_id: number;
    };
}

export interface TeamInvitation {
    id: number;
    team_id: number;
    email: string;
    role: string;
    created_at: string;
    updated_at: string;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    impersonation: Impersonation;
    sidebarOpen: boolean;
    sidebarCounts: SidebarCounts;
    countries: Country[];
    statuses: Array<{ id: number; name: string; order: number; color: string }>;
    services: Service[];
    sources: LeadSource[];
    currentTeam: Team | null;
    allTeams: Array<{ id: number; name: string; avatar_url?: string | null; personal_team: boolean }>;
    [key: string]: unknown;
}

export interface Role {
    id: number;
    name: string;
    guard_name: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    extension?: string;
    availability?: boolean;
    role?: string;
    created_at: string;
    updated_at: string;
    roles?: Role[];
    [key: string]: unknown; // This allows for additional properties...
}

export interface NavItem {
  id: string;
  title?: string;
  icon?: LucideIcon;
  path?: string;
  badge?: string;
  pinnable?: boolean;
  pinned?: boolean;
  soon?: boolean;
  new?: {
    tooltip: string;
    path: string;
  };
  more?: true;
  dropdown?: true;
}

export type NavConfig = NavItem[];

export interface GlobalSearchResult {
    id: string | number;
    label: string;
    meta?: string;
    url: string;
}

export interface GlobalSearchResults {
    leads: GlobalSearchResult[];
    tasks: GlobalSearchResult[];
    users: GlobalSearchResult[];
    services: GlobalSearchResult[];
    activities: GlobalSearchResult[];
}

