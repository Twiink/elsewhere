import { useId, useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { planeFlightAt } from '../../utils/draftMotion';

export default function DraftPaperPlane({ src, flight, phase, onLaunch, onApproachWindow, onComplete }) {
    const sprite = useRef();
    const layer = useRef();
    const windowMask = useRef();
    const reducedMotion = useReducedMotion();
    const clipId = useId().replaceAll(':', '');

    useLayoutEffect(() => {
        if (phase !== 'flying') return;
        let frame;
        let started;
        let followed = false;
        const duration = reducedMotion ? 180 : 3200;
        const update = time => {
            started ??= time;
            const progress = Math.min(1, (time - started) / duration);
            const pose = planeFlightAt(reducedMotion ? 0 : progress);
            if (!reducedMotion && pose.exiting && !followed) { followed = true; onApproachWindow(); }
            sprite.current.setAttribute('transform', `translate(${pose.x} ${pose.y}) rotate(${pose.angle}) scale(${pose.scale})`);
            sprite.current.setAttribute('opacity', reducedMotion ? 1 - progress : 1);
            if (pose.x >= 1360) windowMask.current.setAttribute('clip-path', `url(#${clipId})`);
            else windowMask.current.removeAttribute('clip-path');
            layer.current.dataset.flightStage = reducedMotion ? 'leaving' : pose.exiting ? 'window' : 'loop';
            if (progress < 1) frame = requestAnimationFrame(update);
            else onComplete();
        };
        frame = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frame);
    }, [flight, phase, reducedMotion, onApproachWindow, onComplete, clipId]);

    return <>
        <button type="button" className={`draft-object draft-object--plane${phase !== 'idle' ? ' is-launched' : ''}`}
            aria-label="放飞纸飞机" disabled={phase !== 'idle'} onClick={onLaunch}>
            <span className="draft-object-art"><img src={src} alt="" draggable="false" /></span>
            <span className="draft-object-label">放飞纸飞机</span>
        </button>
        {phase === 'flying' && <svg ref={layer} className="draft-flight-layer" viewBox="0 0 1536 1024" aria-hidden="true">
            <defs><clipPath id={clipId}>
                <path d="M1364 189L1410 165V307L1364 319ZM1422 157L1458 139V298L1422 306Z" fill="white" stroke="none" />
            </clipPath></defs>
            <g ref={windowMask}><g ref={sprite} transform="translate(1167.5 377.8)">
                <image href={src} x="-107.52" y="-80.78" width="215.04" height="161.56" />
            </g></g>
        </svg>}
    </>;
}
