import { MediaTextureLoader } from '../../../../media/MediaTextureLoader';
import { media } from '../../../../media';
import { useScene, useAchievements, useAudio } from '../../../../context/contexts';
import { useRef, useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { PLATFORM_CONFIG } from './contentData';



import FloatingCodeParticles from './FloatingCodeParticles';
import { PositionalAudio } from '@react-three/drei';

import { useStudioContent } from '../../../../hooks/useContentData';
import { studioWishCard } from '../../../../data/content';
import '../../shaders/RevealMaterial';
import { isTouchDevice } from '../../../../utils/deviceDetect';
import { usePaintMaterial } from '../Gallery/usePaintMaterial';

// ============================================
// ⚙️ 上色配置：调整起止位置。
// 修改这些值可调整入场动画的方向与范围。
// ============================================
const STUDIO_PAINT_CONFIG = {
    dirX: 0.0,
    dirY: -1.0,    // 方向：从上方 -1 向下。
    dirZ: 0.0,
    startDist: -10.0, // 波前起点。
    endDist: 10.0,   // 波前终点。
    noiseAxes: 'xz'  // 噪声平面。
};

// ============================================
// ⚙️ 音频设置：在此调整。
// 修改这些值可调整显示器环境声的音量和可听范围。
// ============================================
const AUDIO_SETTINGS = {
    volume: 1,
    distance: 2,
    rolloff: 1.0
};

// ============================================
// 按需调整的配置。
// ============================================
const CAMERA_Y_OFFSET = -6; // 负值使相机降低，正值使相机升高。
const CAMERA_ZOOM_DISTANCE = 3; // 放大时相机距显示器正面的距离。
const CAMERA_PAN_RIGHT = 1; // 放大后相机向右移的距离，为内容面板留出空间。
const TOWER_RADIUS = 2.2; // 所有显示器与中心的距离相同，数值越小塔越窄。
const MONITORS_PER_RING = 4; // 每层显示器数量。
const FALL_SPEED = 0.3; // 显示器下落速度。
const TOWER_HEIGHT = 12; // 塔的总可见高度。
const VERTICAL_SPACING = 2.5; // 显示器环之间的间距。
const TOWER_Y_START = -5; // 塔的初始 Y 偏移，负值更低，用于控制上下位置。
const TOWER_Z_START = -10; // 初始 Z 位置，负值更远，用于控制距离。

function shuffleContent(content, seed) {
    const result = [...content];
    for (let i = result.length - 1; i > 0; i--) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const j = Math.floor((seed / 4294967296) * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

const StudioRoom = ({ showRoom, onReady, isExiting, isWarmup }) => {
    const groupRef = useRef();
    const towerRef = useRef();
    const { camera, size } = useThree();

    // 根据像素宽度调整相机响应式参数。
    const responsiveParams = useMemo(() => {
        const isMobile = size.width < 768; // 标准移动端断点。
        const isTablet = size.width < 1024 && size.width >= 768;


        return {
            zoomDistance: isMobile ? 2 : isTablet ? 3 : CAMERA_ZOOM_DISTANCE,
            panRight: isMobile ? 0 : isTablet ? 0.5 : Math.max(0.3, (size.width / 1920) * CAMERA_PAN_RIGHT),
            panDown: isMobile ? 9.7 : 0, // 正值表示相机下移，显示器位于画面顶部。
            yOffset: isMobile ? 2.5 : isTablet ? -3 : CAMERA_Y_OFFSET,
            towerRadius: isMobile ? 1.5 : (isTablet ? 1.8 : TOWER_RADIUS),
            isMobile, // 透传布尔值。
        };
    }, [size.width]);

    // 保存相机原位置，供重置使用。
    const originalCameraY = useRef(null);
    const originalCameraZ = useRef(null);
    const originalCameraX = useRef(null);

    // 状态。
    const isDraggingRef = useRef(false);
    const lastXRef = useRef(0);
    const dragDistance = useRef(0); // 改用 ref，防止拖动时每秒重渲染上百次。

    // 物理参数。
    const rotationVelocity = useRef(0);
    const autoRotationSpeed = useRef(0.12); // 改用 ref，以支持改变方向。
    const DRAG_SENSITIVITY = 0.008; // 从 0.005 增大。
    const FRICTION = 0.98; // 从 0.95 增大，旋转持续更久。

    // 竖向下落物理。
    const fallSpeed = useRef(FALL_SPEED); // 从默认值开始。
    const BASE_FALL_SPEED = FALL_SPEED;
    const SCROLL_SENSITIVITY = 0.006; // 从 0.002 增至三倍。
    const SWIPE_SENSITIVITY = 0.005; // 已调整。
    const SPEED_DECAY = 0.985; // 更慢地恢复正常速度，原值为 0.96。

    // 内容状态。
    const [selectedMonitor, setSelectedMonitor] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // 遮罩使用的全局场景上下文。
    const { openOverlay, overlayContent, isTeleporting } = useScene();

    // 成就上下文。
    const { showTutorial, unlockAchievement, hidePopup } = useAchievements();
    const { globalVolume, isMuted } = useAudio();
    const effectiveVolume = isMuted ? 0 : AUDIO_SETTINGS.volume * globalVolume;

    const studioNotes = useStudioContent();
    const activeContent = useMemo(() => [...studioNotes, studioWishCard], [studioNotes]);

    const audioRef = useRef();
    useEffect(() => {
        if (audioRef.current && audioRef.current.setVolume) {
            audioRef.current.setVolume(effectiveVolume);
        }
    }, [effectiveVolume]);

    useEffect(() => {
        if (isExiting || isTeleporting) {
            hidePopup();
        }
    }, [isExiting, isTeleporting, hidePopup]);

    // 自上而下的上色过渡。
    const { onBeforeCompile: paintOnBeforeCompile, animatePaint, resetPaint, setPaintProgress, uniformsData: paintUniforms, updateRoomOrigin } = usePaintMaterial(STUDIO_PAINT_CONFIG);


    const wasTeleportedRef = useRef(false);
    useEffect(() => {
        if (isTeleporting) wasTeleportedRef.current = true;
    }, [isTeleporting]);

    useEffect(() => {
        if (showRoom && !isWarmup) {
            if (wasTeleportedRef.current || isTeleporting) {
                setPaintProgress(1);
            } else {
                resetPaint();
                const animation = animatePaint(0.2, 2.5);
                return () => animation.kill();
            }
        } else {
            setPaintProgress(1);
        }
    }, [showRoom, isWarmup, isTeleporting, animatePaint, resetPaint, setPaintProgress]);

    const latestContent = useMemo(() => {
        if (!activeContent || activeContent.length === 0) return null;
        return activeContent.filter(item => item.date).sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
    }, [activeContent]);

    // 下落动画的显示器 Y 偏移，可变。
    const monitorOffsets = useRef([]);
    // 通过显示器网格引用直接更新位置，避免 28 个 useFrame。
    const monitorRefs = useRef([]);

    // 使用 ref 跟踪塔状态，驱动背景粒子视差。
    const particleTowerRotation = useRef(0);
    const particleFallOffset = useRef(0);

    // 跟踪是否已发出就绪信号。
    const hasSignaledReady = useRef(false);
    const frameCount = useRef(0);
    const FRAMES_TO_WAIT = 5; // 等待五个实际渲染帧。

    // 按实际渲染帧数判断就绪。
    useFrame(() => {
        // 为上色着色器更新房间原点。
        updateRoomOrigin(groupRef);

        if (hasSignaledReady.current) return;

        frameCount.current++;

        // 渲染 N 帧后，可确认 GPU 已绘制内容。
        if (frameCount.current >= FRAMES_TO_WAIT) {
            hasSignaledReady.current = true;
            onReady?.();
            if (!isWarmup) setTimeout(() => showTutorial('studio_interact'), 2000);
        }
    });

    // 构建圆柱塔：统一半径，打乱内容，高度错落。
    const monitorData = useMemo(() => {
        const items = [];

        // 使用固定种子打乱内容，保持顺序稳定。
        let seed = 42;
        let shuffledContent = shuffleContent(activeContent, seed++);
        
        // 塔至少高 12 环，即 48 个项目，
        // 让循环传送边界远离相机视野。
        if (shuffledContent.length > 0) {
            while (shuffledContent.length < 48) {
                shuffledContent = [...shuffledContent, ...shuffleContent(activeContent, seed++)];
            }
        }

        // 计算所需环数。
        const totalMonitors = shuffledContent.length;
        const ringsNeeded = Math.ceil(totalMonitors / MONITORS_PER_RING);

        let contentIndex = 0;
        const currentRadius = responsiveParams.towerRadius;

        for (let ring = 0; ring < ringsNeeded && contentIndex < shuffledContent.length; ring++) {
            const angleStep = (Math.PI * 2) / MONITORS_PER_RING;
            const angleOffset = ring % 2 === 0 ? 0 : angleStep / 2; // 隔环设置偏移。

            for (let i = 0; i < MONITORS_PER_RING && contentIndex < shuffledContent.length; i++) {
                const contentItem = shuffledContent[contentIndex];
                const platform = PLATFORM_CONFIG[contentItem.platform] || {
                    shape: contentItem.device || 'monitor',
                    color: '#ffffff',
                    accentColor: '#cccccc',
                    icon: '🌐',
                    label: contentItem.platform || 'Web',
                };
                const angle = i * angleStep + angleOffset;

                const x = Math.cos(angle) * currentRadius;
                const z = Math.sin(angle) * currentRadius;

                // Y 高度为基础值加随机偏移，营造自然感。
                const baseY = ring * VERTICAL_SPACING;
                const yJitter = (Math.sin(contentIndex * 1.7) + Math.cos(contentIndex * 2.3)) * 0.4; // 伪随机。
                const finalY = baseY + yJitter;

                let width, height, depth;
                const deviceShape = contentItem.device || platform.shape || 'monitor';
                switch (deviceShape) {
                    case 'tv':
                        width = 1.6; height = 1.187; depth = 1.0; // 原始比例 1.348。
                        break;
                    case 'monitor':
                        width = 1.6; height = 1; depth = 0.15; // 原始比例 1.835。
                        break;
                    case 'phone':
                        width = 0.6; height = 1.139; depth = 0.1; // 原始比例 0.527。
                        break;
                    default:
                        width = 1.4; height = 1.0; depth = 0.6;
                }

                items.push({
                    ...contentItem,
                    index: contentIndex,
                    x,
                    baseY: finalY, // 错落的 Y 位置。
                    z,
                    width, height, depth,
                    angle: angle,
                    rot: -angle + Math.PI / 2,
                    platformConfig: platform,
                    isLatest: latestContent ? contentItem.id === latestContent.id : false,
                });

                contentIndex++;
            }
        }


        // 预先计算 totalHeight，实现无缝循环，避免在 useFrame 中重复计算。
        const minBaseY = items.length > 0 ? Math.min(...items.map(m => m.baseY)) : 0;
        const maxBaseY = items.length > 0 ? Math.max(...items.map(m => m.baseY)) : 0;
        // 保证最小高度，避免仅一行显示器时立即循环传送。
        const totalHeight = Math.max(VERTICAL_SPACING * 3, maxBaseY - minBaseY + VERTICAL_SPACING);

        return { items, totalHeight };
    }, [latestContent, responsiveParams.towerRadius, activeContent]);

    // 解构以便访问。
    const monitors = monitorData.items;
    const totalHeight = monitorData.totalHeight;
    useEffect(() => { monitorOffsets.current = monitors.map(() => 0); }, [monitors]);

    // lastY 也需要 ref。
    const lastYRef = useRef(0);

    // 交互。
    const handlePointerDown = (e) => {
        if (isAnimating) return;
        // e.preventDefault(); // 可阻止页面滚动，便于自定义拖动。
        e.stopPropagation(); // 停止事件冒泡。

        isDraggingRef.current = true;
        lastXRef.current = e.clientX;
        lastYRef.current = e.clientY; // 保存初始 Y。
        dragDistance.current = 0;
        rotationVelocity.current = 0;

        // 立即禁用自动旋转。
        document.body.style.cursor = 'grabbing';
    };

    const handlePointerUp = useCallback(() => {
        isDraggingRef.current = false;
        document.body.style.cursor = 'auto';
    }, []);

    const handlePointerMove = useCallback((e) => {
        if (!isDraggingRef.current || !towerRef.current || isAnimating) return;

        const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
        const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);

        if (!clientX || !clientY) return;

        const deltaX = clientX - lastXRef.current;
        const deltaY = clientY - lastYRef.current;

        lastXRef.current = clientX;
        lastYRef.current = clientY;

        dragDistance.current += Math.abs(deltaX) + Math.abs(deltaY);

        // 水平移动转换为旋转。
        if (Math.abs(deltaX) > 1) {
            autoRotationSpeed.current = Math.sign(deltaX) * 0.12;
        }
        rotationVelocity.current = deltaX * DRAG_SENSITIVITY;
        towerRef.current.rotation.y += rotationVelocity.current;

        // 竖向移动转换为下落速度。
        fallSpeed.current += deltaY * SWIPE_SENSITIVITY;

        unlockAchievement('studio_interact');
    }, [isAnimating, unlockAchievement]);

    // 桌面端滚轮监听。
    useEffect(() => {
        const handleWheel = (e) => {
            // e.deltaY > 0 表示向下滚动。
            // 向下滚动使显示器下移，速度为正。
            // 向上滚动使显示器上移，速度为负。
            fallSpeed.current += e.deltaY * SCROLL_SENSITIVITY;
            unlockAchievement('studio_interact');
        };

        window.addEventListener('wheel', handleWheel);
        return () => window.removeEventListener('wheel', handleWheel);
    }, [unlockAchievement]);

    // 全局事件监听，保证拖动连续。
    useEffect(() => {
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointermove', handlePointerMove);
        // 额外监听移动端触摸事件，处理指针事件不可用的情况。
        window.addEventListener('touchend', handlePointerUp);
        window.addEventListener('touchmove', handlePointerMove); // 原生 touchmove。

        return () => {
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
        };
    }, [handlePointerUp, handlePointerMove]);

    // 步骤 1：旋转塔，使点击的显示器居中。
    const handleMonitorClick = useCallback((item) => {
        // 刚发生拖动时不触发点击。
        if (dragDistance.current > 5 || isAnimating || !towerRef.current) return;

        setIsAnimating(true);
        setSelectedMonitor(item);
        rotationVelocity.current = 0;

        unlockAchievement('studio_interact');

        // 显示器朝向旋转：item.rot=-angle+PI/2。
        // 屏幕朝局部 +Z，再旋转 item.rot。
        // 塔旋转 towerRotation。
        // 世界朝向 = item.rot + towerRotation。
        // 目标世界朝向为 0，即朝向 +Z 处的相机。
        // 因此 towerRotation=-item.rot。

        const monitorFacingRotation = item.rot;
        let targetRotation = -monitorFacingRotation;

        // 归一化当前旋转。
        let currentRotation = towerRef.current.rotation.y % (Math.PI * 2);
        if (currentRotation < 0) currentRotation += Math.PI * 2;

        // 归一化目标旋转。
        while (targetRotation < 0) targetRotation += Math.PI * 2;
        targetRotation = targetRotation % (Math.PI * 2);

        // 寻找当前到目标的最短路径。
        let delta = targetRotation - currentRotation;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;

        // 最终目标 = 当前值 + 最短角度差。
        const finalRotation = towerRef.current.rotation.y + delta;


        // 步骤 1：塔旋转动画。
        gsap.to(towerRef.current.rotation, {
            y: finalRotation,
            duration: 0.8,
            ease: 'power2.inOut',
            onComplete: () => {
                // 步骤 2：旋转完成后调整相机 Y，使显示器居中。
                // 尚未保存时记录原始相机 Y。
                if (originalCameraY.current === null) {
                    originalCameraY.current = camera.position.y;
                }

                // 显示器世界 Y 位置。
                // 组位于 y=-1.2，塔相对于组为 y=0。
                // 显示器当前 Y = baseY + offset。
                const monitorCurrentY = item.baseY + (monitorOffsets.current[item.index] || 0);
                const monitorWorldY = -1.2 + monitorCurrentY + responsiveParams.yOffset;

                // 步骤 3：沿相机朝向向前移动。
                // 尚未保存时记录原始相机位置。
                if (originalCameraZ.current === null) {
                    originalCameraZ.current = camera.position.z;
                    originalCameraX.current = camera.position.x;
                }

                // 获取相机前向向量。
                const forward = new THREE.Vector3();
                camera.getWorldDirection(forward);

                // 前向与上方向叉乘，得到相机右向向量。
                const up = new THREE.Vector3(0, 1, 0);
                const right = new THREE.Vector3();
                right.crossVectors(forward, up).normalize();

                // 步骤 3、4：使用响应式参数向前、向右及向下移动相机。
                const zoomDist = responsiveParams.zoomDistance;
                const panRight = responsiveParams.panRight;
                const panDown = responsiveParams.panDown;

                const targetX = camera.position.x + forward.x * zoomDist + right.x * panRight;
                const targetZ = camera.position.z + forward.z * zoomDist + right.z * panRight;
                const targetY = monitorWorldY - panDown; // 向下平移相机，使显示器位于画面顶部。


                gsap.to(camera.position, {
                    x: targetX,
                    y: targetY,
                    z: targetZ,
                    duration: 0.5,
                    ease: 'power2.inOut',
                    onComplete: () => {
                        setIsAnimating(false);
                        openOverlay(item); // 在界面层打开全局遮罩。
                    }
                });
            }
        });

    }, [isAnimating, camera, responsiveParams, openOverlay, unlockAchievement]);

    // 仅在遮罩被明确关闭时触发相机返回。
    // 用 ref 记录遮罩此前是否打开，避免初始化竞态。
    const prevOverlayContent = useRef(null);

    const handleReturnCamera = useCallback(() => {
        setIsAnimating(true);

        // 返回速度略快。
        if (originalCameraX.current !== null && originalCameraY.current !== null && originalCameraZ.current !== null) {
            gsap.to(camera.position, {
                x: originalCameraX.current,
                y: originalCameraY.current,
                z: originalCameraZ.current,
                duration: 0.8,
                ease: 'power2.inOut',
                onComplete: () => {
                    setIsAnimating(false);
                    setSelectedMonitor(null); // 恢复自动旋转。
                }
            });
        } else {
            setIsAnimating(false);
            setSelectedMonitor(null);
        }
    }, [camera]);

    useEffect(() => {
        // 此前打开、现在为 null，且正在查看显示器时，返回相机。
        const closed = prevOverlayContent.current && !overlayContent;
        prevOverlayContent.current = overlayContent;
        if (closed && selectedMonitor && !isAnimating) {
            const frame = requestAnimationFrame(handleReturnCamera);
            return () => cancelAnimationFrame(frame);
        }
    }, [overlayContent, selectedMonitor, isAnimating, handleReturnCamera]);

    // 清理旧监听效果，现由上方全局效果管理。

    useFrame((state, delta) => {
        if (!towerRef.current) return;

        // 闲置时自动旋转并应用物理效果。
        if (!isDraggingRef.current && !isAnimating && !selectedMonitor) {
            towerRef.current.rotation.y += autoRotationSpeed.current * delta + rotationVelocity.current;
            rotationVelocity.current *= FRICTION;

            // 下落速度逐渐回到基础速度，保持当前方向。
            // 向下时回归正基础速度，向上时回归负基础速度。
            const targetDrift = fallSpeed.current > 0 ? BASE_FALL_SPEED : -BASE_FALL_SPEED;
            fallSpeed.current = THREE.MathUtils.lerp(fallSpeed.current, targetDrift, 1.0 - SPEED_DECAY);

            // totalHeight 已在 useMemo 中预先计算。
            // 单次循环更新全部显示器偏移与位置，无需子级 useFrame。
            monitors.forEach((monitor, index) => {
                // 更新偏移。
                monitorOffsets.current[index] -= fallSpeed.current * delta;

                // 计算当前 Y。
                const currentY = monitor.baseY + monitorOffsets.current[index];

                // 低于 -10.0 阈值时移至顶部，实现无缝循环。
                // 向上移动、速度为负时，检查 totalHeight - 10.0 的顶部阈值。
                if (currentY < -10.0 && fallSpeed.current > 0) {
                    // 向下落出时重置到顶部。
                    monitorOffsets.current[index] += totalHeight;
                } else if (currentY > totalHeight - 10.0 && fallSpeed.current < 0) {
                    // 向上移出时重置到底部。
                    monitorOffsets.current[index] -= totalHeight;
                }

                // 直接更新对象，绕过 React 协调以提升性能。
                const ref = monitorRefs.current[index];
                if (ref) {
                    ref.position.y = monitor.baseY + monitorOffsets.current[index];
                }
            });

            // 直接更新粒子 ref，不调用 setState，避免重渲染。
            particleTowerRotation.current = towerRef.current.rotation.y;
            particleFallOffset.current = fallSpeed.current; // 传入速度，而非偏移。
        }
    });

    return (
        <group ref={groupRef} position={[0, -1.2, 0]}>
            {!isWarmup && (
                <PositionalAudio
                    ref={audioRef}
                    url={media.audio.monitors}
                    distanceModel="exponential"
                    refDistance={AUDIO_SETTINGS.distance}
                    rolloffFactor={AUDIO_SETTINGS.rolloff}
                    loop
                    autoplay
                    volume={effectiveVolume}
                />
            )}

            {/* 无限显示器塔。 */}
            <group
                ref={towerRef}
                position={[0, TOWER_Y_START, TOWER_Z_START]}
                onPointerDown={handlePointerDown}
            >
                {/* 不可见交互圆柱，便于拖动。 */}
                <mesh visible={false}>
                    <cylinderGeometry args={[responsiveParams.towerRadius + 0.5, responsiveParams.towerRadius + 0.5, TOWER_HEIGHT * 1.5, 16]} />
                    <meshBasicMaterial color="#e0e0e0" />
                </mesh>

                {monitors.map((item, index) => (
                    <MonitorBlock
                        key={`${item.id}-${index}`}
                        item={item}
                        index={index}
                        meshRef={(el) => { monitorRefs.current[index] = el; }}
                        isSelected={selectedMonitor?.id === item.id}
                        onMonitorClick={handleMonitorClick}
                        disabled={isAnimating}
                        paintOnBeforeCompile={paintOnBeforeCompile}
                        paintUniforms={paintUniforms}
                    />
                ))}
            </group>

            {/* 漂浮代码符号的视差背景。 */}
            <FloatingCodeParticles
                towerRotationRef={particleTowerRotation}
                fallOffsetRef={particleFallOffset}
            />
        </group>
    );
};

// ===========================================
// 显示器块组件，支持悬停上色显现。
// 双盒结构：彩色盒位于后方，带 revealMaterial 的速写盒位于前方。
// ===========================================
const MonitorBlock = memo(({ item, meshRef, isSelected, onMonitorClick, disabled, paintOnBeforeCompile, paintUniforms }) => {
    // 父级 useFrame 通过 meshRef 直接更新 position.y。
    const paintedBoxRef = useRef();
    const hideDelayRef = useRef();
    // 各面的 RevealMaterial 引用，最多六个。
    const matRef0 = useRef(); // +X 右面。
    const matRef1 = useRef(); // -X 左面。
    const matRef2 = useRef(); // +Y 顶面。
    const matRef3 = useRef(); // -Y 底面。
    const matRef4 = useRef(); // +Z 正面。
    const matRef5 = useRef(); // -Z 背面。
    const matRefs = useMemo(() => [matRef0, matRef1, matRef2, matRef3, matRef4, matRef5], []);

    // 优先使用本地内容的 device 字段，缺省时按平台选择设备类型。
    const deviceShape = item.device || (PLATFORM_CONFIG[item.platform]?.shape) || 'monitor';
    const isBlogMonitor = deviceShape === 'monitor';
    const isTvMonitor = deviceShape === 'tv';
    const isPhoneMonitor = deviceShape === 'phone';

    // 确定正面纹理地址，使用自定义值或默认值。
    const frontTextureUrl = item.frontTexture || (
        isBlogMonitor ? 'https://media.secknow-ai.com/space/textures/studio/monitor_front.png' :
            isTvMonitor ? 'https://media.secknow-ai.com/space/textures/studio/tv_front.png' :
                'https://media.secknow-ai.com/space/textures/studio/phone_front.png'
    );

    // 触摸设备使用的动态占位纹理。
    const isTouch = isTouchDevice();
    const dummyTex = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    // 确定彩色正面纹理地址。
    const paintedFrontTextureUrl = isTouch ? dummyTex : (item.paintedFrontTexture || (
        isBlogMonitor ? 'https://media.secknow-ai.com/space/textures/studio/monitor_front_painted.png' :
            isTvMonitor ? 'https://media.secknow-ai.com/space/textures/studio/tv_front_painted.png' :
                'https://media.secknow-ai.com/space/textures/studio/phone_front_painted.png'
    ));

    // 加载动态正面纹理。
    const frontTex = useLoader(MediaTextureLoader, frontTextureUrl);
    const frontPaintedTex = useLoader(MediaTextureLoader, paintedFrontTextureUrl);

    // 加载博客显示器的外壳与彩色纹理。
    const monitorBack = useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/studio/monitor_back.png');
    const monitorTop = useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/studio/monitor_top.png');
    const monitorBottom = useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/studio/monitor_bottom.png');
    const monitorLeft = useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/studio/monitor_left.png');
    const monitorRight = useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/studio/monitor_right.png');
    const monitorBackPainted = useLoader(MediaTextureLoader, isTouch ? dummyTex : 'https://media.secknow-ai.com/space/textures/studio/monitor_back_painted.png');
    const monitorTopPainted = useLoader(MediaTextureLoader, isTouch ? dummyTex : 'https://media.secknow-ai.com/space/textures/studio/monitor_top_painted.png');
    const monitorBottomPainted = useLoader(MediaTextureLoader, isTouch ? dummyTex : 'https://media.secknow-ai.com/space/textures/studio/monitor_bottom_painted.png');
    const monitorLeftPainted = useLoader(MediaTextureLoader, isTouch ? dummyTex : 'https://media.secknow-ai.com/space/textures/studio/monitor_left_painted.png');
    const monitorRightPainted = useLoader(MediaTextureLoader, isTouch ? dummyTex : 'https://media.secknow-ai.com/space/textures/studio/monitor_right_painted.png');

    // 加载 YouTube 电视的外壳与彩色纹理。
    const tvBack = useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/studio/tv_back.png');
    const tvTop = useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/studio/tv_top.png');
    const tvBottom = useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/studio/tv_bottom.png');
    const tvSide = useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/studio/tv_side.png');
    const tvBackPainted = useLoader(MediaTextureLoader, isTouch ? dummyTex : 'https://media.secknow-ai.com/space/textures/studio/tv_back_painted.png');
    const tvTopPainted = useLoader(MediaTextureLoader, isTouch ? dummyTex : 'https://media.secknow-ai.com/space/textures/studio/tv_top_painted.png');
    const tvBottomPainted = useLoader(MediaTextureLoader, isTouch ? dummyTex : 'https://media.secknow-ai.com/space/textures/studio/tv_bottom_painted.png');
    const tvSidePainted = useLoader(MediaTextureLoader, isTouch ? dummyTex : 'https://media.secknow-ai.com/space/textures/studio/tv_side_painted.png');

    // 加载 TikTok 手机的外壳与彩色纹理。
    const phoneBack = useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/studio/phone_back.png');
    const phoneSide = useLoader(MediaTextureLoader, 'https://media.secknow-ai.com/space/textures/studio/phone_side.png');
    const phoneBackPainted = useLoader(MediaTextureLoader, isTouch ? dummyTex : 'https://media.secknow-ai.com/space/textures/studio/phone_back_painted.png');
    const phoneSidePainted = useLoader(MediaTextureLoader, isTouch ? dummyTex : 'https://media.secknow-ai.com/space/textures/studio/phone_side_painted.png');

    // 构建当前设备类型的纹理配置。
    // 每项为 { sketch, painted }；painted 为 null 时，该面没有显现效果。
    const faceConfig = useMemo(() => {
        if (isBlogMonitor) {
            return [
                { sketch: monitorRight, painted: monitorRightPainted },    // +X
                { sketch: monitorLeft, painted: monitorLeftPainted },      // -X
                { sketch: monitorTop, painted: monitorTopPainted },        // +Y
                { sketch: monitorBottom, painted: monitorBottomPainted },  // -Y
                { sketch: frontTex, painted: frontPaintedTex },            // +Z 正面。
                { sketch: monitorBack, painted: monitorBackPainted },      // -Z
            ];
        } else if (isTvMonitor) {
            return [
                { sketch: tvSide, painted: tvSidePainted },       // +X
                { sketch: tvSide, painted: tvSidePainted },       // -X
                { sketch: tvTop, painted: tvTopPainted },          // +Y
                { sketch: tvBottom, painted: tvBottomPainted },    // -Y
                { sketch: frontTex, painted: frontPaintedTex },    // +Z 正面。
                { sketch: tvBack, painted: tvBackPainted },        // -Z
            ];
        } else if (isPhoneMonitor) {
            return [
                { sketch: phoneSide, painted: phoneSidePainted },  // +X
                { sketch: phoneSide, painted: phoneSidePainted },  // -X
                { sketch: phoneSide, painted: phoneSidePainted },  // +Y
                { sketch: phoneSide, painted: phoneSidePainted },  // -Y
                { sketch: frontTex, painted: frontPaintedTex },    // +Z 正面。
                { sketch: phoneBack, painted: phoneBackPainted },  // -Z
            ];
        }
        return null;
    }, [
        isBlogMonitor, isTvMonitor, isPhoneMonitor,
        frontTex, frontPaintedTex,
        monitorBack, monitorTop, monitorBottom, monitorLeft, monitorRight,
        monitorBackPainted, monitorTopPainted, monitorBottomPainted, monitorLeftPainted, monitorRightPainted,
        tvBack, tvTop, tvBottom, tvSide,
        tvBackPainted, tvTopPainted, tvBottomPainted, tvSidePainted,
        phoneBack, phoneSide, phoneBackPainted, phoneSidePainted
    ]);

    // 内部盒子的彩色材质，使用显示彩色纹理的标准材质。
    const paintedMaterials = useMemo(() => {
        if (!faceConfig) return null;
        return faceConfig.map(f => {
            const mat = new THREE.MeshBasicMaterial({
                color: '#e0e0e0',
                map: f.painted || f.sketch // 没有彩色版本时回退至速写。
            });
            // 应用上色过渡着色器。
            if (paintOnBeforeCompile) {
                mat.onBeforeCompile = paintOnBeforeCompile;
                mat.customProgramCacheKey = () => 'paintOnBeforeCompile_studio_painted';
                mat.transparent = true;
                mat.needsUpdate = true;
            }
            return mat;
        });
    }, [faceConfig, paintOnBeforeCompile]);

    // 外部盒子的速写标准材质，用于没有显现效果的面。
    const sketchMaterials = useMemo(() => {
        if (!faceConfig) return null;
        return faceConfig.map(f => {
            if (f.painted) return null; // 此处改用 revealMaterial。
            const mat = new THREE.MeshBasicMaterial({ color: '#e0e0e0', map: f.sketch });
            // 应用上色过渡着色器。
            if (paintOnBeforeCompile) {
                mat.onBeforeCompile = paintOnBeforeCompile;
                mat.customProgramCacheKey = () => 'paintOnBeforeCompile_studio_sketch';
                mat.transparent = true;
                mat.needsUpdate = true;
            }
            return mat;
        });
    }, [faceConfig, paintOnBeforeCompile]);

    useEffect(() => () => {
        paintedMaterials?.forEach(material => material?.dispose());
        sketchMaterials?.forEach(material => material?.dispose());
    }, [paintedMaterials, sketchMaterials]);

    useEffect(() => () => hideDelayRef.current?.kill(), []);

    // 悬停状态管理，避免 React 重渲染。
    const isHoveredRef = useRef(false);

    const updatePaintState = useCallback(() => {
        if (!faceConfig) return;

        const shouldPaint = !isTouch && (isHoveredRef.current || isSelected);
        const targetProgress = shouldPaint ? 1.0 : 0.0;
        const duration = shouldPaint ? 0.8 : 0.5;

        // 为每个 revealMaterial 面执行动画。
        matRefs.forEach((ref) => {
            if (ref.current) {
                gsap.to(ref.current, {
                    uProgress: targetProgress,
                    duration,
                    ease: 'power2.out',
                    overwrite: true
                });
            }
        });

        // 显示或隐藏彩色盒子。
        if (shouldPaint) {
            if (hideDelayRef.current) hideDelayRef.current.kill();
            if (paintedBoxRef.current) paintedBoxRef.current.visible = true;
        } else {
            // 反向动画结束后隐藏彩色盒子。
            // 首次挂载、hideDelay 为空时，延迟 0.05 秒隐藏，留出 1 至 3 帧供编译。
            const delay = hideDelayRef.current === undefined ? 0.05 : (duration + 0.05);
            hideDelayRef.current = gsap.delayedCall(delay, () => {
                if (paintedBoxRef.current) paintedBoxRef.current.visible = false;
            });
        }
    }, [faceConfig, isSelected, isTouch, matRefs]);

    // 响应纯外部状态变化，例如遮罩关闭后 isSelected 变为 false。
    useEffect(() => {
        updatePaintState();
    }, [isSelected, updatePaintState]);

    if (!faceConfig) {
        // 未知平台的回退。
        return (
            <group ref={meshRef} position={[item.x, item.baseY, item.z]} rotation={[0, item.rot, 0]}>
                <mesh frustumCulled={false}>
                    <boxGeometry args={[item.width, item.height, item.depth]} />
                    <meshBasicMaterial color={item.platformConfig.color} />
                </mesh>
            </group>
        );
    }

    return (
        <group
            ref={meshRef}
            position={[item.x, item.baseY, item.z]}
            rotation={[0, item.rot, 0]}
            onPointerOver={(e) => {
                if (disabled) return;
                e.stopPropagation();
                isHoveredRef.current = true;
                updatePaintState();
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                isHoveredRef.current = false;
                updatePaintState();
                document.body.style.cursor = 'auto';
            }}
            onPointerUp={(e) => {
                if (disabled) return;
                e.stopPropagation();
                onMonitorClick(item);
            }}
        >
            {/* 后方彩色盒初始可见，让加载阶段强制编译着色器。 */}
            <mesh ref={paintedBoxRef} visible={true} frustumCulled={false}>
                <boxGeometry args={[item.width, item.height, item.depth]} />
                {paintedMaterials.map((mat, i) => (
                    <primitive key={`p${i}`} attach={`material-${i}`} object={mat} />
                ))}
            </mesh>

            {/* 前方速写盒，悬停时丢弃 revealMaterial 面的像素。 */}
            <mesh frustumCulled={false}>
                <boxGeometry args={[item.width, item.height, item.depth]} />
                {faceConfig.map((face, i) => {
                    if (face.painted) {
                        // 有彩色版本的面使用 revealMaterial，实现笔刷丢弃。
                        return (
                            <revealMaterial color="#e0e0e0"
                                key={`s${i}`}
                                ref={matRefs[i]}
                                attach={`material-${i}`}
                                map={face.sketch}
                                transparent={true}
                                alphaTest={0.1}
                                paintUniforms={paintUniforms}
                                paintConfig={STUDIO_PAINT_CONFIG}
                                uProgress={0.0}
                            />
                        );
                    } else {
                        // 无彩色版本的面使用标准材质，不做显现。
                        return (
                            <primitive key={`s${i}`} attach={`material-${i}`} object={sketchMaterials[i]} />
                        );
                    }
                })}
            </mesh>
        </group>
    );
});

export default StudioRoom;

