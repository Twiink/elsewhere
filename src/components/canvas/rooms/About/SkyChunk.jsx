import { MediaTextureLoader } from '../../../../media/MediaTextureLoader';
import { useMemo, useRef } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { cloudGeometry } from '../cloudResources';
import { usePerformance } from '../../../../context/contexts';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import SceneParallax from '../../atmosphere/SceneParallax';

const CLOUD_ROTATION = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 3, 0));

/**
 * SkyChunk 天空分块组件。
 * 
 * 带云层的可重复天空分段。
 * 按世界空间硬裁切，不使用相机相对淡出。
 */
const CHUNK_LENGTH = 40;
const CHUNK_WIDTH = 20;
const CHUNK_HEIGHT = 12;

// 世界空间中的硬裁切边界。
// 关于我房间位于 Z=-25，对应 AboutRoom.jsx 中的组位置。
// 世界 Z > CORRIDOR_CLIP_Z 的内容立即隐藏。
const CORRIDOR_CLIP_Z = -8.0;

// 固定房间世界坐标，因为 AboutRoom 的 position=[0,0,-25]。
const ROOM_Z = -25;

// 可用云纹理。
const CLOUD_TEXTURES = [
    '/media/images/textures/clouds/cloud-rounded-bold.webp',
    '/media/images/textures/clouds/cloud-flat-bottom-bold.webp',
    '/media/images/textures/clouds/cloud-wide-sketch.webp',
    '/media/images/textures/clouds/cloud-rounded-sketch.webp',
    '/media/images/textures/clouds/cloud-tall-sketch.webp',
    '/media/images/textures/clouds/cloud-puffy-bold.webp',
    '/media/images/textures/clouds/cloud-horizon-sketch.webp',
    '/media/images/textures/clouds/cloud-soft-bold.webp',
];

const SkyChunk = ({ chunkIndex = 0, seed = 0, scrollProgressRef }) => {
    const { settings } = usePerformance();
    const reducedMotion = useReducedMotion();
    const zOffset = -(chunkIndex * CHUNK_LENGTH) - 15;

    const clouds = useMemo(() => {
        const items = [];
        const random = seededRandom(seed + chunkIndex * 1000);
        const cloudCount = Math.max(6, Math.ceil((15 + Math.floor(random() * 8)) * settings.cloudDensity));

        for (let i = 0; i < cloudCount; i++) {
            const x = (random() - 0.5) * CHUNK_WIDTH;
            const y = (random() - 0.5) * CHUNK_HEIGHT;
            const z = zOffset - (random() * CHUNK_LENGTH);

            items.push({
                id: `${chunkIndex}-${i}`,
                position: [x, y, z],
                scale: 0.8 + random() * 1.5,
                baseOpacity: 0.5 + random() * 0.4,
                textureIndex: Math.floor(random() * CLOUD_TEXTURES.length),
                // 每朵云独立的动画属性。
                driftSpeed: 0.3 + random() * 0.4,  // 摆动速度。
                driftAmount: 0.5 + random() * 1.0, // X 方向摆动幅度。
                bobAmount: 0.1 + random() * 0.2,   // 竖向浮动幅度。
                timeOffset: random() * Math.PI * 2, // 相位偏移，避免所有云同步运动。
            });
        }

        return items;
    }, [chunkIndex, seed, zOffset, settings.cloudDensity]);

    return (
        <SceneParallax room="about" strength={0.22}>
            {clouds.map((cloud) => (
                <Cloud
                    key={cloud.id}
                    position={cloud.position}
                    scale={cloud.scale}
                    baseOpacity={cloud.baseOpacity}
                    textureIndex={cloud.textureIndex}
                    driftSpeed={cloud.driftSpeed}
                    driftAmount={cloud.driftAmount}
                    bobAmount={cloud.bobAmount}
                    timeOffset={cloud.timeOffset}
                    scrollProgressRef={scrollProgressRef}
                    reducedMotion={reducedMotion}
                    detailDistance={settings.detailDistance}
                    animationFps={settings.animationFps}
                />
            ))}
        </SceneParallax>
    );
};

