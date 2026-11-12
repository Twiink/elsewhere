import { Suspense, useEffect, useMemo, useRef } from 'react';
import { BufferGeometry, Float32BufferAttribute, MathUtils } from 'three';
import { useActiveFrame as useFrame } from '../../../hooks/useActiveFrame';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import Text from '../SiteText';
import { DOOR_ANNOTATIONS } from '../../../config/doorAnnotations';

const CHARACTERS = '进来看看布展中…请进翻翻手记整理认识一下准备聊';
const INK = '#454440';

function lineGeometry(points) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(points.flat(), 3));
    return geometry;
}

export default function DoorAnnotation({ doorId, phase = 'idle', matrix, visible = true }) {
    const config = DOOR_ANNOTATIONS[doorId];
    const idleText = useRef();
    const loadingText = useRef();
    const readyText = useRef();
    const strokeMaterial = useRef();
    const arrowMaterial = useRef();
    const reducedMotion = useReducedMotion();
    const drawings = useMemo(() => ({
        stroke: lineGeometry([[0, 0, 0], [0.027, 0.001, 0], [0.056, 0, 0], [0.084, 0.002, 0], [0.105, 0.001, 0]]),
        arrow: lineGeometry([[0, 0, 0], [0.045, 0.002, 0], [0.1, 0.004, 0], [0.072, 0.021, 0], [0.1, 0.004, 0], [0.075, -0.015, 0]]),
    }), []);
    useEffect(() => () => Object.values(drawings).forEach(geometry => geometry.dispose()), [drawings]);

    useFrame(({ clock }, delta) => {
        if (!visible) return;
        const opacity = ref => {
            if (!ref.current) return;
            const target = (ref === idleText ? phase === 'idle' : ref === loadingText ? phase === 'loading' : phase === 'ready') ? 0.94 : 0;
            const material = ref.current.material;
            material.opacity = reducedMotion || Math.abs(material.opacity - target) < 0.001 ? target : MathUtils.damp(material.opacity, target, 22, delta);
            ref.current.visible = material.opacity > 0.001;
        };
        opacity(idleText);
        opacity(loadingText);
        opacity(readyText);
        const waiting = phase === 'loading';
        drawings.stroke.setDrawRange(0, waiting && !reducedMotion ? 2 + Math.floor((clock.elapsedTime * 0.65 % 1) * 4) : 5);
        if (strokeMaterial.current) strokeMaterial.current.visible = phase !== 'ready';
        if (arrowMaterial.current) {
            arrowMaterial.current.opacity = readyText.current?.material.opacity ?? 0;
            arrowMaterial.current.visible = phase === 'ready';
        }
    });

    return <group name={`${doorId}-door-annotation`} matrix={matrix} matrixAutoUpdate={false} visible={visible} userData={{ phase, doorId }}>
        <Suspense fallback={null}>
            <Text ref={idleText} renderOrder={2} characters={CHARACTERS} fontSize={config.fontSize} scale={[config.textScaleX ?? 1, 1, 1]} color={INK} anchorX="center" anchorY="middle" position={[config.textX ?? -0.05, 0, 0]} material-transparent material-opacity={0.94} material-depthWrite={false} material-toneMapped={false}>{config.idle}</Text>
            <Text ref={loadingText} renderOrder={2} characters={CHARACTERS} fontSize={config.fontSize} scale={[config.textScaleX ?? 1, 1, 1]} color={INK} anchorX="center" anchorY="middle" position={[config.textX ?? -0.05, 0, 0]} material-transparent material-opacity={0} material-depthWrite={false} material-toneMapped={false}>{config.loading}</Text>
            <Text ref={readyText} renderOrder={2} characters={CHARACTERS} fontSize={config.fontSize} scale={[config.textScaleX ?? 1, 1, 1]} color={INK} anchorX="center" anchorY="middle" position={[config.readyX ?? -0.025, 0, 0]} material-transparent material-opacity={0} material-depthWrite={false} material-toneMapped={false}>请进</Text>
        </Suspense>
        <line name={`${doorId}-annotation-stroke`} geometry={drawings.stroke} position={[config.strokeX ?? 0.15, config.strokeY ?? -0.003, 0]} scale={config.strokeScale ?? 1} renderOrder={2}>
            <lineBasicMaterial ref={strokeMaterial} color={INK} transparent opacity={0.66} depthWrite={false} toneMapped={false} />
        </line>
        <line name={`${doorId}-annotation-arrow`} geometry={drawings.arrow} position={[config.arrowX ?? 0.08, -0.003, 0]} scale={config.arrowScale ?? 1} renderOrder={2}>
            <lineBasicMaterial ref={arrowMaterial} color={INK} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </line>
    </group>;
}
