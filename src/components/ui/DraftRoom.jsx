import { useCallback, useEffect, useRef, useState } from 'react';
import { useSecrets } from '../../context/contexts';
import { DRAFT_ACTIONS, DRAFT_ASSETS } from '../../config/draftRoom';
import { SECRET_IDS } from '../../data/secrets';
import DraftNotebook from './DraftNotebook';
import DraftPaperPlane from './DraftPaperPlane';
import '../../styles/SecretExperiences.scss';

export default function DraftRoom() {
    const { draftPhase, setDraftPhase, closeDraftRoom, discoverSecret } = useSecrets();
    const dialog = useRef();
    const viewport = useRef();
    const trigger = useRef(document.activeElement);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [actions, setActions] = useState({});
    const [planePhase, setPlanePhase] = useState('idle');
    const [message, setMessage] = useState('椅子、铅笔、纸飞机……都可以点一点。');

    useEffect(() => {
        if (draftPhase !== 'loading') return;
        let active = true;
        Promise.all(Object.values(DRAFT_ASSETS).map(src => {
            const image = new Image(); image.src = src;
            return image.decode();
        })).then(() => { if (active) setDraftPhase('opening'); }, () => { if (active) setError(true); });
        return () => { active = false; };
    }, [draftPhase, setDraftPhase, attempt]);

    useEffect(() => {
        if (draftPhase !== 'room') return;
        dialog.current.showModal();
        discoverSecret(SECRET_IDS.draft);
        const area = viewport.current;
        area.scrollLeft = (area.scrollWidth - area.clientWidth) * 0.46;
    }, [draftPhase, discoverSecret]);

    useEffect(() => () => {
        const original = trigger.current;
        if (original?.isConnected) original.focus({ preventScroll: true });
    }, []);

    const activate = useCallback(id => {
        setActions(previous => ({ ...previous, ...(id === 'notebook' ? { pencil: 0 } : {}), [id]: (previous[id] || 0) + 1 }));
        if (id === 'plane') setPlanePhase('flying');
        setMessage(DRAFT_ACTIONS.find(item => item.id === id).message);
    }, []);
    const finishFlight = useCallback(() => {
        setPlanePhase('away');
        setMessage('纸飞机从窗边飞远了。');
    }, []);
    const followWindow = useCallback(() => {
        const area = viewport.current;
        if (area.scrollWidth > area.clientWidth) area.scrollTo({ left: area.scrollWidth - area.clientWidth, behavior: 'smooth' });
    }, []);

    return <>
        {(draftPhase === 'loading' || draftPhase === 'opening') && <div className="draft-loading" role="status">
            <span>{error ? '这页草稿暂时没翻开。' : draftPhase === 'opening' ? '暗号对上了，墙纸在翻开……' : '在找那间小草稿间……'}</span>
            {error && <button type="button" onClick={() => { setError(false); setAttempt(value => value + 1); }}>再翻一次</button>}
            <button type="button" onClick={closeDraftRoom}>回到走廊</button>
        </div>}
        <dialog ref={dialog} className={`draft-room${draftPhase === 'closing' ? ' is-closing' : ''}`} aria-labelledby="draft-room-title" onCancel={event => { event.preventDefault(); closeDraftRoom(); }}>
            <div ref={viewport} className="draft-room-viewport" tabIndex={0} aria-label="草稿间场景，窄屏可左右滑动" onKeyDown={event => event.stopPropagation()}>
                <div className="draft-room-scene">
                    <img className="draft-room-background" src={DRAFT_ASSETS.room} alt="手绘草稿间：木工作台、墙上的纸飞机草图与淡绿窗景" draggable="false" />
                    <h1 id="draft-room-title">草稿间</h1>
                    <svg className="draft-plane-star" viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1L15 10L22 14L15 18L12 27L9 18L2 14L9 10Z" /></svg>
                    {DRAFT_ACTIONS.map(item => item.id === 'notebook'
                        ? <DraftNotebook key={item.id} src={DRAFT_ASSETS.notebook} turn={actions.notebook || 0} onTurn={() => activate('notebook')} />
                        : item.id === 'plane'
                            ? <DraftPaperPlane key={item.id} src={DRAFT_ASSETS.plane} flight={actions.plane || 0} phase={planePhase} onLaunch={() => activate('plane')} onApproachWindow={followWindow} onComplete={finishFlight} />
                            : <button key={item.id} type="button" className={`draft-object draft-object--${item.id}`} aria-label={item.label} onClick={() => activate(item.id)}>
                        <span key={`${item.id}-${actions[item.id] || 0}`} className={`draft-object-art${actions[item.id] ? ' is-playing' : ''}`}>
                            <img src={DRAFT_ASSETS[item.id]} alt="" draggable="false" />
                            {item.id === 'mug' && actions.mug > 0 && <svg className="draft-steam" viewBox="0 0 90 90" aria-hidden="true"><path d="M24 82C3 61 44 49 24 17M45 80C25 57 67 43 46 8M66 82C47 63 85 47 67 21" /></svg>}
                        </span>
                        <span className="draft-object-label">{item.label}</span>
                    </button>)}
                    {actions.pencil > 0 && <svg key={actions.pencil} className="draft-pencil-mark" viewBox="0 0 120 45" aria-hidden="true"><path d="M4 31C24 0 32 44 53 20S90 4 112 17M103 11L113 17L103 21" /></svg>}
                </div>
            </div>
            <footer className="draft-room-footer">
                <div><div className="draft-feedback"><p role="status" key={message}>{message}</p>{planePhase === 'away' && <button type="button" className="draft-plane-again" onClick={() => activate('plane')}>再放一架</button>}</div><span className="draft-pan-hint">左右拖一拖，看看窗边。</span></div>
                <button type="button" className="draft-return" onClick={closeDraftRoom}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H4M10 6L4 12L10 18" /></svg>回到走廊</button>
            </footer>
        </dialog>
    </>;
}
