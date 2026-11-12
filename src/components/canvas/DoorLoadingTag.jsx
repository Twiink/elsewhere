import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, MathUtils, SRGBColorSpace } from 'three';
import Text from './SiteText';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const CHARACTERS = '正在布置好了就开门请进';
const INK = '#484744';

function lineGeometry(points) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(points.flat(), 3));
    return geometry;
}

// 纸纹和蓝胶带合绘为一张小纹理，便签挂载期间复用。
function createMemoTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');
    const paper = new Path2D('M31 57 L118 55 L210 58 L302 54 L393 57 L476 55 L479 133 L476 207 L480 282 L476 350 L393 348 L305 351 L214 348 L124 351 L33 347 L30 274 L33 201 L29 127 Z');
    ctx.save();
    ctx.shadowColor = 'rgba(58,56,51,.15)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#eeede8';
    ctx.fill(paper);
    ctx.restore();
    ctx.save();
    ctx.clip(paper);
    for (let i = 0; i < 2200; i++) {
        const x = (Math.sin(i * 127.1 + 3) * 43758.5453 % 1 + 1) % 1 * 512;
        const y = (Math.sin(i * 311.7 + 7) * 28319.7351 % 1 + 1) % 1 * 384;
        ctx.fillStyle = i % 3 ? 'rgba(87,85,79,.045)' : 'rgba(255,255,255,.2)';
        ctx.fillRect(x, y, i % 3 + 1, 0.65);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(91,89,82,.58)';
    ctx.lineWidth = 1;
    ctx.stroke(paper);

    ctx.save();
    ctx.translate(72, 62);
    ctx.rotate(-0.64);
    const tape = new Path2D('M-57 -17 L-46 -19 L-33 -16 L-20 -19 L-6 -17 L8 -19 L22 -16 L36 -19 L53 -17 L55 16 L42 19 L27 17 L12 20 L-2 17 L-17 19 L-32 16 L-46 19 L-56 16 Z');
    ctx.fillStyle = 'rgba(139,170,184,.86)';
    ctx.fill(tape);
    ctx.strokeStyle = 'rgba(88,119,133,.58)';
    ctx.lineWidth = 0.8;
    ctx.stroke(tape);
    ctx.clip(tape);
    ctx.strokeStyle = 'rgba(82,118,137,.15)';
    for (let i = 0; i < 18; i++) {
        const x = -55 + i * 7;
        ctx.beginPath(); ctx.moveTo(x, -19); ctx.lineTo(x + 4, 19); ctx.stroke();
    }
    ctx.restore();

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.name = 'door-memo-paper';
    return texture;
}

function setTextOpacity(ref, opacity) {
    if (ref.current) ref.current.material.opacity = opacity;
}

