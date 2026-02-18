import { GlobalSearch } from '@/components/global-search/GlobalSearch';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface GlobalSearchContextValue {
    openSearch: () => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function useGlobalSearchContext(): GlobalSearchContextValue {
    const ctx = useContext(GlobalSearchContext);
    if (!ctx) {
        throw new Error('useGlobalSearchContext must be used within GlobalSearchProvider');
    }
    return ctx;
}

interface GlobalSearchProviderProps {
    children: ReactNode;
}

export function GlobalSearchProvider({ children }: GlobalSearchProviderProps) {
    const [open, setOpen] = useState(false);

    const openSearch = useCallback(() => setOpen(true), []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <GlobalSearchContext.Provider value={{ openSearch }}>
            {children}
            <GlobalSearch open={open} onOpenChange={setOpen} />
        </GlobalSearchContext.Provider>
    );
}
