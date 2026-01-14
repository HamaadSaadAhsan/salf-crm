import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { useIsTablet } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SidebarContent } from './sidebar-content';

export function HeaderBrand() {
  const { url: pathname } = usePage();
  const isTablet = useIsTablet();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Close sheet when route changes
  useEffect(() => {
    setIsSheetOpen(false);
  }, [pathname]);

  return (
      <div className="-ms-1 flex items-center">
          <img src={toAbsoluteUrl('favicon.ico')} alt="" className="h-4" />
          {isTablet && (
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                      <Button variant="dim" mode="icon" className="hover:text-white">
                          <Menu />
                      </Button>
                  </SheetTrigger>
                  <SheetContent className="w-(--sidebar-width) gap-0 p-0" side="left" close={false}>
                      <SheetHeader className="space-y-0 p-0" />
                      <SheetBody className="flex grow flex-col p-0 [--sidebar-space-x:calc(var(--spacing)*2.5)]">
                          <SidebarContent />
                      </SheetBody>
                  </SheetContent>
              </Sheet>
          )}
      </div>
  );
}
