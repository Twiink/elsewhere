import { useMemo, useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 可用云纹理。
const CLOUD_TEXTURES = [
    'https://media.secknow-ai.com/space/textures/clouds/1131c3eb-dfae-423f-924b-ff39d8ccd6dc.png',
    'https://media.secknow-ai.com/space/textures/clouds/254b8ec8-d6f7-4275-956f-7bab65b2ce2d.png',
    'https://media.secknow-ai.com/space/textures/clouds/2cc88dd1-483c-466d-b07e-f8308c61ccbe.png?imageMogr2/thumbnail/512x128',
    'https://media.secknow-ai.com/space/textures/clouds/5606fcc0-3252-447d-a58a-7bcbac73229a.png?imageMogr2/thumbnail/512x256',
    'https://media.secknow-ai.com/space/textures/clouds/7882dc72-3d01-41fb-ac0e-d07b0184ebc1.png?imageMogr2/thumbnail/256x256',
    'https://media.secknow-ai.com/space/textures/clouds/9b2ca72f-7bd0-473b-ba6e-dd9e0eb79d35.png',
    'https://media.secknow-ai.com/space/textures/clouds/c83293c6-d90c-4a32-8d9d-5ac9af7e2296.png?imageMogr2/thumbnail/512x128',
    'https://media.secknow-ai.com/space/textures/clouds/f6e358bc-d27c-41dd-95f4-6787a835c41e.png',
];

/**
 * GalleryClouds 画廊云层组件。
 * 随机分布在画廊上方的云层。
 */
const GalleryClouds = ({ count = 12, seed = 42, rotationOffset = [0, -Math.PI / 3, 0] }) => {
    // 移动边界必须与 StaticCloud 一致。
    const startX = 40;
    const endX = -40;
    const totalDistance = startX - endX;

    const clouds = useMemo(() => {
        const items = [];
        const random = seededRandom(seed);

        for (let i = 0; i < count; i++) {
            const y = 6 + random() * 8; // 位于高处。
            const z = -5 - random() * 30; // 深度变化。
            const driftSpeed = 0.1 + random() * 0.15;

            // 为各朵云均匀设置偏移，覆盖整个宽度。
            // 每朵云从不同 X 位置开始。
            const initialOffset = (i / count) * totalDistance + random() * 3;

            // 计算初始 X，模拟云已在移动。
            const initialX = startX - (initialOffset % (totalDistance + 10)) + 5;

            items.push({
                id: i,
                position: [initialX, y, z],  // 位置已计算。
                scale: 0.5 + random() * 1.2,
                opacity: 0.4 + random() * 0.3,
                textureIndex: Math.floor(random() * CLOUD_TEXTURES.length),
                driftSpeed: driftSpeed,
                initialOffset: initialOffset,  // 保存动画偏移。
            });
        }

        return items;
    }, [count, seed, totalDistance]);

    return (
        <group>
            {clouds.map((cloud) => (
                <StaticCloud
                    key={cloud.id}
                    position={cloud.position}
                    scale={cloud.scale}
                    opacity={cloud.opacity}
                    textureIndex={cloud.textureIndex}
                    driftSpeed={cloud.driftSpeed}
                    initialOffset={cloud.initialOffset}
                    rotationOffset={rotationOffset}
                />
            ))}
        </group>
    );
};

// 持续漂移、始终朝向相机的云组件。
const StaticCloud = ({ position, scale, opacity, textureIndex, driftSpeed, initialOffset, rotationOffset }) => {
    const meshRef = useRef();
    const basePosition = useRef(position);

    // 移动边界。
    const startX = 40;  // 从右侧开始。
    const endX = -40;   // 从左侧离开。
    const totalDistance = startX - endX;

    // 加载指定云纹理。
    const texture = useLoader(THREE.TextureLoader, CLOUD_TEXTURES[textureIndex]);

    // 使用原始宽高比，防止二次幂尺寸转换后拉伸。
    const legacyCloudAspects = {
        '1131c3eb-dfae-423f-924b-ff39d8ccd6dc.png': 1.894,
        '254b8ec8-d6f7-4275-956f-7bab65b2ce2d.png': 2.459,
        '2cc88dd1-483c-466d-b07e-f8308c61ccbe.png': 3.577,
        '5606fcc0-3252-447d-a58a-7bcbac73229a.png': 1.794,
        '7882dc72-3d01-41fb-ac0e-d07b0184ebc1.png': 1.997,
        '9b2ca72f-7bd0-473b-ba6e-dd9e0eb79d35.png': 1.905,
        'c83293c6-d90c-4a32-8d9d-5ac9af7e2296.png': 3,
        'f6e358bc-d27c-41dd-95f4-6787a835c41e.png': 1.875
    };

    const cloudFile = new URL(CLOUD_TEXTURES[textureIndex]).pathname.split('/').pop();
    const aspectRatio = legacyCloudAspects[cloudFile] || 1.8;
    const width = 2.5 * scale;
    const height = width / aspectRatio;

    useFrame(({ camera, clock }) => {
        if (!meshRef.current) return;

        // 从右向左匀速移动并循环。
        // initialOffset 保证每朵云从不同位置开始。
        const time = clock.getElapsedTime();
        const progress = ((time * driftSpeed + initialOffset) % (totalDistance + 10)) - 5;
        const currentX = startX - progress;

        meshRef.current.position.x = currentX;
        meshRef.current.position.y = basePosition.current[1];
        meshRef.current.position.z = basePosition.current[2];

        // 广告牌效果：始终朝向相机，并应用旋转偏移。
        const offsetRotation = new THREE.Euler(rotationOffset[0], rotationOffset[1], rotationOffset[2]);
        const offsetQuaternion = new THREE.Quaternion().setFromEuler(offsetRotation);
        meshRef.current.quaternion.copy(camera.quaternion).multiply(offsetQuaternion);
    });

    return (
        <mesh ref={meshRef} position={position}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial color="#e0e0e0"
                map={texture}
                transparent
                opacity={opacity}
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

export default GalleryClouds;
