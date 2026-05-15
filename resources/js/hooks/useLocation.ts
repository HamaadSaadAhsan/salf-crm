'use client';

import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/http';

export interface Country {
    id: number;
    name: string;
    code: string;
    iso2: string;
    phone_code: string | null;
    currency: string | null;
    currency_symbol: string | null;
    is_active: boolean;
    provinces_count: number;
}

export interface City {
    id: number;
    province_id: number;
    province: {
        id: number;
        name: string;
        code: string;
        country: {
            id: number;
            name: string;
            code: string;
        } | null;
    } | null;
    name: string;
    code: string | null;
    latitude: string | null;
    longitude: string | null;
    is_active: boolean;
    zones_count: number;
}

/**
 * Get all countries from Inertia shared props (once props)
 */
export function useCountries() {
    const { countries } = usePage<SharedData>().props;

    return { data: countries || [], isLoading: false, error: null };
}

/**
 * Fetch cities, optionally filtered by country code
 */
export function useCities(countryCode?: string | null) {
    return useQuery({
        queryKey: ['cities', countryCode],
        queryFn: async () => {
            const params = countryCode ? { country_code: countryCode } : {};
            const response = await axios.get('/api/cities', { params });
            return response.data.cities as City[];
        },
        staleTime: 15 * 60 * 1000, // 15 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        enabled: countryCode !== undefined, // Only fetch if countryCode is provided (can be null to fetch all)
    });
}

/**
 * Get country options formatted for select components
 */
export function useCountryOptions() {
    const { countries } = usePage<SharedData>().props;
    const options = (countries || []).map((country) => ({
        value: country.code,
        label: country.name,
    }));

    return { options, isLoading: false, error: null };
}

/**
 * Get city options formatted for select components, filtered by country code
 */
export function useCityOptions(countryCode?: string | null) {
    const { data: cities, isLoading, error } = useCities(countryCode);

    const options = (cities || []).map((city) => ({
        value: city.name,
        label: city.name,
    }));

    return { options, isLoading, error };
}
