import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * useScrollCamera 滚动相机 Hook。
 * 
 * 根据滚动沿 Z 轴移动相机。
 * 走廊范围从起点 z=8 至内部 z=-15。
 * 用户可接近人物、穿过人物并继续沿走廊前进。
 */
const useScrollCamera = ({
    minZ = 8,
    maxZ = -15,
    speed = 0.03,
    smoothing = 0.08
} = {}) => {
    const { camera } = useThree();
    const targetZ = useRef(minZ);
    const currentZ = useRef(minZ);

    // 处理滚轮事件。
    const handleWheel = useCallback((e) => {
        e.preventDefault();

        // 向下滚动即向前，Z 减小。
        const delta = e.deltaY * speed;
        targetZ.current = THREE.MathUtils.clamp(
            targetZ.current - delta,
            maxZ,
            minZ
        );
    }, [speed, minZ, maxZ]);

    // 添加滚轮监听。
    useEffect(() => {
        // 监听 window，覆盖整个页面。
        window.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            window.removeEventListener('wheel', handleWheel);
        };
    }, [handleWheel]);

    // 使用线性插值平滑移动相机。
    useFrame(() => {
        currentZ.current = THREE.MathUtils.lerp(
            currentZ.current,
            targetZ.current,
            smoothing
        );

        camera.position.z = currentZ.current;
    });

    // 返回进度供外部使用，0 为起点，1 为终点。
    const getProgress = useCallback(() => {
        return (minZ - currentZ.current) / (minZ - maxZ);
    }, [minZ, maxZ]);

    return { getProgress };
};

export default useScrollCamera;
