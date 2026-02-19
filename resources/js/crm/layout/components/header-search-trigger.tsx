import { Button } from '@/components/ui/button';
import { useGlobalSearchContext } from '@/providers/GlobalSearchProvider';
import { Search } from 'lucide-react';

export function HeaderSearchTrigger() {
    const { openSearch } = useGlobalSearchContext();
    const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

    return (
        <button
            type="button"
            onClick={openSearch}
            className="hidden w-72 cursor-pointer items-center gap-2.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition-all duration-150 hover:border-ring/50 hover:bg-accent hover:text-foreground sm:flex xl:w-96"
            aria-label="Open global search"
        >
            <Search className="size-3.5 shrink-0" />
            <span className="flex-1 text-muted-foreground">Search...</span>
            <kbd className="pointer-events-none ml-4 hidden select-none items-center rounded border border-input bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground sm:inline-flex">
                {isMac ? '⌘K' : 'Ctrl+K'}
            </kbd>
        </button>
    );
}

export function HeaderMobileSearchTrigger() {
    const { openSearch } = useGlobalSearchContext();

    return (
        <Button
            variant="ghost"
            mode="icon"
            size="md"
            onClick={openSearch}
            aria-label="Open global search"
            className="sm:hidden text-muted-foreground hover:text-foreground hover:bg-accent"
        >
            <Search className="size-5" />
        </Button>
    );
}
