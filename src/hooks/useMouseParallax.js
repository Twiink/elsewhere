import { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * useMouseParallax 鼠标视差 Hook。
 * 
 * 相机随鼠标移动，营造环顾房间的效果。
 * 鼠标向右则相机右移，鼠标向上则相机上移。
 */
const useMouseParallax = ({
    intensity = 0.5,
    smoothing = 0.05
} = {}) => {
    const { camera } = useThree();
    const mouse = useRef({ x: 0, y: 0 });
    const target = useRef({ x: 0, y: 0 });
    const basePosition = useRef({ x: 0, y: 0.2 }); // 保存初始相机 X、Y。

    useEffect(() => {
        basePosition.current = { x: camera.position.x, y: camera.position.y };

        const handleMouseMove = (e) => {
            // 将鼠标位置归一化至 -1..1。
            mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1); // 反转 Y。
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [camera]);

    useFrame(() => {
        // 朝鼠标位置平滑插值。
        target.current.x = THREE.MathUtils.lerp(
            target.current.x,
            mouse.current.x * intensity,
            smoothing
        );
        target.current.y = THREE.MathUtils.lerp(
            target.current.y,
            mouse.current.y * intensity * 0.6, // 减少竖向位移。
            smoothing
        );

        // 应用到相机位置。
        camera.position.x = basePosition.current.x + target.current.x;
        camera.position.y = basePosition.current.y + target.current.y;

        // 相机略微看向中心，营造自然感。
        camera.lookAt(0, 0, 0);
    });

    return { mouse: mouse.current, target: target.current };
};

export default useMouseParallax;
