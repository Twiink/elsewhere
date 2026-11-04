import { useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { Observer } from 'gsap/all';

gsap.registerPlugin(Observer);
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAchievements } from '../context/AchievementsContext';

// 用于自动侧看的门位置。
const DOOR_POSITIONS = [
    { z: -18, side: 'left' },
    { z: -32, side: 'right' },
    { z: -48, side: 'left' },
    { z: -62, side: 'right' },
];

/**
 * useInfiniteCamera 相机 Hook。
 * 
 * 禁用时完全不修改相机，允许 GSAP 控制。
 * 启用时通过滚动与视差接管相机。
 * 支持桌面鼠标、滚轮以及移动端触摸、陀螺仪。
 */
const useInfiniteCamera = ({
    segmentLength = 80,
    scrollSpeed = 0.02,
    parallaxIntensity = 0.3,
    smoothing = 0.035, // 数值越低，减速越慢，体验越平滑。
    glanceIntensity = 0.15,
    scrollEnabled = true,
    parallaxEnabled = true
} = {}) => {
    const { camera } = useThree();

    // 相机跟踪。
    const targetZ = useRef(28);
    const currentZ = useRef(28);
    const parallax = useRef({ x: 0, y: 0 });
    const targetParallax = useRef({ x: 0, y: 0 });
    const glanceOffset = useRef(0);
    const targetGlance = useRef(0); // 用于门悬停侧看。
    const currentSegment = useRef(0);
    const scrollEnabledRef = useRef(scrollEnabled);
    const parallaxEnabledRef = useRef(parallaxEnabled);
    const justEnabled = useRef(false);
    const { unlockAchievement } = useAchievements();

    // 移动端触摸跟踪。
    const touchStart = useRef({ x: 0, y: 0 });
    const swipeGlance = useRef(0); // 通过水平滑动旋转相机。
    const targetSwipeGlance = useRef(0);
    const useGyroscope = useRef(false);

    // 相机接管为 true 时，由 DoorSection 等外部代码控制。
    const cameraOverride = useRef(false);
    // 重新启用后跳过首帧，防止相机跳变。
    const skipFrameAfterEnable = useRef(false);
    // 平滑混合计数器，表示从保存旋转过渡的剩余帧数。
    const blendInFrames = useRef(0);
    const savedRotation = useRef({ x: 0, y: 0, z: 0 });

    // 滑动侧看限制，单位为弧度，左右各约 15°。
    const MAX_SWIPE_GLANCE = 0.26;

    // 保存最近鼠标位置，归一化至 -1..1。
    const lastMousePos = useRef({ x: 0, y: 0 });

    // 更新启用状态引用。
    useLayoutEffect(() => {
        const wasScrollEnabled = scrollEnabledRef.current;
        scrollEnabledRef.current = scrollEnabled;
        parallaxEnabledRef.current = parallaxEnabled;

        // 滚动启用时同步当前相机位置。
        if (scrollEnabled && !wasScrollEnabled) {
            // 终止 GSAP 动画，防止残留入口动画干扰。
            gsap.killTweensOf(camera.position);
            gsap.killTweensOf(camera.rotation);
            gsap.killTweensOf(camera.savedState); // 额外保险。

            justEnabled.current = true;

            // 保存当前相机旋转，以便平滑混合。
            // 避免立即调用 lookAt() 导致相机跳变。
            savedRotation.current = {
                x: camera.rotation.x,
                y: camera.rotation.y,
                z: camera.rotation.z
            };

            // 开始 30 帧的混合阶段，60fps 下约 0.5 秒。
            blendInFrames.current = 30;

            targetZ.current = camera.position.z;
            currentZ.current = camera.position.z;

            // 仅在刚启用时按当前相机位置同步视差。
            // 防止成就更新导致组件变化时视角跳变。
            if (!wasScrollEnabled) {
                parallax.current = { x: camera.position.x, y: camera.position.y - 0.2 };
                targetParallax.current = { x: camera.position.x, y: camera.position.y - 0.2 };
            }

            // 根据当前位置正确初始化 glanceOffset。
            // 靠近门时立即保持看门方向，避免先看前方再转头。
            const initialGlance = calculateGlance(currentZ.current, Math.floor((10 - currentZ.current) / segmentLength));
            glanceOffset.current = initialGlance;
            targetGlance.current = initialGlance;

            // 重置移动端滑动侧看。
            swipeGlance.current = 0;
            targetSwipeGlance.current = 0;

            // 重新计算分段。
            currentSegment.current = Math.floor((10 - currentZ.current) / segmentLength);
        }
    }, [scrollEnabled, parallaxEnabled, camera, parallaxIntensity]);

    // 处理桌面滚轮滚动。
    const handleWheel = useCallback((e) => {
        if (!scrollEnabledRef.current) return;

        e.preventDefault();
        const delta = e.deltaY * scrollSpeed;
        targetZ.current -= delta;
        unlockAchievement('corridor_explore');
    }, [scrollSpeed, unlockAchievement]);

    // 处理键盘无障碍导航。
    const handleKeyDown = useCallback((e) => {
        if (!scrollEnabledRef.current) return;

        // 用户在输入框或文本域打字时不干扰。
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        const keyScrollMap = {
            'ArrowDown': 100,
            'ArrowUp': -100,
            'PageDown': 400,
            'PageUp': -400,
            ' ': 200,           // 空格键。
        };

        const delta = keyScrollMap[e.key];
        if (delta !== undefined) {
            e.preventDefault();
            targetZ.current -= delta * scrollSpeed;
            unlockAchievement('corridor_explore');
        }

        // 左右方向键使相机轻微侧看。
        if (parallaxEnabledRef.current) {
            if (e.key === 'ArrowLeft') {
                targetSwipeGlance.current = Math.max(-MAX_SWIPE_GLANCE, targetSwipeGlance.current - 0.08);
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                targetSwipeGlance.current = Math.min(MAX_SWIPE_GLANCE, targetSwipeGlance.current + 0.08);
                e.preventDefault();
            }
        }
    }, [scrollSpeed, MAX_SWIPE_GLANCE, unlockAchievement]);

    // 桌面鼠标视差始终跟踪鼠标位置，
    // 但仅启用时应用于 targetParallax。
    const handleMouseMove = useCallback((e) => {
        // 持续跟踪鼠标，启用时可平滑过渡。
        const normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
        const normalizedY = (e.clientY / window.innerHeight) * 2 - 1;
        lastMousePos.current = { x: normalizedX, y: normalizedY };

        // 仅在启用时应用视差。
        if (!parallaxEnabledRef.current) return;

        targetParallax.current.x = normalizedX * parallaxIntensity;
        targetParallax.current.y = -normalizedY * parallaxIntensity * 0.5;
    }, [parallaxIntensity]);

    // 处理移动端触摸开始。
    const handleTouchStart = useCallback((e) => {
        // 始终记录触摸起点，供可能的视差使用。
        touchStart.current.x = e.touches[0].clientX;
        touchStart.current.y = e.touches[0].clientY;
    }, []);

    // 处理移动端触摸移动，包括滚动与横向侧看。
    const handleTouchMove = useCallback((e) => {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        // 仅在滚动启用时处理竖向滚动。
        if (scrollEnabledRef.current) {
            const deltaY = (touchStart.current.y - currentY) * scrollSpeed * 1.5;
            targetZ.current -= deltaY;
            unlockAchievement('corridor_explore');
        }

        // 水平滑动转换为相机侧看，需启用视差。
        if (parallaxEnabledRef.current) {
            const deltaX = (touchStart.current.x - currentX) * 0.003; // 较小的倍率。
            targetSwipeGlance.current += deltaX;

            // 限制在 ±15°。
            targetSwipeGlance.current = Math.max(-MAX_SWIPE_GLANCE, Math.min(MAX_SWIPE_GLANCE, targetSwipeGlance.current));
        }

        touchStart.current.x = currentX;
        touchStart.current.y = currentY;
    }, [scrollSpeed, MAX_SWIPE_GLANCE]);

    // 处理设备方向，用移动端陀螺仪产生视差。
    const handleDeviceOrientation = useCallback((e) => {
        if (!parallaxEnabledRef.current || !useGyroscope.current) return;

        // 桌面浏览器注册监听后可能立即触发空值事件。
        if (e.gamma === null && e.beta === null) return;

        // gamma：左右倾斜，范围 -90 至 90。
        // beta：前后倾斜，范围 -180 至 180；45 约为自然持机角度。
        const gamma = e.gamma || 0;
        const beta = e.beta || 0;

        // 限制范围并转换为视差。
        const clampedGamma = Math.max(-45, Math.min(45, gamma));
        const clampedBeta = Math.max(0, Math.min(90, beta)) - 45; // 以 45° 为中心。

        targetParallax.current.x = (clampedGamma / 45) * parallaxIntensity;
        targetParallax.current.y = -(clampedBeta / 45) * parallaxIntensity * 0.5;
    }, [parallaxIntensity]);

    // 请求 iOS 13 及以上版本的陀螺仪权限。
    const requestGyroscopePermission = useCallback(async () => {
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    useGyroscope.current = true;
                    window.addEventListener('deviceorientation', handleDeviceOrientation);
                }
            } catch (error) {
                // console.log('陀螺仪权限被拒绝');
            }
        } else {
            // 非 iOS 或旧浏览器直接添加监听。
            useGyroscope.current = true;
            window.addEventListener('deviceorientation', handleDeviceOrientation);
        }
    }, [handleDeviceOrientation]);

    // 手动 doorHover 监听已移除，改为 useFrame 自动侧看。

    useEffect(() => {
        // 桌面端非滚动事件。
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('keydown', handleKeyDown);

        // 使用 GSAP Observer 统一处理滚动与触摸。
        const scrollObserver = Observer.create({
            target: window,
            type: "wheel,touch,pointer",
            onWheel: (e) => {
                handleWheel(e.event);
            },
            onPress: (e) => {
                if (e.event.touches && e.event.touches.length > 0) {
                    handleTouchStart(e.event);
                }
            },
            onDrag: (e) => {
                if (e.event.touches && e.event.touches.length > 0) {
                    handleTouchMove(e.event);
                }
            }
        });

        // 尝试启用陀螺仪，Android 可直接使用，iOS 需要权限。
        requestGyroscopePermission();

        return () => {
            scrollObserver.kill();
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('deviceorientation', handleDeviceOrientation);
        };
    }, [handleWheel, handleMouseMove, handleKeyDown, handleTouchStart, handleTouchMove, handleDeviceOrientation, requestGyroscopePermission]);

    // 主相机更新循环。
    useFrame(() => {
        // 相机接管启用时交给外部代码控制。
        if (cameraOverride.current) {
            return;
        }

        // 重新启用后跳过首帧，防止相机跳变。
        // 让相机停留在退出动画结束的位置。
        if (skipFrameAfterEnable.current) {
            skipFrameAfterEnable.current = false;
            return;
        }

        const scrollActive = scrollEnabledRef.current;
        const parallaxActive = parallaxEnabledRef.current;

        // 所有控制均未启用时不处理。
        if (!scrollActive && !parallaxActive) {
            return;
        }

        // 视差启用时持续平滑更新。
        if (parallaxActive) {
            const parallaxSmoothing = justEnabled.current ? 0.02 : smoothing * 0.8;
            parallax.current.x = THREE.MathUtils.lerp(parallax.current.x, targetParallax.current.x, parallaxSmoothing);
            parallax.current.y = THREE.MathUtils.lerp(parallax.current.y, targetParallax.current.y, parallaxSmoothing);

            // 平滑移动端水平滑动侧看。
            swipeGlance.current = THREE.MathUtils.lerp(swipeGlance.current, targetSwipeGlance.current, 0.08);
        }

        // 稍后恢复正常平滑。
        if (justEnabled.current && Math.abs(parallax.current.x - targetParallax.current.x) < 0.01) {
            justEnabled.current = false;
        }

        // Z 移动与门侧看仅在滚动启用时执行。
        if (scrollActive) {
            // 平滑 Z 移动。
            currentZ.current = THREE.MathUtils.lerp(currentZ.current, targetZ.current, smoothing);

            // 自动侧看距离检测。
            targetGlance.current = calculateGlance(currentZ.current, currentSegment.current);

            // 动态平滑：看向门较慢（0.03），移开较快（0.08）。
            // 避免经过门后相机仍拖曳回看。
            const isReleasing = Math.abs(targetGlance.current) < Math.abs(glanceOffset.current);
            const lerpSpeed = isReleasing ? 0.08 : 0.03;

            glanceOffset.current = THREE.MathUtils.lerp(glanceOffset.current, targetGlance.current, lerpSpeed);

            // 仅在滚动启用时应用相机 Z 位置。
            camera.position.z = currentZ.current;
            camera.position.x = parallax.current.x;
            camera.position.y = 0.2 + parallax.current.y;

            // 观察方向叠加自动侧看与滑动侧看。
            const lookX = parallax.current.x * 0.3 + glanceOffset.current * 3 + swipeGlance.current * 4;

            // 混合阶段：从保存的旋转平滑过渡至 lookAt。
            if (blendInFrames.current > 0) {
                // 计算 lookAt 将设置的目标旋转。
                camera.lookAt(lookX, 0.13 + parallax.current.y, currentZ.current - 10);
                const targetRotation = {
                    x: camera.rotation.x,
                    y: camera.rotation.y,
                    z: camera.rotation.z
                };

                // 计算混合系数，0 为保存状态，1 为目标。
                const blendFactor = 1 - (blendInFrames.current / 30);

                // 从保存旋转线性插值至目标。
                camera.rotation.x = THREE.MathUtils.lerp(savedRotation.current.x, targetRotation.x, blendFactor);
                camera.rotation.y = THREE.MathUtils.lerp(savedRotation.current.y, targetRotation.y, blendFactor);
                camera.rotation.z = THREE.MathUtils.lerp(savedRotation.current.z, targetRotation.z, blendFactor);

                blendInFrames.current--;
            } else {
                // 正常模式直接应用 lookAt。
                camera.lookAt(lookX, 0.13 + parallax.current.y, currentZ.current - 10);
            }

            // 更新分段跟踪。
            const segment = Math.floor((10 - currentZ.current) / segmentLength);
            if (segment !== currentSegment.current) {
                currentSegment.current = segment;
            }
        } else if (parallaxActive) {
            // GSAP 动画期间的纯视差模式。
            // 将视差作为当前位置的偏移，并调整 lookAt。
            // 不覆盖 camera.position.z，该值由 GSAP 控制。
            camera.position.x = parallax.current.x;
            camera.position.y = 0.2 + parallax.current.y;

            // 带视差偏移的观察方向。
            const lookX = parallax.current.x * 0.3 + swipeGlance.current * 4;
            camera.lookAt(lookX, 0.13 + parallax.current.y, camera.position.z - 10);
        }
    });

    // 按 Z 位置计算侧看的辅助函数。
    const calculateGlance = useCallback((z, segment) => {
        const zOffset = 10 - (segment * segmentLength);
        let bestStrength = 0;
        let bestDir = 0;

        const START_DIST = 15;
        const PEAK_DIST = 8;
        const END_DIST = -2;

        for (const door of DOOR_POSITIONS) {
            const doorGlobalZ = zOffset + door.z;
            const dist = z - doorGlobalZ;

            let strength = 0;
            if (dist > PEAK_DIST && dist < START_DIST) {
                strength = (START_DIST - dist) / (START_DIST - PEAK_DIST);
            } else if (dist <= PEAK_DIST && dist > END_DIST) {
                strength = (dist - END_DIST) / (PEAK_DIST - END_DIST);
            }

            if (strength > 0) {
                const easedStrength = strength * (2 - strength);
                const dir = door.side === 'left' ? -1 : 1;
                if (easedStrength > bestStrength) {
                    bestStrength = easedStrength;
                    bestDir = dir;
                }
            }
        }

        return bestDir * bestStrength * glanceIntensity * 3.5;
    }, [segmentLength, glanceIntensity]);

    // 启用或禁用相机接管的函数。
    const setCameraOverride = useCallback((active) => {
        cameraOverride.current = active;
        if (!active) {
            // 释放接管时将内部状态同步至当前相机位置。
            const z = camera.position.z;
            targetZ.current = z;
            currentZ.current = z;

            // 立即重新计算当前分段。
            const initSegment = Math.floor((10 - z) / segmentLength);
            currentSegment.current = initSegment;

            // 同步视差。
            parallax.current = { x: camera.position.x, y: camera.position.y - 0.2 };
            targetParallax.current = { x: camera.position.x, y: camera.position.y - 0.2 };

            // 计算当前位置的理想侧看值。
            const initialGlance = calculateGlance(z, initSegment);

            // 平滑恢复逻辑：
            // 检查实际旋转是否符合理想侧看。
            // 传送后退出房间时，可能正朝前看，旋转为 0，
            // 但理想侧看需要转向门，值不为 0。
            // 状态差异会导致跳变。
            // 修正：有差异时按实际姿态初始化 glanceOffset。

            // 1. 由当前实际旋转推导等效侧看值。
            // rotation.y≈视差 + 侧看×3 + 滑动×4。
            // 假定视差已在上方同步，滑动为 0。
            // 因此 currentRotationY≈parallax.x×0.3 + glance×3。
            // glance≈(currentRotationY - parallax.x×0.3)/3。

            // 注意：使用相机的实际旋转。
            // lookAt 逻辑并非单纯的旋转相加，
            // 但小角度下此近似足以避免跳变。
            const currentRotationY = camera.rotation.y;
            const parallaxContribution = parallax.current.x * 0.3;
            const derivedGlance = (currentRotationY - parallaxContribution) / 3;

            // 2. 检查差异。
            const diff = Math.abs(derivedGlance - initialGlance);

            // 3. 差异明显时，如超过 0.05 弧度约 3°，使用推导值。
            // 这通常发生于退出时正朝前，但理想值应看向门的情况。
            if (diff > 0.02) {
                // 按当前实际姿态初始化，从当前位置开始。
                glanceOffset.current = derivedGlance;
                // 目标仍为理想状态，后续平滑靠近。
                targetGlance.current = initialGlance;
            } else {
                // 已足够接近时直接对齐理想值，保证精度。
                glanceOffset.current = initialGlance;
                targetGlance.current = initialGlance;
            }

            // 跳过首帧，防止相机跳变。
            // 避免 useFrame 立即覆盖退出动画的位置。
            skipFrameAfterEnable.current = true;

            // 重置滑动侧看。
            swipeGlance.current = 0;
            targetSwipeGlance.current = 0;
        }
    }, [camera, calculateGlance, segmentLength]);

    return {
        getCurrentSegment: () => currentSegment.current,
        getCameraZ: () => currentZ.current,
        setCameraOverride, // 允许外部代码接管相机。
        requestGyroscopePermission // 暴露给界面按钮，iOS 需要用户交互。
    };
};

export default useInfiniteCamera;

