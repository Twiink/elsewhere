import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Vector3 } from 'three';
import { usePerformance } from '../../../context/contexts';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { createSketchTexture } from './sketchTextures';

function useSketchTexture(kind) {
    const texture = useMemo(() => createSketchTexture(kind), [kind]);
    useEffect(() => () => texture.dispose(), [texture]);
    return texture;
}

export function SketchCrane({ position, scale = 1, phase = 0, secondary = false }) {
    const root = useRef();
    const jib = useRef();
    const trolley = useRef();
    const world = useMemo(() => new Vector3(), []);
    const mastMap = useSketchTexture('mast');
    const jibMap = useSketchTexture('jib');
    const hookMap = useSketchTexture('hook');
    const { settings } = usePerformance();
    const reducedMotion = useReducedMotion();
    const nextUpdate = useRef(0);
    useFrame(({ camera, clock }) => {
        if (!root.current || clock.elapsedTime < nextUpdate.current) return;
        nextUpdate.current = clock.elapsedTime + 1 / settings.animationFps;
        root.current.getWorldPosition(world);
        const distance = world.distanceTo(camera.position);
        root.current.visible = (!secondary || settings.cloudDensity > 0.4) && distance < settings.detailDistance;
        if (!root.current.visible) return;
        trolley.current.visible = distance < settings.detailDistance * 0.65;
        const t = reducedMotion ? 0 : clock.elapsedTime;
        jib.current.rotation.y = Math.sin(t * 0.055 + phase) * 0.11;
        trolley.current.position.x = 2.4 + Math.sin(t * 0.14 + phase) * 1.6;
        trolley.current.rotation.z = Math.sin(t * 0.3 + phase) * 0.035;
    });
    return <group ref={root} name="hand-drawn-crane" position={position} scale={scale}>
        <mesh position={[0, 4.7, 0]}><planeGeometry args={[2.5, 10]} /><meshBasicMaterial map={mastMap} transparent depthWrite={false} side={DoubleSide} color="#e0ded6" /></mesh>
        <group ref={jib} position={[0, 9.2, 0.04]}>
            <mesh position={[2.1, 0, 0]}><planeGeometry args={[13, 2.03]} /><meshBasicMaterial map={jibMap} transparent depthWrite={false} side={DoubleSide} color="#e0ded6" /></mesh>
            <group ref={trolley} position={[2.4, -0.35, 0.06]}>
                <mesh position={[0, -1.9, 0]}><planeGeometry args={[1.38, 3.8]} /><meshBasicMaterial map={hookMap} transparent depthWrite={false} side={DoubleSide} /></mesh>
            </group>
        </group>
    </group>;
}

export function ContactIsland() {
    const texture = useSketchTexture('island');
    return <mesh name="hand-drawn-island" position={[1, 7.05, -31]}>
        <planeGeometry args={[32, 32 / 3]} />
        <meshBasicMaterial map={texture} transparent opacity={0.65} depthWrite={false} side={DoubleSide} color="#e6e6db" fog={false} />
    </mesh>;
}
