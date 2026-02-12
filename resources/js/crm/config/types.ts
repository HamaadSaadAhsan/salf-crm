import { type LucideIcon } from 'lucide-react';
import { TablerIcon } from '@tabler/icons-react';

export interface NavSubItem {
  title: string;
  path: string;
  icon?: LucideIcon | TablerIcon;
  requiredPermission?: string;
  superAdminOnly?: boolean;
}

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
  requiredRole?: string;
  requiredPermission?: string;
  superAdminOnly?: boolean;
  isActive?: boolean;
  items?: NavSubItem[];
}

export type NavConfig = NavItem[];
