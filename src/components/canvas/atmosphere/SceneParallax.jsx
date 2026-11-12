import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';
import { useScene } from '../../../context/contexts';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export default function SceneParallax({ room, strength = 0.25, children }) {
    const group = useRef();
    const { currentRoom, isTeleporting, overlayContent } = useScene();
    const reducedMotion = useReducedMotion();
    useFrame(({ pointer }, delta) => {
        if (!group.current) return;
        const enabled = !reducedMotion && !isTeleporting && !overlayContent && currentRoom === room;
        const x = enabled ? pointer.x * strength : 0;
        const y = enabled ? pointer.y * strength * 0.45 : 0;
        group.current.position.x = MathUtils.damp(group.current.position.x, x, 4, Math.min(delta, 0.05));
        group.current.position.y = MathUtils.damp(group.current.position.y, y, 4, Math.min(delta, 0.05));
    });
    return <group ref={group} name={`${room}-background-parallax`}>{children}</group>;
}
