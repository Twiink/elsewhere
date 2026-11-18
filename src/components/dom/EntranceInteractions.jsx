import { useEffect, useState } from 'react';
import { useScene, useWorldTheme } from '../../context/contexts';

const request = (type, active) => window.dispatchEvent(new CustomEvent('entranceInteract', { detail: { type, active } }));

export default function EntranceInteractions() {
    const { hasEntered } = useScene();
    const { entrancePhase } = useWorldTheme();
    const [windowOpen, setWindowOpen] = useState(false);
    const [message, setMessage] = useState('');
    useEffect(() => {
        const react = event => {
            if (event.detail.type === 'window') setWindowOpen(event.detail.active);
            if (event.detail.message) setMessage(event.detail.message);
        };
        window.addEventListener('entranceReaction', react);
        return () => window.removeEventListener('entranceReaction', react);
    }, []);
    if (hasEntered) return null;
    const disabled = entrancePhase !== 'idle';
    return <nav className="entrance-keyboard-controls" aria-label="庭院互动">
        <button type="button" disabled={disabled} onClick={() => window.dispatchEvent(new Event('entranceRequest'))}
            onFocus={() => request('door', true)} onBlur={() => request('door', false)}>打开木门，进入创意工坊</button>
        <button type="button" disabled={disabled} aria-expanded={windowOpen} onFocus={() => request('window', true)}
            onBlur={() => request('window', false)} onClick={() => request('window', !windowOpen)}
            onKeyDown={event => { if (event.key === 'Escape') request('window', false); event.stopPropagation(); }}>窗边打个招呼</button>
        <button type="button" disabled={disabled} onClick={() => request('duck')}>问问窗台下的橡皮鸭</button>
        <button type="button" disabled={disabled} onClick={() => request('bug')}>修复墙上的小虫</button>
        <span className="entrance-announcement" role="status">{message}</span>
    </nav>;
}
