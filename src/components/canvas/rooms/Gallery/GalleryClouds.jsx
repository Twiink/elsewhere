import { MediaTextureLoader } from '../../../../media/MediaTextureLoader';
import { useMemo, useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cloudGeometry } from '../cloudResources';

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
    const aspectRatio = cloudAspects[cloudFile] || 1.8;
    const width = 2.5 * scale;
    const height = width / aspectRatio;
    const [rotationX, rotationY, rotationZ] = rotationOffset;
    const offsetQuaternion = useMemo(() => new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rotationX, rotationY, rotationZ)
    ), [rotationX, rotationY, rotationZ]);

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
        meshRef.current.quaternion.copy(camera.quaternion).multiply(offsetQuaternion);
    });

    return (
        <mesh ref={meshRef} geometry={cloudGeometry} position={position} scale={[width, height, 1]}>
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
