import { useRef, useCallback, useEffect } from 'react';

export function useDebounce<T extends (...args: any[]) => void>(
    callback: T,
    delay: number
) {
    const timeoutRef = useRef<number | null>(null);
    const callbackRef = useRef(callback);
    const lastArgsRef = useRef<Parameters<T> | null>(null);

    // Keep callback fresh
    callbackRef.current = callback;

    const run = useCallback(() => {
        if (lastArgsRef.current) {
            callbackRef.current(...lastArgsRef.current);
            lastArgsRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    // Cleanup on unmount - execute any pending calls
    useEffect(() => {
        return () => {
            run();
        };
    }, [run]);

    // Handle page unload (refresh/close)
    useEffect(() => {
        const handleUnload = () => {
            run();
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [run]);

    return useCallback((...args: Parameters<T>) => {
        lastArgsRef.current = args;
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(() => {
            run();
        }, delay);
    }, [delay, run]);
}

