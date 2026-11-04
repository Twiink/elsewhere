import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';

/**
 * useParallax 视差 Hook。
 * 
 * 跟踪鼠标与设备方向，生成视差效果。
 * 返回 X、Y 轴 -1..1 的归一化值。
 * 
 * @param {Object} options - 配置选项。
 * @param {number} options.sensitivity - 鼠标移动灵敏度。
 * @param {number} options.smoothing - 插值平滑度。
 * @param {boolean} options.enableDeviceOrientation - 是否启用移动端设备方向。
 */
const useParallax = ({
    sensitivity = 0.5,
    smoothing = 0.1,
    enableDeviceOrientation = true
} = {}) => {
    const [parallax, setParallax] = useState({ x: 0, y: 0 });
    const targetRef = useRef({ x: 0, y: 0 });
    const currentRef = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef();

    // 处理鼠标移动。
    const handleMouseMove = useCallback((e) => {
        // 归一化至 -1..1 范围。
        const x = ((e.clientX / window.innerWidth) * 2 - 1) * sensitivity;
        const y = ((e.clientY / window.innerHeight) * 2 - 1) * sensitivity;

        targetRef.current = { x, y };
    }, [sensitivity]);

    // 处理移动端设备方向。
    const handleDeviceOrientation = useCallback((e) => {
        if (!e.gamma || !e.beta) return;

        // gamma：左右倾斜，范围 -90 至 90。
        // beta：前后倾斜，范围 -180 至 180。
        const x = THREE.MathUtils.clamp(e.gamma / 45, -1, 1) * sensitivity;
        const y = THREE.MathUtils.clamp((e.beta - 45) / 45, -1, 1) * sensitivity;

        targetRef.current = { x, y };
    }, [sensitivity]);

    // 平滑插值动画循环。
    useEffect(() => {
        const animate = () => {
            // 将当前值线性插值至目标值。
            currentRef.current.x = THREE.MathUtils.lerp(
                currentRef.current.x,
                targetRef.current.x,
                smoothing
            );
            currentRef.current.y = THREE.MathUtils.lerp(
                currentRef.current.y,
                targetRef.current.y,
                smoothing
            );

            // 批量更新状态，减少开销。
            setParallax({
                x: currentRef.current.x,
                y: currentRef.current.y
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [smoothing]);

    // 注册事件监听。
    useEffect(() => {
        // 桌面端鼠标移动。
        window.addEventListener('mousemove', handleMouseMove);

        // 移动端设备方向，需支持且已启用。
        let orientationSupported = false;

        if (enableDeviceOrientation && window.DeviceOrientationEvent) {
            // 检查是否需请求 iOS 13 及以上权限。
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                // 权限需由用户手势触发请求。
                // 当前跳过，使用鼠标与触摸作为回退。
            } else {
                window.addEventListener('deviceorientation', handleDeviceOrientation);
                orientationSupported = true;
            }
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (orientationSupported) {
                window.removeEventListener('deviceorientation', handleDeviceOrientation);
            }
        };
    }, [handleMouseMove, handleDeviceOrientation, enableDeviceOrientation]);

    return parallax;
};

export default useParallax;
