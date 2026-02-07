import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export const useSources = () => {
    const { sources } = usePage<SharedData>().props;

    return {
        sources: sources || [],
        loading: false,
        error: null,
    };
};
