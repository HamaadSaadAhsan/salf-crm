import { cn } from '@/lib/utils';
import { useIsTablet } from '@/hooks/use-mobile';
import { Header } from './header';
import { useLayout } from './layout-context';
import { Sidebar } from './sidebar';
import { ContentHeader } from './content-header';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

interface LayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export function Layout({ children, breadcrumbs = [] }: LayoutProps) {
  const { sidebarCollapse } = useLayout();
  const isTablet = useIsTablet();
  const { impersonation } = usePage<SharedData>().props;
  const bannerHeight = impersonation?.isImpersonating ? '40px' : '0px';

  const rootProps = {
    className: cn(
      'flex grow h-screen flex-col',
      '[--header-height:40px]',
      '[--content-header-height:54px]',
      '[--sidebar-width:250px] [--sidebar-width-collapsed:52px] [--sidebar-header-height:54px] [--sidebar-footer-height:45px] [--sidebar-footer-collapsed-height:90px]',
    ),
    style: { '--banner-height': bannerHeight } as React.CSSProperties,
    ...(sidebarCollapse === true && { 'data-sidebar-collapsed': true }),
  };

  return (
    <div {...rootProps}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {!isTablet && <Sidebar />}
        <main className="flex-1 flex flex-col mt-[calc(var(--header-height)+var(--banner-height))] lg:mt-[calc(var(--header-height)+var(--content-header-height)+var(--banner-height))] lg:ms-(--sidebar-width) lg:in-data-[sidebar-collapsed]:ms-(--sidebar-width-collapsed) transition-[margin] duration-200 ease-in-out overflow-y-auto">
          {breadcrumbs.length > 0 && <ContentHeader breadcrumbs={breadcrumbs} />}
          {children}
        </main>
      </div>
    </div>
  );
}
