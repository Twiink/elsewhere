import { useScene } from '../../context/contexts';
import '../../styles/RoomLoadingNotice.scss';

const labels = { gallery: '作品画廊', studio: '生活手记', about: '关于我', contact: '联系我', corridor: '走廊' };

export default function RoomLoadingNotice() {
    const { loadingRoom, isTeleporting, teleportTarget, pendingDoorClick, teleportPhase } = useScene();
    const target = loadingRoom ?? teleportTarget ?? pendingDoorClick;
    if (!target || (!loadingRoom && (!isTeleporting || teleportPhase === 'opening'))) return null;
    const onPaper = isTeleporting && teleportPhase !== 'opening';
    return <div className={`room-loading-notice${onPaper ? ' room-loading-notice--paper' : ''}`} role="status" aria-live="polite" aria-atomic="true">
        <span>正在准备{labels[target] ?? '房间'}…</span>
        <small>准备好就开门</small>
    </div>;
}
