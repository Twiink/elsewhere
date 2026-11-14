import { useCallback, useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { DoubleSide, Matrix4, Quaternion, Vector3 } from 'three';
import { useTexture } from '../../../../hooks/useMediaTexture';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import { useScene, useSecrets } from '../../../../context/contexts';
import { SECRET_IDS } from '../../../../data/secrets';
import { siteInfo, personalProfile } from '../../../../data/content';
import { SurpriseTarget } from '../../corridor/CorridorSurprises';
import '../../../../styles/AvatarExpressions.scss';

const NAMES = ['微笑', '眨眼', '惊喜'];

export default function AvatarExpressions({ texture, width, height, onFocusChange }) {
    const root = useRef();
    const { camera } = useThree();
    const { isTeleporting, exitRequested, overlayContent } = useScene();
    const { discoverSecret } = useSecrets();
    const reducedMotion = useReducedMotion();
    const [wink, surprise] = useTexture(['/media/images/textures/twiink/cloud-wink-v1.webp', '/media/images/textures/twiink/cloud-surprise-v1.webp']);
    const [expression, setExpression] = useState(0);
    const [viewing, setViewing] = useState(false);
    const view = useRef({ phase: 'idle', time: 0, originalPosition: new Vector3(), originalRotation: new Quaternion(),
        fromPosition: new Vector3(), fromRotation: new Quaternion(), center: new Vector3(), normal: new Vector3(), target: new Vector3(), rotation: new Quaternion(), matrix: new Matrix4() });

    const returnToSky = useCallback(() => {
        const state = view.current;
        if (state.phase === 'idle' || state.phase === 'returning') return;
        state.phase = 'returning'; state.time = 0;
        state.fromPosition.copy(camera.position); state.fromRotation.copy(camera.quaternion);
    }, [camera]);

    useEffect(() => {
        if (!viewing) return;
        const escape = event => { if (event.key === 'Escape') { event.preventDefault(); returnToSky(); } };
        window.addEventListener('keydown', escape);
        return () => window.removeEventListener('keydown', escape);
    }, [viewing, returnToSky]);

    useEffect(() => () => {
        const state = view.current;
        if (state.phase !== 'idle') {
            state.phase = 'idle';
            window.dispatchEvent(new CustomEvent('aboutPortraitFocus', { detail: false }));
        }
    }, []);

    useFrame((_, delta) => {
        const state = view.current;
        if (!root.current || state.phase === 'idle') return;
        if (isTeleporting || exitRequested || overlayContent) {
            if (!isTeleporting && !exitRequested) {
                camera.position.copy(state.originalPosition); camera.quaternion.copy(state.originalRotation);
            }
            state.phase = 'idle'; setViewing(false); onFocusChange(false);
            window.dispatchEvent(new CustomEvent('aboutPortraitFocus', { detail: false }));
            return;
        }
        const returning = state.phase === 'returning';
        if (returning) {
            state.target.copy(state.originalPosition); state.rotation.copy(state.originalRotation);
        } else {
            root.current.getWorldPosition(state.center);
            root.current.getWorldQuaternion(state.rotation);
            state.normal.set(0, 0, 1).applyQuaternion(state.rotation);
            const distance = Math.max(5.7, 3.75 / (camera.aspect * 0.8)) / (2 * Math.tan(camera.fov * Math.PI / 360));
            state.target.copy(state.center).addScaledVector(state.normal, distance);
            state.matrix.lookAt(state.target, state.center, camera.up);
            state.rotation.setFromRotationMatrix(state.matrix);
        }
        state.time = Math.min(0.65, state.time + Math.min(delta, 0.1));
        const progress = reducedMotion || state.phase === 'focused' ? 1 : 1 - (1 - state.time / 0.65) ** 3;
        camera.position.lerpVectors(state.fromPosition, state.target, progress);
        camera.quaternion.slerpQuaternions(state.fromRotation, state.rotation, progress);
        if (progress === 1) {
            if (returning) {
                state.phase = 'idle'; setViewing(false); onFocusChange(false);
                window.dispatchEvent(new CustomEvent('aboutPortraitFocus', { detail: false }));
            } else state.phase = 'focused';
        }
        root.current.userData.expression = NAMES[expression];
        root.current.userData.phase = state.phase;
    });

    const activate = () => {
        const state = view.current;
        if (state.phase === 'returning' || state.phase === 'focusing') return;
        if (state.phase === 'idle') {
            state.originalPosition.copy(camera.position); state.originalRotation.copy(camera.quaternion);
            state.fromPosition.copy(camera.position); state.fromRotation.copy(camera.quaternion);
            state.phase = 'focusing'; state.time = 0;
            setViewing(true); onFocusChange(true);
            window.dispatchEvent(new CustomEvent('aboutPortraitFocus', { detail: true }));
            discoverSecret(SECRET_IDS.portrait);
        }
        setExpression(value => (value + 1) % NAMES.length);
    };

    return <group ref={root} name="about-cloud-portrait">
        {viewing && <mesh name="about-portrait-dismiss" position={[0, 0, -0.06]} onClick={event => { event.stopPropagation(); returnToSky(); }}>
            <planeGeometry args={[90, 90]} /><meshBasicMaterial color="#fafafa" transparent opacity={0.88} fog={false} toneMapped={false} depthWrite={false} side={DoubleSide} />
        </mesh>}
        <SurpriseTarget name="about-portrait" room="about" maxDepth={55} label={viewing ? `再点一下，换个表情；当前${NAMES[expression]}` : '点点云上的我'} hint="点一下，打个招呼" annotation="portrait" showCaption={!viewing} width={width * 0.67} height={height * 0.85} onActivate={activate}>
            <mesh>
                <planeGeometry args={[width, height]} />
                <meshBasicMaterial map={[texture, wink, surprise][expression]} color={viewing ? '#ffffff' : '#e0e0e0'} toneMapped={!viewing} transparent alphaTest={0.1} side={DoubleSide} depthWrite={false} />
            </mesh>
        </SurpriseTarget>
        {viewing && <Html fullscreen zIndexRange={[45, 40]} style={{ pointerEvents: 'none' }} calculatePosition={(_, __, size) => [size.width / 2, size.height / 2]}>
            <div className="about-portrait-view">
                <header><h2>{siteInfo.nickname}</h2><p>{siteInfo.siteTitle}</p></header>
                <p className="about-portrait-state" role="status">{NAMES[expression]}<span>再点一下，换个表情</span></p>
                <div className="about-portrait-bottom"><p>{personalProfile.role}</p><button type="button" onClick={returnToSky}>继续飞行 <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12H19M13 6L19 12L13 18" /></svg></button></div>
            </div>
        </Html>}
    </group>;
}