export default function DoorLoadingTag({ phase, readyAt = 0, position, sizeMultiplier = 1, maxScale = 1.15 }) {
    const root = useRef();
    const paperMaterial = useRef();
    const heading = useRef();
    const subtitle = useRef();
    const readyHeading = useRef();
    const hatchMaterial = useRef();
    const arrowMaterial = useRef();
    const startedAt = useRef(0);
    const shownAt = useRef(0);
    const reducedMotion = useReducedMotion();
    const { size } = useThree();
    const landscape = size.height < 500 && size.width > size.height;
    const baseScale = landscape ? 1.1 : size.width < 640 ? Math.min(0.85, 0.585 * 844 / size.height) : 0.5;
    const scale = Math.min(maxScale, baseScale * sizeMultiplier);
    const textScale = landscape ? 1.17 : Math.max(1, baseScale * sizeMultiplier / maxScale);
    const texture = useMemo(() => createMemoTexture(), []);
    const drawings = useMemo(() => {
        const hatches = [];
        for (let i = 0; i < 18; i++) {
            const x = -0.19 + i * 0.02;
            hatches.push([x, 0, 0], [x + 0.025, 0.022, 0]);
        }
        return {
            hatches: lineGeometry(hatches),
            arrow: lineGeometry([[-0.17, -0.2, 0], [-0.02, -0.18, 0], [0.17, -0.18, 0], [0.1, -0.13, 0], [0.17, -0.18, 0], [0.1, -0.23, 0]]),
        };
    }, []);
    useEffect(() => () => texture.dispose(), [texture]);
    useEffect(() => () => Object.values(drawings).forEach(geometry => geometry.dispose()), [drawings]);

    useFrame(() => {
        if (!root.current) return;
        const now = performance.now();
        if (!startedAt.current) startedAt.current = now;
        const age = (now - startedAt.current) / 1000;
        if (phase === 'loading' && !shownAt.current && age > 0.28) shownAt.current = now;
        root.current.visible = shownAt.current > 0;
        const opacity = reducedMotion ? 1 : MathUtils.clamp((now - shownAt.current) / 180, 0, 1);
        const readyProgress = phase === 'ready' ? (now - readyAt) / 200 : 0;
        const waitingOpacity = phase === 'ready' ? reducedMotion ? 0 : 1 - MathUtils.clamp(readyProgress * 1.8, 0, 1) : 1;
        const readyOpacity = phase === 'ready' ? reducedMotion ? 1 : MathUtils.clamp((readyProgress - 0.3) / 0.7, 0, 1) : 0;
        if (paperMaterial.current) paperMaterial.current.opacity = opacity;
        setTextOpacity(heading, opacity * waitingOpacity);
        setTextOpacity(subtitle, opacity * waitingOpacity);
        setTextOpacity(readyHeading, opacity * readyOpacity);
        if (hatchMaterial.current) hatchMaterial.current.opacity = opacity * waitingOpacity * 0.7;
        if (arrowMaterial.current) arrowMaterial.current.opacity = opacity * readyOpacity;
        const progress = reducedMotion ? 0.7 : (age * 0.3) % 1;
        drawings.hatches.setDrawRange(0, Math.max(2, Math.floor(progress * 18) * 2));
    });

    return <group ref={root} name="door-loading-tag" position={position} scale={scale} rotation={[0, 0, 0.025]} visible={false} userData={{ phase }}>
        {/* 半透明纸面先绘制，保持各个视角下的文字清楚。 */}
        <mesh name="door-loading-paper" renderOrder={1}>
            <planeGeometry args={[1, 0.75]} />
            <meshBasicMaterial ref={paperMaterial} map={texture} transparent opacity={0} alphaTest={0.015} depthWrite={false} toneMapped={false} />
        </mesh>
        <Suspense fallback={null}>
            <Text ref={heading} characters={CHARACTERS} fontSize={0.172 * textScale} color={INK} anchorX="center" anchorY="middle" position={[0.035, 0.09, 0.004]} renderOrder={2} material-transparent material-opacity={0} material-depthWrite={false} material-toneMapped={false}>正在布置</Text>
            <Text ref={subtitle} characters={CHARACTERS} fontSize={0.135 * textScale} color="#585650" anchorX="center" anchorY="middle" position={[0.035, -0.105, 0.004]} renderOrder={2} material-transparent material-opacity={0} material-depthWrite={false} material-toneMapped={false}>好了就开门</Text>
            <Text ref={readyHeading} characters={CHARACTERS} fontSize={0.26} color={INK} anchorX="center" anchorY="middle" position={[0.025, 0.04, 0.005]} renderOrder={2} material-transparent material-opacity={0} material-depthWrite={false} material-toneMapped={false}>请进</Text>
        </Suspense>
        <lineSegments geometry={drawings.hatches} position={[0.035, -0.245, 0.005]} renderOrder={2}>
            <lineBasicMaterial ref={hatchMaterial} color={INK} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </lineSegments>
        <line geometry={drawings.arrow} position={[0.025, 0, 0.006]} renderOrder={2}>
            <lineBasicMaterial ref={arrowMaterial} color={INK} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </line>
    </group>;
}
