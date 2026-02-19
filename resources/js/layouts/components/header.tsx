import { Separator } from '@/components/ui/separator';
import { HeaderBrand } from './header-brand';
import { HeaderHelp } from './header-help';
import { HeaderNew } from './header-new';
import { HeaderUpgrade } from './header-upgrade';
import { HeaderUsers } from './header-users';

export function Header() {
  return (
    <header className="fixed top-0 start-0 end-0 z-[10] flex items-center justify-between h-[var(--header-height)] bg-background border-b border-border transition-[start] duration-200 ease-in-out pe-[var(--removed-body-scroll-bar-size,0px)]">
      <div className="container-fluid flex justify-between items-stretch lg:gap-4">
        <div className="flex items-center gap-4">
          <HeaderBrand />
        </div>
        <div className="flex items-center gap-2"></div>
        <div className="flex items-center gap-2">
          <HeaderUpgrade />
          <HeaderNew />
          <Separator orientation="vertical" className="bg-border h-4 mx-1" />
          <HeaderHelp />
          <Separator orientation="vertical" className="bg-border h-4 mx-1" />
          <HeaderUsers />
        </div>
      </div>
    </header>
  );
}
