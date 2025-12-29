import { useState, useRef } from 'react';
import { api } from '../api';
import type { SearchResult } from '../api';

export { type SearchResult };

export const useMapSearch = (provider: string = 'gaode') => {
    // const { showError } = useGlobalError(); // Not needed if we throw
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const searchTimeoutRef = useRef<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchSearchResults = async (value: string) => {
        setSearchLoading(true);
        // Create new controller
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            let data: SearchResult[] = [];
            if (provider === 'gaode') {
                data = await api.searchGaode(value, controller.signal);
            } else {
                data = await api.searchNominatim(value, undefined, controller.signal);
            }

            setSearchResults(data || []);
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Search aborted');
                return;
            }
            if (error.message === 'AMAP_KEY_MISSING') {
                setSearchResults([]);
                throw new Error('未配置高德API Key');
            }
            setSearchResults([]);
            throw error;
        } finally {
            // Only turn off loading if this is the current request
            if (abortControllerRef.current === controller) {
                setSearchLoading(false);
                abortControllerRef.current = null;
            }
        }
    };

    const handleSearch = (value: string, immediate = false) => {
        if (searchTimeoutRef.current) {
            window.clearTimeout(searchTimeoutRef.current);
        }

        // Cancel previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (!value) {
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }

        if (immediate) {
            fetchSearchResults(value);
        } else {
            searchTimeoutRef.current = window.setTimeout(() => {
                fetchSearchResults(value);
            }, 800);
        }
    };

    return {
        searchResults,
        setSearchResults,
        searchLoading,
        handleSearch
    };
};
