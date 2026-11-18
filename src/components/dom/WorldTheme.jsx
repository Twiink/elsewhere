import { useAchievements, useScene, useSecrets, useWorldTheme } from '../../context/contexts';

export function WorldThemeButton() {
    const { theme, toggleTheme, entrancePhase } = useWorldTheme();
    const { hidePopup } = useAchievements();
    const { setDraftPhase, setCodeControllerOpen, setCodeProgress } = useSecrets();
    const moonlight = theme === 'moonlight';
    const target = moonlight ? '白天' : '夜晚';
    const switchAppearance = () => {
        hidePopup();
        setDraftPhase(null);
        setCodeControllerOpen(false);
        setCodeProgress(0);
        toggleTheme();
    };

    return <button type="button" className="nav-btn world-theme-toggle"
        aria-label={`切换到${target}，重新展开入口`} title={`切换到${target}，从撕纸开场重新进入`}
        aria-pressed={moonlight} onClick={switchAppearance} disabled={entrancePhase !== 'idle'}
        onKeyDown={event => event.stopPropagation()}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
            {moonlight ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>
                : <path d="M20.5 14.5A8.8 8.8 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z" />}
        </svg>
        <span aria-hidden="true">{target}</span>
    </button>;
}

export default function WorldTheme() {
    const { hasEntered } = useScene();
    if (hasEntered) return null;

    return <div className="world-entry-controls"><WorldThemeButton /></div>;
}
