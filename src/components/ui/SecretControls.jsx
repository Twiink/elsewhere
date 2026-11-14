import { useEffect, useRef } from 'react';
import { useSecrets } from '../../context/contexts';
import { useKonamiCode } from '../../hooks/useKonamiCode';
import { KONAMI_KEYS, KONAMI_LABELS } from '../../utils/konami';
import '../../styles/SecretExperiences.scss';

export default function SecretControls() {
    useKonamiCode();
    const { codeControllerOpen, setCodeControllerOpen, codeProgress, draftPhase, setCodeProgress } = useSecrets();
    const dialog = useRef();
    const close = () => { setCodeControllerOpen(false); setCodeProgress(0); window.dispatchEvent(new Event('secretCodeReset')); };
    useEffect(() => {
        if (codeControllerOpen) dialog.current.showModal();
        else dialog.current.close();
    }, [codeControllerOpen]);
    const keys = [
        { key: 'ArrowUp', label: '上', className: 'up' }, { key: 'ArrowLeft', label: '左', className: 'left' },
        { key: 'ArrowRight', label: '右', className: 'right' }, { key: 'ArrowDown', label: '下', className: 'down' },
        { key: 'b', label: 'B', className: 'key-b' }, { key: 'a', label: 'A', className: 'key-a' },
    ];
    return <>
        {codeProgress >= 2 && !codeControllerOpen && !draftPhase && <div className="konami-progress" role="status" aria-label={`暗号已输入 ${codeProgress} 步`}>
            {KONAMI_LABELS.slice(0, codeProgress).join(' ')}<span>……好像有回应</span>
        </div>}
        <dialog ref={dialog} className="konami-controller" aria-labelledby="konami-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === dialog.current) close(); }}>
            <div className="konami-paper" onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') event.stopPropagation(); }}>
                <button type="button" className="secret-close" onClick={close} aria-label="收起暗号纸页"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" /></svg></button>
                <h2 id="konami-title">试试这串暗号</h2>
                <p className="konami-sequence" aria-label="上上下下左右左右 B A">
                    {KONAMI_LABELS.map((label, index) => <span key={index} className={index < codeProgress ? 'entered' : ''}>{label}</span>)}
                </p>
                <div className="konami-keys">
                    {keys.map(item => <button key={item.key} className={`konami-key ${item.className}`} type="button" aria-label={`暗号按键${item.label}`} onClick={() => window.dispatchEvent(new CustomEvent('secretCodeKey', { detail: item.key, cancelable: true }))}>
                        {item.key.length === 1 ? item.label : <svg viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${({ ArrowUp: 0, ArrowRight: 90, ArrowDown: 180, ArrowLeft: 270 })[item.key]}deg)` }}><path d="M12 20V4M5 11L12 4L19 11" /></svg>}
                    </button>)}
                </div>
                <p className="konami-feedback" role="status">{codeProgress ? `已经对上 ${codeProgress} / ${KONAMI_KEYS.length} 步` : '上上下下，左右左右，再 B、A。'}</p>
            </div>
        </dialog>
    </>;
}
