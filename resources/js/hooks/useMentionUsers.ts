import axios from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

interface MentionUser {
    id: number;
    name: string;
    email: string;
    avatar?: string;
}

export function useMentionUsers(search: string, enabled: boolean) {
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [search]);

    const query = useQuery<MentionUser[]>({
        queryKey: ['mention-users', debouncedSearch],
        queryFn: async () => {
            const response = await axios.get('/api/mention-users', {
                params: {
                    search: debouncedSearch || undefined,
                    per_page: 10,
                },
            });
            return response.data?.data ?? [];
        },
        enabled: enabled,
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    return {
        data: query.data ?? [],
        isLoading: query.isLoading,
    };
}
