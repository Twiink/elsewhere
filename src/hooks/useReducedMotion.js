import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
const subscribe = callback => {
    const media = window.matchMedia(query);
    media.addEventListener('change', callback);
    return () => media.removeEventListener('change', callback);
};
const snapshot = () => window.matchMedia(query).matches;

export function useReducedMotion() {
    return useSyncExternalStore(subscribe, snapshot, () => false);
}
