import { PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLayout } from './layout-context';
import { useIsTablet } from '@/hooks/use-mobile';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { type BreadcrumbItem } from '@/types';
import { AiChatSheet } from '@/components/ai-chat/ai-chat-sheet';
import { HeaderHelp } from './header-help';
import { HeaderNew } from './header-new';
import { HeaderNotifications } from './header-notifications';
import { HeaderMobileSearchTrigger, HeaderSearchTrigger } from './header-search-trigger';

interface ContentHeaderProps {
  children?: React.ReactNode;
  className?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function ContentHeader({
  children,
  className,
  breadcrumbs = [],
}: ContentHeaderProps) {
  const { sidebarCollapse, setSidebarCollapse, setSidebarPeeking } = useLayout();
  const isTablet = useIsTablet();
  const showExpandButton = sidebarCollapse || isTablet;
  return (
      <div
          className={cn(
              'sticky top-0 z-[10] flex max-h-[49px] min-h-[49px] items-center bg-background',
              'shadow-[var(--border)_0px_-1px_0px_0px_inset]',
          )}
      >
          <div className="flex flex-1 items-center justify-between gap-1.5 overflow-hidden py-[10px] px-[12px]">
              {/* Left side: collapse button + breadcrumbs */}
              <div className="flex min-w-0 items-center">
                  {showExpandButton && (
                      <Button
                          variant="ghost"
                          size="icon"
                          className="-ms-2.5 me-1"
                          onClick={() => {
                              if (isTablet) {
                                  setSidebarPeeking(true);
                              } else {
                                  setSidebarCollapse(false);
                              }
                          }}
                      >
                          <PanelLeftOpen />
                      </Button>
                  )}
                  <div className={cn('flex min-w-0 grow items-center', className)}>
                      {breadcrumbs.length > 0 ? <Breadcrumbs breadcrumbs={breadcrumbs} /> : children}
                  </div>
              </div>

              {/* Center: search */}
              <div className="hidden items-center lg:flex">
                  <HeaderSearchTrigger />
              </div>

              {/* Right side: actions */}
              <div className="flex shrink-0 items-center gap-2">
                  <HeaderNew />
                  <Separator orientation="vertical" className="mx-1 h-4 bg-border" />
                  <HeaderMobileSearchTrigger />
                  <AiChatSheet />
                  <HeaderNotifications />
                  <HeaderHelp />
              </div>
          </div>
      </div>
  );
}
