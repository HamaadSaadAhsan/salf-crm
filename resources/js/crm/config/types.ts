import { type LucideIcon } from 'lucide-react';
import { TablerIcon } from '@tabler/icons-react';

export interface NavSubItem {
  title: string;
  path: string;
  icon?: LucideIcon | TablerIcon;
  requiredPermission?: string;
  superAdminOnly?: boolean;
  /**
   * When true, render as a plain <a> (full page navigation) instead of
   * Inertia's <Link>. Use for paths that redirect cross-origin — Inertia's
   * XHR-based nav can't follow those past CORS.
   */
  external?: boolean;
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
  /** See NavSubItem.external. */
  external?: boolean;
}

export type NavConfig = NavItem[];
