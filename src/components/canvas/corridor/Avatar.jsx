import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Avatar：手绘速写风格人物组件。
 * 
 * 速写人物的视觉效果：
 * - 随滚动产生景深视差。
 * - 手绘线条与入口风格一致。
 * - 相机靠近时躲避。
 * - 挥手线稿配合轻微的身体摆动。
 */
const Avatar = ({ position = [10, -20, 30], height = 2.3 }) => {
    const meshRef = useRef();
    const groupRef = useRef();
    const { camera } = useThree();

    // 躲避状态。
    const dodgeX = useRef(0);
    const targetDodgeX = useRef(0);
    const worldPosVec = useRef(new THREE.Vector3());

    const texture = useTexture('/textures/twiink/waving-ink.webp');
    const width = height * texture.image.width / texture.image.height;

    // 主动画循环。
    useFrame((state) => {
        if (!groupRef.current || !meshRef.current) return;

        // 躲避逻辑。
        groupRef.current.getWorldPosition(worldPosVec.current);
        const distance = camera.position.z - worldPosVec.current.z;

        const DODGE_START = 3;
        const DODGE_PEAK = 0;
        const DODGE_END = -2;
        const DODGE_AMOUNT = -1.5;

        if (distance > DODGE_PEAK && distance < DODGE_START) {
            const t = (DODGE_START - distance) / (DODGE_START - DODGE_PEAK);
            targetDodgeX.current = DODGE_AMOUNT * easeOutQuad(t);
        } else if (distance <= DODGE_PEAK && distance > DODGE_END) {
            const t = (distance - DODGE_END) / (DODGE_PEAK - DODGE_END);
            targetDodgeX.current = DODGE_AMOUNT * easeOutQuad(t);
        } else {
            targetDodgeX.current = 0;
        }

        dodgeX.current = THREE.MathUtils.lerp(dodgeX.current, targetDodgeX.current, 0.08);

        groupRef.current.position.x = position[0] + dodgeX.current;
        groupRef.current.position.y = position[1];

        meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.2) * 0.012;
    });

    return (
        <group ref={groupRef} position={position}>
            <mesh ref={meshRef}>
                <planeGeometry args={[width, height]} />
                <meshBasicMaterial color="#ffffff"
                    map={texture}
                    transparent={true}
                    alphaTest={0.1}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
};

// 缓动函数。
const easeOutQuad = (t) => t * (2 - t);

export default Avatar;
