import { useEffect, useRef } from 'react';
import { useScene, useSecrets } from '../context/contexts';
import { advanceKonamiStep, KONAMI_KEYS } from '../utils/konami';

export function useKonamiCode() {
    const { hasEntered, isInRoom, isTeleporting, loadingRoom, overlayContent } = useScene();
    const { draftPhase, setCodeProgress, openDraftRoom, closeDraftRoom } = useSecrets();
    const sequence = useRef({ step: 0, last: 0, timer: null });
    const available = hasEntered && !isInRoom && !isTeleporting && !loadingRoom && !overlayContent && !draftPhase;

    useEffect(() => {
        const state = sequence.current;
        const reset = () => { state.step = 0; setCodeProgress(0); clearTimeout(state.timer); };
        const feed = (key, event, fromController = false) => {
            if (!available) return;
            if (!fromController && (event.repeat || event.ctrlKey || event.metaKey || event.altKey
                || event.target.closest?.('input, textarea, select, [contenteditable="true"], dialog:not(.konami-controller)'))) return;
            const now = performance.now();
            if (now - state.last > 6000) state.step = 0;
            const previous = state.step;
            state.step = advanceKonamiStep(state.step, key);
            state.last = now;
            // 单次向上仍用于走廊移动，确认第二个按键后才接管暗号。
            if (previous > 0 && state.step > 0) { event.preventDefault(); event.stopPropagation(); }
            if (state.step === KONAMI_KEYS.length) { reset(); openDraftRoom(); return; }
            setCodeProgress(state.step);
            clearTimeout(state.timer);
            state.timer = setTimeout(reset, 6000);
        };
        const keyboard = event => {
            if (event.key === 'Escape' && draftPhase) { event.preventDefault(); closeDraftRoom(); return; }
            feed(event.key, event);
        };
        const controller = event => feed(event.detail, event, true);
        window.addEventListener('keydown', keyboard, true);
        window.addEventListener('secretCodeKey', controller);
        window.addEventListener('secretCodeReset', reset);
        return () => { reset(); window.removeEventListener('keydown', keyboard, true); window.removeEventListener('secretCodeKey', controller); window.removeEventListener('secretCodeReset', reset); };
    }, [available, draftPhase, setCodeProgress, openDraftRoom, closeDraftRoom]);
}
