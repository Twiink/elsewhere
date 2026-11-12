import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Shape, ShapeGeometry, Vector3 } from 'three';
import Text from '../SiteText';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

const CHARACTERS = '准备好了一起进去看看';

function createArrow() {
    const shape = new Shape();
    shape.moveTo(-0.038, 0.31);
    shape.quadraticCurveTo(0.025, 0.46, -0.008, 0.61);
    shape.lineTo(-0.065, 0.54);
    shape.lineTo(-0.078, 0.55);
    shape.lineTo(0, 0.65);
    shape.lineTo(0.084, 0.556);
    shape.lineTo(0.07, 0.545);
    shape.lineTo(0.009, 0.61);
    shape.quadraticCurveTo(0.04, 0.46, -0.024, 0.305);
    shape.closePath();
    return new ShapeGeometry(shape);
}

export default function EntranceInvitation({ visible, floorY }) {
    const root = useRef();
    const heading = useRef();
    const subtitle = useRef();
    const arrowMaterial = useRef();
    const opacity = useRef(0);
    const measured = useRef({ width: 0, height: 0 });
    const reducedMotion = useReducedMotion();
    const { size } = useThree();
    const landscape = size.height < 500 && size.width > size.height;
    const arrow = useMemo(() => createArrow(), []);
    const points = useRef({ center: new Vector3(), x: new Vector3(), y: new Vector3() });
    useEffect(() => () => arrow.dispose(), [arrow]);

    useFrame(({ camera, size }, delta) => {
        if (!root.current) return;
        // 字形仍贴在地面上，只在视口变化时补偿透视压缩，保证手机可读。
        if (heading.current && subtitle.current && (measured.current.width !== size.width || measured.current.height !== size.height)) {
            root.current.updateWorldMatrix(true, false);
            camera.updateMatrixWorld();
            const vectors = points.current;
            const fitText = (text, pixels) => {
                root.current.localToWorld(vectors.center.copy(text.position)).project(camera);
                vectors.x.copy(text.position); vectors.x.x += 0.01;
                root.current.localToWorld(vectors.x).project(camera);
                vectors.y.copy(text.position); vectors.y.y += 0.01;
                root.current.localToWorld(vectors.y).project(camera);
                const horizontal = Math.hypot((vectors.x.x - vectors.center.x) * size.width / 2, (vectors.x.y - vectors.center.y) * size.height / 2) / 0.01;
                const vertical = Math.hypot((vectors.y.x - vectors.center.x) * size.width / 2, (vectors.y.y - vectors.center.y) * size.height / 2) / 0.01;
                text.scale.set(pixels / horizontal, pixels / vertical, 1);
            };
            fitText(heading.current, landscape ? 24 : size.width < 640 ? 26 : 28);
            fitText(subtitle.current, landscape ? 18 : size.width < 640 ? 19 : 20);
            measured.current = { width: size.width, height: size.height };
        }
        opacity.current = reducedMotion ? Number(visible) : MathUtils.damp(opacity.current, Number(visible), visible ? 9 : 24, Math.min(delta, 0.1));
        root.current.visible = opacity.current > 0.005;
        if (heading.current) heading.current.material.opacity = opacity.current;
        if (subtitle.current) subtitle.current.material.opacity = opacity.current * 0.9;
        if (arrowMaterial.current) arrowMaterial.current.opacity = opacity.current * 0.8;
    });

    return <group ref={root} name="entrance-invitation" position={[0, floorY + 0.036, landscape ? 1 : 1.3]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <Suspense fallback={null}>
            <Text ref={heading} name="entrance-invitation-heading" characters={CHARACTERS} fontSize={1} color="#484744" anchorX="center" anchorY="middle" renderOrder={3} position={[0, 0, 0.002]} material-transparent material-opacity={0} material-depthWrite={false} material-toneMapped={false}>准备好了</Text>
            <Text ref={subtitle} name="entrance-invitation-subtitle" characters={CHARACTERS} fontSize={1} color="#55534e" anchorX="center" anchorY="middle" renderOrder={3} position={[0, landscape ? -0.8 : -0.45, 0.003]} material-transparent material-opacity={0} material-depthWrite={false} material-toneMapped={false}>一起进去看看</Text>
        </Suspense>
        <mesh name="entrance-invitation-arrow" geometry={arrow} renderOrder={3} position={[0, 0, 0.004]} scale={[1.5, landscape ? 1.25 : 1.7, 1]}>
            <meshBasicMaterial ref={arrowMaterial} color="#504e49" transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
    </group>;
}
