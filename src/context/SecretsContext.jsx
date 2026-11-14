import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SecretsContext } from './contexts';
import { SECRETS } from '../data/secrets';

const STORAGE_KEY = 'twiink_secrets_v1';
const secretIds = new Set(SECRETS.map(secret => secret.id));

function readProgress() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) ? [...new Set(saved.filter(id => secretIds.has(id)))] : [];
    } catch {
        return [];
    }
}

export function SecretsProvider({ children }) {
    const [discovered, setDiscovered] = useState(readProgress);
    const discoveredRef = useRef(discovered);
    const [draftPhase, setDraftPhase] = useState(null);
    const [codeControllerOpen, setCodeControllerOpen] = useState(false);
    const [codeProgress, setCodeProgress] = useState(0);
    const openDraftRoom = useCallback(() => {
        setCodeControllerOpen(false);
        setCodeProgress(0);
        setDraftPhase(phase => phase || 'loading');
    }, []);
    const closeDraftRoom = useCallback(() => {
        setDraftPhase(phase => phase === 'loading' ? null : phase ? 'closing' : null);
    }, []);

    const discoverSecret = useCallback(id => {
        if (!secretIds.has(id) || discoveredRef.current.includes(id)) return;
        const next = [...discoveredRef.current, id];
        discoveredRef.current = next;
        setDiscovered(next);
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(discovered));
        } catch {
            // 存储受限时，本次浏览仍可发现和计数。
        }
    }, [discovered]);

    const value = useMemo(() => ({ discovered, discoverSecret, draftPhase, setDraftPhase, openDraftRoom, closeDraftRoom,
        codeControllerOpen, setCodeControllerOpen, codeProgress, setCodeProgress }),
    [discovered, discoverSecret, draftPhase, openDraftRoom, closeDraftRoom, codeControllerOpen, codeProgress]);
    return <SecretsContext.Provider value={value}>{children}</SecretsContext.Provider>;
}
