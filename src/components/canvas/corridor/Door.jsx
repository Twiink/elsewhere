import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Plane, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { PositionalAudio } from '@react-three/drei';
import '../shaders/RevealMaterial'; // 注册使用透明度丢弃的显现着色器。
import { useAudio } from '../../../../context/AudioManager';
import { isTouchDevice } from '../../../../utils/deviceDetect';

// 入口门音频的全局设置。
const ENTRANCE_DOOR_AUDIO_SETTINGS = {
    hoverVolume: 2.0, // 悬停门时播放的 uchyleniedrzwi 音量。
    openVolume: 2.0,  // 完全开门时播放的 otwarciedrzwi 音量。
    distance: 3,      // 空间音频开始衰减前的参考距离。
    rolloff: 2        // 声音随距离指数衰减的速度。
};

/**
 * Door：带漂浮标签和接近发光效果的门组件。
 */
const Door = ({
    position,
    side = 'left',
    rotationY = null, // 可选的显式旋转覆盖值。
    label,
    icon,
    color = '#f5f0e6',
    onEnter,
    autoCloseDelay = 3000,
    type // 假定 type 为用于选择纹理的新属性。
}) => {
    // 预加载纹理。
    // 必须无条件调用纹理加载 Hook，保证 React Hook 顺序一致。
    const textureMap = useTexture(`https://media.secknow-ai.com/space/textures/corridor/doors/drzwi${type}.png`);
    const isTouch = isTouchDevice();
    const dummyTex = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const paintedColorMap = useTexture(isTouch ? dummyTex : `https://media.secknow-ai.com/space/textures/corridor/doors/drzwi${type}_painted.png`);
    // 门框。
    const frameMap = useTexture(`https://media.secknow-ai.com/space/textures/corridor/doors/ramkasingledoors.png?imageMogr2/thumbnail/512x1024`);

    const doorRef = useRef();
    const frameRef = useRef();
    const glowRef = useRef();
    const isHoveredRef = useRef(false);
    const isOpenRef = useRef(false);
    const isAnimatingRef = useRef(false);
    const isNearRef = useRef(false);
    const { camera } = useThree();
    const closeTimerRef = useRef(null);
    const { globalVolume, isMuted } = useAudio(); // 使用 globalVolume 替代 play。

    // 三维位置音频引用。
    const hoverAudioRef = useRef();
    const openAudioRef = useRef();

    const doorWidth = 1.2;
    const doorHeight = 2.2;
    const frameThickness = 0.1;

    // 检测接近距离以控制发光效果。
    useFrame(() => {
        const distance = Math.abs(camera.position.z - position[2]);
        const near = distance < 8;
        if (near !== isNearRef.current) {
            isNearRef.current = near;
        }
    });

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    const handleClick = useCallback((e) => {
        e.stopPropagation();
        if (isAnimatingRef.current) return;

        if (isOpenRef.current) {
            closeDoor();
            return;
        }

        isAnimatingRef.current = true;

        const doorWorldPos = new THREE.Vector3();
        frameRef.current.getWorldPosition(doorWorldPos);

        const cameraTargetZ = doorWorldPos.z + 2.5;
        const cameraTargetX = side === 'left' ? -0.3 : 0.3;

        gsap.to(camera.position, {
            x: cameraTargetX,
            z: cameraTargetZ,
            duration: 1.0,
            ease: 'power2.inOut',
            onComplete: () => openDoor()
        });
    }, [camera, side, openDoor, closeDoor]);

    const openDoor = useCallback(() => {
        if (!doorRef.current) return;

        isOpenRef.current = true;
        const openAngle = side === 'left' ? Math.PI * 0.6 : -Math.PI * 0.6;

        // console.log("[Door] 开门并播放音效");
        // 在开门动画开始时同步播放声音。
        if (openAudioRef.current) {
            const vol = isMuted ? 0 : ENTRANCE_DOOR_AUDIO_SETTINGS.openVolume * globalVolume;
            openAudioRef.current.setVolume(vol);
            if (openAudioRef.current.isPlaying) openAudioRef.current.stop();
            openAudioRef.current.play();
        }

        gsap.to(doorRef.current.rotation, {
            y: openAngle,
            duration: 0.7,
            ease: 'power2.out',
            onComplete: () => {
                isAnimatingRef.current = false;
                onEnter?.();
                closeTimerRef.current = setTimeout(() => closeDoor(), autoCloseDelay);
            }
        });
    }, [side, onEnter, autoCloseDelay]);

    const closeDoor = useCallback(() => {
        if (!doorRef.current || !isOpenRef.current) return;
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

        isAnimatingRef.current = true;
        gsap.to(doorRef.current.rotation, {
            y: 0,
            duration: 0.6,
            ease: 'power2.in',
            onComplete: () => {
                isOpenRef.current = false;
                isAnimatingRef.current = false;
            }
        });
    }, []);

    useFrame(() => {
        if (doorRef.current && !isOpenRef.current && !isAnimatingRef.current) {
            const targetScale = isHoveredRef.current ? 1.02 : 1;
            doorRef.current.scale.x = THREE.MathUtils.lerp(doorRef.current.scale.x, targetScale, 0.1);
            doorRef.current.scale.y = THREE.MathUtils.lerp(doorRef.current.scale.y, targetScale, 0.1);
        }

        // 按接近距离设置发光强度。
        if (glowRef.current) {
            const targetOpacity = isNearRef.current ? 0.6 : 0.1;
            glowRef.current.material.opacity = THREE.MathUtils.lerp(
                glowRef.current.material.opacity,
                targetOpacity,
                0.08
            );
        }
    });

    const doorRotationY = rotationY !== null ? rotationY : (side === 'left' ? Math.PI / 2 : -Math.PI / 2);

    return (
        <group position={position} rotation={[0, doorRotationY, 0]} ref={frameRef}>
            {/* 始终可见的漂浮标签。 */}
            <group position={[0, doorHeight / 2 + 0.5, 0.3]}>
                {/* 标签边框：后层。 */}
                <mesh position={[0, 0, -0.02]}>
                    <planeGeometry args={[label.length * 0.08 + 0.35, 0.3]} />
                    <meshBasicMaterial color="#1a1a1a" />
                </mesh>

                {/* 标签背景：中层。 */}
                <mesh position={[0, 0, -0.01]}>
                    <planeGeometry args={[label.length * 0.08 + 0.3, 0.25]} />
                    <meshBasicMaterial color="#e0e0e0" />
                </mesh>

                {/* 标签文字：前层。 */}
                <Text
                    position={[0, 0, 0.01]}
                    fontSize={0.12}
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    renderOrder={3}
                    depthOffset={-1}
                >
                    {icon} {label}
                </Text>

                {/* 向下箭头。 */}
                <Text
                    position={[0, -0.2, 0.01]}
                    fontSize={0.15}
                    color="#39FF14"
                    anchorX="center"
                    renderOrder={3}
                    depthOffset={-1}
                >
                    ▼
                </Text>
            </group>

            {/* 轮廓光始终存在，随距离渐隐。 */}
            <mesh position={[0, -0.2, -0.05]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[doorWidth + 0.3, doorHeight + 0.3]} />
                <meshBasicMaterial
                    color="#e0e0e0"
                    transparent={true}
                    opacity={glowIntensity} // 按距离动态调整透明度。
                    depthWrite={false}
                />
            </mesh>

            {/* 空间音频节点，位于门前少许。 */}
            <PositionalAudio
                ref={hoverAudioRef}
                url="/sounds/uchyleniedrzwi.mp3"
                distanceModel="exponential"
                rolloffFactor={ENTRANCE_DOOR_AUDIO_SETTINGS.rolloff}
                refDistance={ENTRANCE_DOOR_AUDIO_SETTINGS.distance}
                loop={false}
            />
            <PositionalAudio
                ref={openAudioRef}
                url="/sounds/otwarciedrzwi.mp3"
                distanceModel="exponential"
                rolloffFactor={ENTRANCE_DOOR_AUDIO_SETTINGS.rolloff}
                refDistance={ENTRANCE_DOOR_AUDIO_SETTINGS.distance}
                loop={false}
            />

            {/* 门框。 */}
            <group>
                <mesh position={[0, doorHeight / 2 + frameThickness / 2, 0]}>
                    <boxGeometry args={[doorWidth + frameThickness * 2, frameThickness, 0.12]} />
                    <meshBasicMaterial color="#2a2a2a" />
                </mesh>
                <mesh position={[-(doorWidth / 2 + frameThickness / 2), 0, 0]}>
                    <boxGeometry args={[frameThickness, doorHeight, 0.12]} />
                    <meshBasicMaterial color="#2a2a2a" />
                </mesh>
                <mesh position={[doorWidth / 2 + frameThickness / 2, 0, 0]}>
                    <boxGeometry args={[frameThickness, doorHeight, 0.12]} />
                    <meshBasicMaterial color="#2a2a2a" />
                </mesh>
            </group>

            {/* 门板。 */}
            <group ref={doorRef} position={[side === 'left' ? -doorWidth / 2 : doorWidth / 2, 0, 0]}>
                <mesh
                    position={[side === 'left' ? doorWidth / 2 : -doorWidth / 2, 0, 0.02]}
                    onClick={handleClick}
                    onPointerEnter={(e) => {
                        e.stopPropagation();
                        if (!isHoveredRef.current && !isOpenRef.current) {
                            // console.log("[Door] 悬停门并播放音效");

                            if (hoverAudioRef.current && !isHoveredRef.current) {
                                const vol = isMuted ? 0 : ENTRANCE_DOOR_AUDIO_SETTINGS.hoverVolume * globalVolume;
                                hoverAudioRef.current.setVolume(vol);
                                
                                // 仅在 AudioContext 已运行时播放，避免控制台警告。
                                if (hoverAudioRef.current.isPlaying) hoverAudioRef.current.stop();
                                if (hoverAudioRef.current.context.state === 'running') {
                                    hoverAudioRef.current.play();
                                }
                            }
                        }
                        isHoveredRef.current = true;
                    }}
                    onPointerLeave={() => {
                        isHoveredRef.current = false;
                        if (hoverAudioRef.current && hoverAudioRef.current.isPlaying) {
                            hoverAudioRef.current.stop();
                        }
                    }}
                >
                    <planeGeometry args={[doorWidth, doorHeight]} />
                    {/* 只使用基础颜色，因为 React 状态不会触发标准材质颜色变化。
                        悬停缩放效果负责提供交互反馈。 */}
                    <meshBasicMaterial color={color} roughness={0.85} />
                </mesh>

                {/* 装饰面板。 */}
                <mesh position={[side === 'left' ? doorWidth / 2 : -doorWidth / 2, 0.4, 0.03]}>
                    <planeGeometry args={[doorWidth * 0.65, doorHeight * 0.3]} />
                    <meshBasicMaterial color="#e8e2d5" roughness={1} />
                </mesh>
                <mesh position={[side === 'left' ? doorWidth / 2 : -doorWidth / 2, -0.35, 0.03]}>
                    <planeGeometry args={[doorWidth * 0.65, doorHeight * 0.3]} />
                    <meshBasicMaterial color="#e8e2d5" roughness={1} />
                </mesh>

                {/* 把手。 */}
                <mesh position={[side === 'left' ? doorWidth * 0.85 : -doorWidth * 0.85, 0, 0.06]}>
                    <sphereGeometry args={[0.055, 12, 12]} />
                    <meshBasicMaterial color="#222" metalness={0.7} roughness={0.25} />
                </mesh>
            </group>
        </group>
    );
};

export default Door;
