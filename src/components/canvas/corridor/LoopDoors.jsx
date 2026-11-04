import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

/**
 * LoopDoors 循环门组件。
 * 
 * 走廊尽头的双开门在相机靠近时自动打开，
 * 营造无限循环的错觉。
 */
const LoopDoors = ({
    position = [0, 0, -70],
    corridorHeight = 3.5,
    onLoopTriggered
}) => {
    const leftDoorRef = useRef();
    const isOpenRef = useRef(false);
    const hasTriggeredRef = useRef(false);
    const { camera } = useThree();

    const doorWidth = 1.2;
    const doorHeight = corridorHeight - 0.4;
    const triggerDistance = 8; // 相机到达此距离时开始开门。
    const loopDistance = 3; // 相机到达此距离时触发循环。

    // 检查相机距离并触发动画。
    useFrame(() => {
        if (!leftDoorRef.current || !rightDoorRef.current) return;

        const distance = camera.position.z - position[2];

        // 靠近时开始开门。
        if (distance < triggerDistance && distance > loopDistance && !isOpenRef.current) {
            isOpenRef.current = true;

            // 向外打开双门。
            gsap.to(leftDoorRef.current.rotation, {
                y: -Math.PI * 0.6,
                duration: 1.2,
                ease: 'power2.out'
            });
            gsap.to(rightDoorRef.current.rotation, {
                y: Math.PI * 0.6,
                duration: 1.2,
                ease: 'power2.out'
            });
        }

        // 非常接近时触发循环。
        if (distance < loopDistance && !hasTriggeredRef.current && isOpenRef.current) {
            hasTriggeredRef.current = true;
            onLoopTriggered?.();

            // 循环后重置。
            setTimeout(() => {
                hasTriggeredRef.current = false;
                isOpenRef.current = false;

                // 立即关门，循环后它们又位于尽头。
                if (leftDoorRef.current && rightDoorRef.current) {
                    leftDoorRef.current.rotation.y = 0;
                    rightDoorRef.current.rotation.y = 0;
                }
            }, 500);
        }
    });

    return (
        <group position={position}>
            {/* 门框。 */}
            <mesh position={[0, doorHeight / 2 + 0.15, 0]}>
                <boxGeometry args={[doorWidth * 2 + 0.3, 0.15, 0.15]} />
                <meshBasicMaterial color="#2a2a2a" />
            </mesh>

            {/* 左门框。 */}
            <mesh position={[-doorWidth - 0.08, 0, 0]}>
                <boxGeometry args={[0.12, doorHeight + 0.3, 0.15]} />
                <meshBasicMaterial color="#2a2a2a" />
            </mesh>

            {/* 右门框。 */}
            <mesh position={[doorWidth + 0.08, 0, 0]}>
                <boxGeometry args={[0.12, doorHeight + 0.3, 0.15]} />
                <meshBasicMaterial color="#2a2a2a" />
            </mesh>

            {/* 左门围绕左边缘旋转。 */}
            <group
                ref={leftDoorRef}
                position={[-doorWidth, 0, 0]}
            >
                <mesh position={[doorWidth / 2, 0, 0.05]}>
                    <boxGeometry args={[doorWidth, doorHeight, 0.08]} />
                    <meshBasicMaterial color="#f0ebe0" roughness={0.9} />
                </mesh>

                {/* 门板细节。 */}
                <mesh position={[doorWidth / 2, 0.3, 0.1]}>
                    <planeGeometry args={[doorWidth * 0.7, doorHeight * 0.35]} />
                    <meshBasicMaterial color="#e8e3d8" roughness={1} />
                </mesh>
                <mesh position={[doorWidth / 2, -0.4, 0.1]}>
                    <planeGeometry args={[doorWidth * 0.7, doorHeight * 0.35]} />
                    <meshBasicMaterial color="#e8e3d8" roughness={1} />
                </mesh>

                {/* 把手。 */}
                <mesh position={[doorWidth - 0.15, 0, 0.12]}>
                    <sphereGeometry args={[0.05, 12, 12]} />
                    <meshBasicMaterial color="#333" metalness={0.6} roughness={0.3} />
                </mesh>
            </group>

            {/* 右门围绕右边缘旋转。 */}
            <group
                ref={rightDoorRef}
                position={[doorWidth, 0, 0]}
            >
                <mesh position={[-doorWidth / 2, 0, 0.05]}>
                    <boxGeometry args={[doorWidth, doorHeight, 0.08]} />
                    <meshBasicMaterial color="#f0ebe0" roughness={0.9} />
                </mesh>

                {/* 门板细节。 */}
                <mesh position={[-doorWidth / 2, 0.3, 0.1]}>
                    <planeGeometry args={[doorWidth * 0.7, doorHeight * 0.35]} />
                    <meshBasicMaterial color="#e8e3d8" roughness={1} />
                </mesh>
                <mesh position={[-doorWidth / 2, -0.4, 0.1]}>
                    <planeGeometry args={[doorWidth * 0.7, doorHeight * 0.35]} />
                    <meshBasicMaterial color="#e8e3d8" roughness={1} />
                </mesh>

                {/* 把手。 */}
                <mesh position={[-doorWidth + 0.15, 0, 0.12]}>
                    <sphereGeometry args={[0.05, 12, 12]} />
                    <meshBasicMaterial color="#333" metalness={0.6} roughness={0.3} />
                </mesh>
            </group>

            {/* 门上方灯光，已禁用。 */}
            {/* <pointLight
                position={[0, 1.5, 1]}
                intensity={0.8}
                color="#fff8e0"
                distance={8}
                decay={2}
            /> */}
        </group>
    );
};

export default LoopDoors;
