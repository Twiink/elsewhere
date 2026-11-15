import { useId, useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { planeFlightAt } from '../../utils/draftMotion';

export default function DraftPaperPlane({ src, flight, phase, onLaunch, onApproachWindow, onComplete }) {
    const sprite = useRef();
    const distantSprite = useRef();
    const layer = useRef();
    const reducedMotion = useReducedMotion();
    const clipId = useId().replaceAll(':', '');

    useLayoutEffect(() => {
        if (phase !== 'flying') return;
        let frame;
        let started;
        const duration = reducedMotion ? 180 : 4200;
        const update = time => {
            started ??= time;
            const progress = Math.min(1, (time - started) / duration);
            const pose = planeFlightAt(reducedMotion ? 0 : progress);
            if (!reducedMotion) onApproachWindow(pose.follow);
            const transform = `translate(${pose.x} ${pose.y}) rotate(${pose.angle}) scale(${pose.scale})`;
            sprite.current.setAttribute('transform', transform);
            distantSprite.current.setAttribute('transform', transform);
            sprite.current.setAttribute('opacity', 1 - pose.occlusion);
            layer.current.style.opacity = reducedMotion ? 1 - progress : pose.opacity;
            layer.current.dataset.flightStage = reducedMotion ? 'leaving' : pose.exiting ? 'window' : 'loop';
            if (progress < 1) frame = requestAnimationFrame(update);
            else onComplete();
        };
        frame = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frame);
    }, [flight, phase, reducedMotion, onApproachWindow, onComplete]);

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
            <g clipPath={`url(#${clipId})`}><g ref={distantSprite} transform="translate(1167.5 377.8)">
                <image href={src} x="-107.52" y="-80.78" width="215.04" height="161.56" />
            </g></g>
            <g ref={sprite} transform="translate(1167.5 377.8)">
                <image href={src} x="-107.52" y="-80.78" width="215.04" height="161.56" />
            </g>
        </svg>}
    </>;
}
