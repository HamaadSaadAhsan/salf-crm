import { useGlobalSearchContext } from '@/providers/GlobalSearchProvider';
import { Search } from 'lucide-react';

export function HeaderSearchTrigger() {
    const { openSearch } = useGlobalSearchContext();
    const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

    return (
        <button
            type="button"
            onClick={openSearch}
            className="hidden w-72 cursor-pointer items-center gap-2.5 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-400 shadow-sm transition-all duration-150 hover:border-zinc-600/60 hover:bg-zinc-700/50 hover:text-zinc-200 sm:flex xl:w-96"
            aria-label="Open global search"
        >
            <Search className="size-3.5 shrink-0" />
            <span className="flex-1 text-zinc-500">Search...</span>
            <kbd className="pointer-events-none ml-4 hidden select-none items-center rounded border border-zinc-600/50 bg-zinc-700/40 px-1.5 py-0.5 font-mono text-[10px] leading-none text-zinc-500 sm:inline-flex">
                {isMac ? '⌘K' : 'Ctrl+K'}
            </kbd>
        </button>
    );
}
