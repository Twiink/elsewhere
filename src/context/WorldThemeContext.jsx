import { useCallback, useEffect, useMemo, useState } from 'react';
import { WorldThemeContext } from './contexts';

export function WorldThemeProvider({ children }) {
    // 每次打开网站都从白天开始；手动选择只在当前访问中生效。
    const [{ theme, entranceRevision }, setAppearance] = useState({ theme: 'paper', entranceRevision: 0 });
    const [entrancePhase, setEntrancePhase] = useState('idle');
    const toggleTheme = useCallback(() => {
        // 切换外观重新展开首页，避免房间深链跳过入口。
        window.history.replaceState(window.history.state, '', '/');
        setEntrancePhase('idle');
        setAppearance(value => ({
            theme: value.theme === 'moonlight' ? 'paper' : 'moonlight',
            entranceRevision: value.entranceRevision + 1,
        }));
    }, []);

    useEffect(() => {
        document.documentElement.dataset.worldTheme = theme;
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'moonlight' ? '#8589a5' : '#fafafa');
    }, [theme]);

    const value = useMemo(() => ({ theme, toggleTheme, entranceRevision, entrancePhase, setEntrancePhase }), [theme, toggleTheme, entranceRevision, entrancePhase]);
    return <WorldThemeContext.Provider value={value}>{children}</WorldThemeContext.Provider>;
}
