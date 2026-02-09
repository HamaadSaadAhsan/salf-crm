import { type LucideIcon } from 'lucide-react';
import { TablerIcon } from '@tabler/icons-react';

export interface NavItem {
    id: string;
    title?: string;
    icon?: LucideIcon | TablerIcon;
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
    isActive?: boolean;
    requiredRole?: string;
    requiredPermission?: string;
    superAdminOnly?: boolean;
    items?: {
        title: string;
        path: string;
        icon?: LucideIcon | TablerIcon;
        isActive?: boolean;
        requiredRole?: string;
        requiredPermission?: string;
        superAdminOnly?: boolean;
    }[];
}

export type NavConfig = NavItem[];