// 带世界空间硬裁切和漂移动画的云。
const Cloud = ({
    position,
    scale,
    baseOpacity,
    textureIndex,
    driftSpeed = 0.5,
    driftAmount = 0.8,
    bobAmount = 0.15,
    timeOffset = 0,
    scrollProgressRef,
    reducedMotion,
    detailDistance,
    animationFps
}) => {
    const meshRef = useRef();
    const materialRef = useRef();
    const nextUpdate = useRef(0);
    const world = useMemo(() => new THREE.Vector3(), []);
    const { camera } = useThree();

    // 保存动画基础位置。
    const basePosition = useRef(position);

    // 加载指定云纹理。
    const texture = useLoader(MediaTextureLoader, CLOUD_TEXTURES[textureIndex]);

    // 使用原始宽高比，防止二次幂尺寸转换后拉伸。
    const cloudAspects = {
        'cloud-rounded-bold.webp': 1.894,
        'cloud-flat-bottom-bold.webp': 2.459,
        'cloud-wide-sketch.webp': 3.577,
        'cloud-rounded-sketch.webp': 1.794,
        'cloud-tall-sketch.webp': 1.997,
        'cloud-puffy-bold.webp': 1.905,
        'cloud-horizon-sketch.webp': 3,
        'cloud-soft-bold.webp': 1.875
    };

    const cloudFile = CLOUD_TEXTURES[textureIndex].split('/').pop();
    const aspectRatio = cloudAspects[cloudFile] || 1.8; // 默认使用通用比例。
    const width = 3 * scale;
    const height = width / aspectRatio;

    useFrame((state) => {
        if (!meshRef.current) return;
        if (state.clock.elapsedTime < nextUpdate.current) return;
        nextUpdate.current = state.clock.elapsedTime + 1 / animationFps;

        const time = reducedMotion ? 0 : state.clock.elapsedTime;

        // 硬裁切线，手动计算世界 Z。
        // 世界 Z = 房间位置 -25 + scrollProgress + 云的局部位置。
        // 不使用 getWorldPosition()，因为子组件的 useFrame 先于父组件执行。
        const scrollProgress = scrollProgressRef?.current || 0;
        const cloudLocalZ = basePosition.current[2];
        const worldZ = ROOM_Z + scrollProgress + cloudLocalZ;
        const distance = world.setFromMatrixPosition(meshRef.current.matrixWorld).distanceTo(camera.position);
        meshRef.current.visible = worldZ <= CORRIDOR_CLIP_Z && distance < detailDistance;
        if (!meshRef.current.visible) return;

        // 云的避让效果。
        // 靠近相机时向两侧移动，保持中央视野清晰。
        const evasionStart = -60;
        const evasionEnd = -10;
        let evasionFactor = 0;

        if (worldZ > evasionStart && worldZ < evasionEnd) {
            evasionFactor = (worldZ - evasionStart) / (evasionEnd - evasionStart);
            // 使用 smoothstep 自然缓入缓出。
            evasionFactor = evasionFactor * evasionFactor * (3 - 2 * evasionFactor);
        } else if (worldZ >= evasionEnd) {
            evasionFactor = 1;
        }

        // 按初始 X 位置向左右推开，腾出中间空间。
        const dirX = basePosition.current[0] >= 0 ? 1 : -1;
        const maxEvasion = 15;
        const evasionX = evasionFactor * maxEvasion * dirX;

        // 漂移动画。
        const driftX = Math.sin(time * driftSpeed + timeOffset) * driftAmount;
        const driftY = Math.sin(time * driftSpeed * 0.7 + timeOffset + 1.5) * bobAmount;

        // 将漂移和避让叠加到位置。
        meshRef.current.position.x = basePosition.current[0] + driftX + evasionX;
        meshRef.current.position.y = basePosition.current[1] + driftY;
        meshRef.current.position.z = basePosition.current[2];

        // 云越过裁切线后立即隐藏。
        if (materialRef.current) {
            materialRef.current.opacity = baseOpacity * (1 - THREE.MathUtils.smoothstep(distance, detailDistance * 0.7, detailDistance));
        }

        // 广告牌效果：始终朝向相机，再向左旋转 90°。
        meshRef.current.quaternion.copy(camera.quaternion).multiply(CLOUD_ROTATION);
    });

    return (
        <mesh ref={meshRef} geometry={cloudGeometry} position={position} scale={[width, height, 1]}>
            <meshBasicMaterial color="#e0e0e0"
                ref={materialRef}
                map={texture}
                transparent
                opacity={baseOpacity}
                depthWrite={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

function seededRandom(seed) {
    let s = seed;
    return function () {
        s = Math.sin(s * 9999) * 10000;
        return s - Math.floor(s);
    };
}

export { CHUNK_LENGTH, CORRIDOR_CLIP_Z, ROOM_Z };
export default SkyChunk;
