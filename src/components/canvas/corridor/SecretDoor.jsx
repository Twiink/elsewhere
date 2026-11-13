import { useCallback, useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { DoubleSide, Matrix4, Quaternion, RepeatWrapping, SRGBColorSpace, Vector3 } from 'three';
import { useActiveFrame } from '../../../hooks/useActiveFrame';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { useTexture } from '../../../hooks/useMediaTexture';
import { useTextureCopy } from '../../../hooks/useTextureCopy';
import { useSecrets } from '../../../context/contexts';
import { SECRET_IDS } from '../../../data/secrets';
import { SurpriseTarget } from './CorridorSurprises';
import Text from '../SiteText';

const WIDTH = 1.19;
const HEIGHT = 2.73;
const LEAF_Y = -0.025;
const DURATION = 1.75;
const easeOut = value => 1 - (1 - value) ** 3;
const clamp = value => Math.max(0, Math.min(1, value));

export default function SecretDoor({ position, rotation, setCameraOverride }) {
    const root = useRef();
    const camera = useThree(state => state.camera);
    const hinge = useRef();
    const handle = useRef();
    const zero = useRef();
    const note = useRef();
    const elapsed = useRef(-1);
    const [message, setMessage] = useState('');
    const [viewing, setViewing] = useState(false);
    const view = useRef({
        phase: 'idle', time: 0, trigger: null,
        originalPosition: new Vector3(), originalRotation: new Quaternion(),
        fromPosition: new Vector3(), fromRotation: new Quaternion(),
        targetPosition: new Vector3(), targetRotation: new Quaternion(),
        center: new Vector3(), normal: new Vector3(), matrix: new Matrix4(),
    });
    const reducedMotion = useReducedMotion();
    const { discoverSecret } = useSecrets();
    const { artwork, frame, handleTexture, sillTexture } = useTexture({
        artwork: '/media/images/textures/corridor/doors/404-room-walk-v1.webp',
        frame: '/media/images/textures/corridor/doors/ramkasingledoors.webp',
        handleTexture: '/media/images/textures/corridor/doors/klamkadodrzwi.webp',
        sillTexture: '/media/images/textures/corridor/texturadoprogow.webp',
    });
    const paper = useTextureCopy(artwork, { colorSpace: SRGBColorSpace });
    const sill = useTextureCopy(sillTexture, { colorSpace: SRGBColorSpace, wrapS: RepeatWrapping, repeatX: 0.49 });

    const returnToCorridor = useCallback(() => {
        const state = view.current;
        if (state.phase === 'idle' || state.phase === 'returning') return;
        state.phase = 'returning';
        state.time = 0;
        state.fromPosition.copy(camera.position);
        state.fromRotation.copy(camera.quaternion);
    }, [camera]);

    useEffect(() => {
        if (!viewing) return;
        const onKeyDown = event => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            returnToCorridor();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [viewing, returnToCorridor]);

    useEffect(() => () => {
        const state = view.current;
        if (state.phase === 'idle') return;
        camera.position.copy(state.originalPosition);
        camera.quaternion.copy(state.originalRotation);
        setCameraOverride(false);
        window.dispatchEvent(new CustomEvent('inspectChange', { detail: false }));
    }, [camera, setCameraOverride]);

    useActiveFrame((_, delta) => {
        const state = view.current;
        if (state.phase !== 'idle' && root.current) {
            const returning = state.phase === 'returning';
            if (returning) {
                state.targetPosition.copy(state.originalPosition);
                state.targetRotation.copy(state.originalRotation);
            } else {
                root.current.getWorldPosition(state.center);
                root.current.getWorldQuaternion(state.targetRotation);
                state.normal.set(0, 0, 1).applyQuaternion(state.targetRotation);
                // 同时按高度和宽度留白，横竖屏都能看全门框与落下的 0。
                const distance = Math.max(2.84 / 0.78, 1.42 / (camera.aspect * 0.8))
                    / (2 * Math.tan(camera.fov * Math.PI / 360)) + 0.18;
                state.targetPosition.copy(state.center).addScaledVector(state.normal, distance);
                state.matrix.lookAt(state.targetPosition, state.center, camera.up);
                state.targetRotation.setFromRotationMatrix(state.matrix);
            }
            state.time = Math.min(returning ? 0.6 : 0.8, state.time + delta);
            const progress = reducedMotion || state.phase === 'focused' ? 1
                : easeOut(state.time / (returning ? 0.6 : 0.8));
            camera.position.lerpVectors(state.fromPosition, state.targetPosition, progress);
            camera.quaternion.slerpQuaternions(state.fromRotation, state.targetRotation, progress);
            if (progress === 1 && state.phase !== 'focused') {
                if (returning) {
                    state.phase = 'idle';
                    setViewing(false);
                    setCameraOverride(false);
                    window.dispatchEvent(new CustomEvent('inspectChange', { detail: false }));
                    if (state.trigger?.isConnected) state.trigger.focus({ preventScroll: true });
                } else {
                    state.phase = 'focused';
                    discoverSecret(SECRET_IDS.door);
                    elapsed.current = 0;
                }
            }
        }

        if (elapsed.current < 0 || !hinge.current || !zero.current || !handle.current || !note.current) return;
        const time = reducedMotion ? DURATION : Math.min(DURATION, elapsed.current + delta);
        elapsed.current = time;

        // 把手先压下，门缓缓开一条缝，随后加速合拢并轻轻回弹。
        if (time < 0.56) hinge.current.rotation.y = -0.27 * easeOut(clamp((time - 0.16) / 0.4));
        else if (time < 0.68) hinge.current.rotation.y = -0.27;
        else if (time < 0.94) hinge.current.rotation.y = -0.27 * (1 - ((time - 0.68) / 0.26) ** 2);
        else if (time < 1.12) hinge.current.rotation.y = -0.025 * Math.sin((time - 0.94) / 0.18 * Math.PI);
        else hinge.current.rotation.y = 0;
        handle.current.rotation.z = -0.28 * easeOut(clamp(time / 0.16)) * (1 - clamp((time - 0.68) / 0.26));

        // 门合上时震落松动的 0；落地后保留在门槛边，可再次点击重播。
        const fall = clamp((time - 0.87) / 0.42);
        const bounce = clamp((time - 1.29) / 0.28);
        zero.current.position.set(
            0.1 * fall + 0.1 * bounce,
            1.05 - 2.34 * fall ** 2 + Math.sin(bounce * Math.PI) * 0.13 - 0.07 * bounce,
            0.055 + 0.225 * fall + 0.04 * bounce,
        );
        zero.current.rotation.set(-1.05 * bounce, 0, -0.45 * fall - 0.2 * bounce
            + (time < 0.87 ? Math.sin(time * 23) * 0.055 * clamp(time / 0.16) : 0));
        note.current.visible = time >= 1.29;

        if (time === DURATION) {
            elapsed.current = -1;
            setMessage('门开了一条缝又合上了，0掉到了门槛边。');
        }
    });

    const knock = () => {
        if (elapsed.current >= 0) return;
        const state = view.current;
        if (state.phase === 'turning' || state.phase === 'returning') return;
        setMessage('');
        if (state.phase === 'focused') {
            elapsed.current = 0;
            return;
        }
        state.originalPosition.copy(camera.position);
        state.originalRotation.copy(camera.quaternion);
        state.fromPosition.copy(camera.position);
        state.fromRotation.copy(camera.quaternion);
        state.phase = 'turning';
        state.time = 0;
        state.trigger = document.activeElement?.matches('.corridor-surprise-control') ? document.activeElement : null;
        setCameraOverride(true);
        setViewing(true);
        window.dispatchEvent(new CustomEvent('inspectChange', { detail: true }));
    };

    return (
        <group ref={root} position={position} rotation={rotation}>
            {viewing && (
                <Html fullscreen zIndexRange={[120, 110]} style={{ pointerEvents: 'none' }} calculatePosition={(_, __, size) => [size.width / 2, size.height / 2]}>
                    <button type="button" className="nav-btn back-btn" autoFocus aria-label="返回走廊" title="返回走廊" onClick={returnToCorridor}
                        style={{ position: 'absolute', pointerEvents: 'auto', animation: reducedMotion ? 'none' : undefined }}
                        onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') event.stopPropagation(); }}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                </Html>
            )}
            <SurpriseTarget name="corridor-404-door" label="轻敲404号门" message={message} showCaption={false} width={1.42} height={2.84} onActivate={knock}>
                {/* 深色背板使短暂打开的门缝有厚度。 */}
                <mesh position={[0, LEAF_Y, 0.012]}>
                    <planeGeometry args={[WIDTH, HEIGHT]} />
                    <meshBasicMaterial color="#6e6b61" />
                </mesh>
                {/* 薄木门槛与门扇只留细缝，木纹沿用走廊踢脚线。 */}
                <mesh name="404-door-sill" position={[0, -1.4075, 0.08]}>
                    <boxGeometry args={[1.24, 0.025, 0.16]} />
                    <meshBasicMaterial color="#e0e0e0" map={sill} />
                </mesh>
                <group ref={hinge} name="404-door-hinge" position={[-WIDTH / 2, 0, 0.075]}>
                    <group position={[WIDTH / 2, 0, 0]}>
                        <mesh name="404-door-leaf" position={[0, LEAF_Y, 0]}>
                            <boxGeometry args={[WIDTH, HEIGHT, 0.055]} />
                            <meshBasicMaterial color="#c8c4b8" />
                        </mesh>
                        <mesh position={[0, LEAF_Y, 0.03]}>
                            <planeGeometry args={[WIDTH, HEIGHT]} />
                            <meshBasicMaterial map={paper} color="#e8e8e8" side={DoubleSide} toneMapped={false} />
                        </mesh>
                        {[-0.31, 0.31].map(x => (
                            <Text key={x} position={[x, 1.05, 0.055]} fontSize={0.25} color="#544e43" outlineWidth={0.003} outlineColor="#8e8777" anchorX="center" anchorY="middle">4</Text>
                        ))}
                        <group ref={zero} name="404-falling-zero" position={[0, 1.05, 0.055]}>
                            <Text fontSize={0.25} color="#544e43" outlineWidth={0.003} outlineColor="#8e8777" anchorX="center" anchorY="middle">0</Text>
                        </group>
                        <mesh position={[0, 1.18, 0.055]}>
                            <circleGeometry args={[0.012, 10]} />
                            <meshBasicMaterial color="#8e8777" />
                        </mesh>
                        <group ref={handle} name="404-door-handle" position={[0.545, -0.155, 0.06]}>
                            <mesh position={[-0.545, 0.155, 0]}>
                                <planeGeometry args={[WIDTH, HEIGHT]} />
                                <meshBasicMaterial map={handleTexture} transparent opacity={0.8} alphaTest={0.05} depthWrite={false} side={DoubleSide} />
                            </mesh>
                        </group>
                        <group ref={note} name="404-door-note" visible={false} position={[0.08, -1.1, 0.055]}>
                            <Text fontSize={0.085} color="#625c4e" anchorX="center" anchorY="middle" rotation={[0, 0, 0.035]}>去散步了</Text>
                        </group>
                    </group>
                </group>
                <mesh position={[0, 0, 0.13]}>
                    <planeGeometry args={[1.42, 2.84]} />
                    <meshBasicMaterial map={frame} transparent opacity={0.65} alphaTest={0.05} depthWrite={false} side={DoubleSide} />
                </mesh>
            </SurpriseTarget>
        </group>
    );
}
