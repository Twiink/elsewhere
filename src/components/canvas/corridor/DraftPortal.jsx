import { useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { DoubleSide, Matrix4, Quaternion, Vector3 } from 'three';
import { useSecrets } from '../../../context/contexts';
import { useTexture } from '../../../hooks/useMediaTexture';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { DRAFT_ASSETS } from '../../../config/draftRoom';

export default function DraftPortal({ setCameraOverride }) {
    const { camera } = useThree();
    const { draftPhase, setDraftPhase } = useSecrets();
    const reducedMotion = useReducedMotion();
    const leaf = useRef();
    const [paper, room] = useTexture(['/media/images/textures/paper-texture.webp', DRAFT_ASSETS.room]);
    const [origin] = useState(() => new Vector3(3.44, 0.15, camera.position.z - 3.8));
    const view = useRef({
        time: 0, finished: false,
        originalPosition: camera.position.clone(), originalRotation: camera.quaternion.clone(),
        fromPosition: camera.position.clone(), fromRotation: camera.quaternion.clone(),
        origin,
        target: new Vector3(), rotation: new Quaternion(), matrix: new Matrix4(),
    });

    useEffect(() => {
        const state = view.current;
        setCameraOverride(true);
        window.dispatchEvent(new CustomEvent('inspectChange', { detail: true }));
        return () => {
            camera.position.copy(state.originalPosition);
            camera.quaternion.copy(state.originalRotation);
            setCameraOverride(false);
            window.dispatchEvent(new CustomEvent('inspectChange', { detail: false }));
        };
    }, [camera, setCameraOverride]);

    useEffect(() => {
        const state = view.current;
        state.time = 0; state.finished = false;
        state.fromPosition.copy(camera.position); state.fromRotation.copy(camera.quaternion);
    }, [draftPhase, camera]);

    useFrame((_, delta) => {
        const state = view.current;
        if (state.finished || draftPhase === 'room') return;
        const returning = draftPhase === 'closing';
        const duration = returning ? 0.55 : 1.15;
        state.time = Math.min(duration, state.time + Math.min(delta, 0.1));
        const t = reducedMotion ? 1 : Math.min(1, state.time / (returning ? duration : 0.85));
        const eased = 1 - (1 - t) ** 3;
        if (returning) {
            state.target.copy(state.originalPosition); state.rotation.copy(state.originalRotation);
        } else {
            const distance = Math.max(2.7 / 0.8, 1.65 / (camera.aspect * 0.82)) / (2 * Math.tan(camera.fov * Math.PI / 360));
            state.target.copy(state.origin);
            state.target.x -= distance;
            state.matrix.lookAt(state.target, state.origin, camera.up);
            state.rotation.setFromRotationMatrix(state.matrix);
        }
        camera.position.lerpVectors(state.fromPosition, state.target, eased);
        camera.quaternion.slerpQuaternions(state.fromRotation, state.rotation, eased);
        if (leaf.current) leaf.current.rotation.y = -1.9 * (returning ? 1 - eased : eased);
        if (reducedMotion || state.time === duration) {
            state.finished = true;
            setDraftPhase(returning ? null : 'room');
        }
    });

    return <group name="konami-wall-opening" position={origin} rotation={[0, -Math.PI / 2, 0]} visible={draftPhase !== 'room'}>
        <mesh position={[0, 0, 0.025]} renderOrder={80}>
            <planeGeometry args={[1.65, 2.7]} />
            <meshBasicMaterial map={room} toneMapped={false} fog={false} depthTest={false} />
        </mesh>
        <group ref={leaf} position={[-0.825, 0, 0.04]}>
            <mesh position={[0.825, 0, 0]} renderOrder={81}>
                <planeGeometry args={[1.65, 2.7]} />
                <meshBasicMaterial map={paper} color="#dfddd8" side={DoubleSide} fog={false} depthTest={false} />
            </mesh>
        </group>
        <Html center position={[0, 1.62, 0.1]} style={{ pointerEvents: 'none' }}><span className="draft-portal-note">暗号对上了</span></Html>
    </group>;
}
