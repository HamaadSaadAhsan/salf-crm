import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLayout } from './layout-context';
import { Sidebar } from './sidebar';
import { ContentHeader } from './content-header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

interface LayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  hideContentHeader?: boolean;
  fullHeight?: boolean;
  collapseSidebar?: boolean;
}

export function Layout({ children, breadcrumbs = [], hideContentHeader = false, fullHeight = false, collapseSidebar = false }: LayoutProps) {
  const { isSidebarResizing, setSidebarCollapse } = useLayout();

  useEffect(() => {
    if (collapseSidebar) {
      setSidebarCollapse(true);
    }
  }, [collapseSidebar, setSidebarCollapse]);
  const { impersonation } = usePage<SharedData>().props;
  const bannerHeight = impersonation?.isImpersonating ? '40px' : '0px';

  return (
    <div
      className={cn(
        'flex h-screen',
        '[--content-header-height:49px]',
        '[--sidebar-header-height:49px] [--sidebar-footer-height:45px]',
        isSidebarResizing && 'select-none',
      )}
      style={{
        '--banner-height': bannerHeight,
      } as React.CSSProperties}
    >
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        {hideContentHeader ? (
          <div className="invisible">
            <ContentHeader breadcrumbs={breadcrumbs} />
          </div>
        ) : (
          <ContentHeader breadcrumbs={breadcrumbs} />
        )}
        {fullHeight ? (
          <div className="flex-1 overflow-hidden min-h-0">
            {children}
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            {children}
          </ScrollArea>
        )}
      </main>
    </div>
  );
}
