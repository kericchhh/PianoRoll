import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
    const preference = window.matchMedia?.(QUERY);
    preference?.addEventListener('change', onChange);
    return () => preference?.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
    return window.matchMedia?.(QUERY).matches ?? false;
}

export function usePrefersReducedMotion(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
