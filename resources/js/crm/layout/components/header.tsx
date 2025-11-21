import { Separator } from '@/components/ui/separator';
import { HeaderBrand } from './header-brand';
import { HeaderHelp } from './header-help';
import { HeaderNew } from './header-new';
import { HeaderUpgrade } from './header-upgrade';
import { HeaderUsers } from './header-users';

export function Header() {
    return (
        <header className="fixed start-0 end-0 top-0 z-[10] flex h-[var(--header-height)] items-center justify-between border-b border-zinc-950 bg-zinc-950 pe-[var(--removed-body-scroll-bar-size,0px)] transition-[start] duration-200 ease-in-out dark:border-border">
            <div className="container-fluid flex items-stretch justify-between lg:gap-4">
                <div className="flex items-center gap-4">
                    <HeaderBrand />
                </div>
                <div className="flex items-center gap-2"></div>
                <div className="flex items-center gap-2">
                    <HeaderUpgrade />
                    <HeaderNew />
                    <Separator orientation="vertical" className="mx-1 h-4 bg-zinc-600" />
                    <HeaderHelp />
                    <Separator orientation="vertical" className="mx-1 h-4 bg-zinc-600" />
                    <HeaderUsers />
                </div>
            </div>
        </header>
    );
}
