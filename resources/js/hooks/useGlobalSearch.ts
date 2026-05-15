import axios from '@/lib/http';
import { type GlobalSearchResults } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

const RECENT_SEARCHES_KEY = 'crm:recent-searches';
const MAX_RECENT = 5;

export function useGlobalSearch(query: string) {
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [query]);

    const { data: results, isLoading } = useQuery<GlobalSearchResults>({
        queryKey: ['global-search', debouncedQuery],
        queryFn: async () => {
            const response = await axios.get('/api/global-search', {
                params: { q: debouncedQuery },
            });
            return response.data;
        },
        enabled: debouncedQuery.length >= 2,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    return { results, isLoading };
}

export function useRecentSearches() {
    const getAll = (): string[] => {
        try {
            return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]');
        } catch {
            return [];
        }
    };

    const add = (term: string): void => {
        const trimmed = term.trim();
        if (!trimmed) {
            return;
        }
        const existing = getAll().filter((t) => t !== trimmed);
        const updated = [trimmed, ...existing].slice(0, MAX_RECENT);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    };

    const remove = (term: string): void => {
        const updated = getAll().filter((t) => t !== term);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    };

    const clear = (): void => {
        localStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    return { getAll, add, remove, clear };
}
