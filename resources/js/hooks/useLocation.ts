'use client';

import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

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
 * Fetch all countries from the API
 */
export function useCountries() {
    return useQuery({
        queryKey: ['countries'],
        queryFn: async () => {
            const response = await axios.get('/api/countries');
            return response.data.countries as Country[];
        },
        staleTime: 30 * 60 * 1000, // 30 minutes - countries rarely change
        gcTime: 60 * 60 * 1000, // 1 hour
    });
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
    const { data: countries, isLoading, error } = useCountries();

    const options = (countries || []).map((country) => ({
        value: country.code,
        label: country.name,
    }));

    return { options, isLoading, error };
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
